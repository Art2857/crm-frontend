/**
 * IndexedDB утилиты для кеширования данных о курсах валют
 */

export interface CachedExchangeRate {
  id?: number;
  currencyCode: string;
  rate: number;
  nominal: number;
  date: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface CacheMetadata {
  id?: number;
  key: string;
  value: string;
  updatedAt: string;
}

class IndexedDBManager {
  private dbName = 'ExchangeRatesCache';
  private dbVersion = 2; // Увеличена версия для обновления схемы
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;


        // Удаляем старую схему если есть
        if (db.objectStoreNames.contains('rates')) {
          db.deleteObjectStore('rates');
        }

        // Store для курсов валют с новой схемой
        const ratesStore = db.createObjectStore('rates', { 
          keyPath: ['currencyCode', 'date'] // Composite key для upsert
        });
        ratesStore.createIndex('currencyCode', 'currencyCode', { unique: false });
        ratesStore.createIndex('date', 'date', { unique: false });
        
        // Store для метаданных
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          metadataStore.createIndex('key', 'key', { unique: true });
        }
        

      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  // Сохранение курсов валют
  async saveRates(rates: CachedExchangeRate[]): Promise<void> {
    if (rates.length === 0) return;
    
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readwrite');
    const store = transaction.objectStore('rates');

    // Используем put для upsert операций (создание/обновление)
    for (const rate of rates) {
      const rateWithTimestamps = {
        ...rate,
        updatedAt: new Date().toISOString(),
        // Если createdAt уже есть, оставляем, иначе устанавливаем текущее время
        createdAt: rate.createdAt || new Date().toISOString()
      };
      
      // put автоматически создаёт или обновляет запись
      store.put(rateWithTimestamps);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        
        resolve();
      };
      transaction.onerror = () => {
        
        reject(transaction.error);
      };
    });
  }

  // Получение курса по валюте и дате
  async getRateByDate(currencyCode: string, date: string): Promise<CachedExchangeRate | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readonly');
    const store = transaction.objectStore('rates');

    return new Promise((resolve, reject) => {
      const request = store.get([currencyCode, date]); // Используем composite key
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ПОСЛЕДНИЙ курс - ТОЧНО КАК ПОПРОСИЛ ПОЛЬЗОВАТЕЛЬ!!!
  async getLatestRate(currencyCode: string): Promise<CachedExchangeRate | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['rates'], 'readonly');
      const store = transaction.objectStore('rates');
      
      // БЕРЕМ ТЕКУЩУЮ ДАТУ
      const today = new Date();
      
      // Получаем все доступные курсы для проверки
      const allRates = await new Promise<CachedExchangeRate[]>((resolve, reject) => {
        const allRatesRequest = store.index('currencyCode').getAll(currencyCode);
        allRatesRequest.onsuccess = () => resolve(allRatesRequest.result || []);
        allRatesRequest.onerror = () => reject(allRatesRequest.error);
      });
      
      // ИДЕМ НАЗАД ПО ДНЯМ И ПРОВЕРЯЕМ КАЖДУЮ ДАТУ!
      for (let i = 0; i <= 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        
        // Конвертируем в формат DD.MM.YYYY (как в IndexedDB)
        const day = checkDate.getDate().toString().padStart(2, '0');
        const month = (checkDate.getMonth() + 1).toString().padStart(2, '0');
        const year = checkDate.getFullYear();
        const dateStr = `${day}.${month}.${year}`;
        
        // Логируем только если включен debug режим
        if (i < 10 && process.env.NODE_ENV === 'development') {
          console.log(`🔍 Проверяем дату: ${dateStr}`);
        }
        
        // ПРОВЕРЯЕМ ЕСТЬ ЛИ ЗАПИСЬ НА ЭТУ ДАТУ
        const rate = await new Promise<CachedExchangeRate | null>((resolve, reject) => {
          const request = store.get([currencyCode, dateStr]);
          request.onsuccess = () => {
            const result = request.result;
            if (result && process.env.NODE_ENV === 'development') {
              console.log(`✅ НАШЛИ курс на ${dateStr}: ${result.rate}`);
            }
            resolve(result || null);
          };
          request.onerror = () => reject(request.error);
        });
        
        // ЕСЛИ НАШЛИ - ВОЗВРАЩАЕМ!
        if (rate) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🏆 НАШЛИ последний курс за ${dateStr}: ${rate.rate}`);
          }
          return rate;
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Не нашли ни одного курса за 365 дней!');
      }
      return null;
    } catch (error) {
      console.error('❌ Ошибка:', error);
      return null;
    }
  }

  // Умный поиск курса на дату или ближайшую рабочую дату назад
  async getSmartRateByDate(currencyCode: string, targetDate: string): Promise<CachedExchangeRate | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readonly');
    const store = transaction.objectStore('rates');

    // Сначала пробуем точную дату
    const exactMatch = await new Promise<CachedExchangeRate | null>((resolve, reject) => {
      const request = store.get([currencyCode, targetDate]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (exactMatch) {
      return exactMatch;
    }

    // Если точной даты нет, ищем ближайшую дату назад (до 30 дней)
    const targetDateObj = new Date(targetDate);
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(targetDateObj);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      const previousMatch = await new Promise<CachedExchangeRate | null>((resolve, reject) => {
        const request = store.get([currencyCode, checkDateStr]);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      if (previousMatch) {
        return previousMatch;
      }
    }

    return null;
  }

  // ПОИСК ПО КОНКРЕТНОЙ ДАТЕ (то же самое, но с параметром)
  async getLatestAvailableRate(currencyCode: string, fromDate?: Date): Promise<CachedExchangeRate | null> {
    // Просто вызываем ту же логику
    return this.getLatestRate(currencyCode);
  }

  // Получение курсов за период
  async getRatesInRange(
    currencyCode: string, 
    fromDate: string, 
    toDate: string
  ): Promise<CachedExchangeRate[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readonly');
    const store = transaction.objectStore('rates');
    const index = store.index('currencyCode');

    return new Promise((resolve, reject) => {
      const results: CachedExchangeRate[] = [];
      const request = index.openCursor(IDBKeyRange.only(currencyCode));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const rate = cursor.value;
          if (rate.date >= fromDate && rate.date <= toDate) {
            results.push(rate);
          }
          cursor.continue();
        } else {
          resolve(results.sort((a, b) => a.date.localeCompare(b.date)));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Получение всех курсов для валюты
  async getAllRates(currencyCode: string): Promise<CachedExchangeRate[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readonly');
    const store = transaction.objectStore('rates');
    const index = store.index('currencyCode');

    return new Promise((resolve, reject) => {
      const request = index.getAll(currencyCode);
      request.onsuccess = () => {
        const rates = request.result.sort((a, b) => a.date.localeCompare(b.date));
        resolve(rates);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Сохранение метаданных
  async setMetadata(key: string, value: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    const index = store.index('key');

    return new Promise((resolve, reject) => {
      const getRequest = index.get(key);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const data: CacheMetadata = {
          key,
          value,
          updatedAt: new Date().toISOString()
        };

        if (existing) {
          data.id = existing.id;
          store.put(data);
        } else {
          store.add(data);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Получение метаданных (БЕЗОПАСНО для удаления metadata)
  async getMetadata(key: string): Promise<string | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const index = store.index('key');

      return new Promise((resolve, reject) => {
        const request = index.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
        request.onerror = () => {
          console.warn(`⚠️ Ошибка чтения metadata '${key}': ${request.error}`);
          resolve(null); // Возвращаем null вместо ошибки
        };
      });
    } catch (error) {
      console.warn(`⚠️ Ошибка доступа к metadata '${key}':`, error);
      return null; // Система продолжит работать
    }
  }

  // Очистка старых данных
  async cleanOldRates(beforeDate: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readwrite');
    const store = transaction.objectStore('rates');
    const index = store.index('date');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(beforeDate, true));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ПРОВЕРКА И ВОССТАНОВЛЕНИЕ metadata после удаления
  async ensureMetadataIntegrity(): Promise<void> {
    try {
      console.log('🔍 Проверяем целостность metadata...');
      
      const lastUpdate = await this.getMetadata('lastUpdate');
      const lastSyncDate = await this.getMetadata('lastSyncDate');
      
      // Если metadata пустая, восстанавливаем базовые значения
      if (!lastUpdate || !lastSyncDate) {
        console.log('⚠️ metadata неполная, восстанавливаем...');
        
        // Получаем последнюю дату из реальных данных
        const allRates = await this.getAllRates('USD');
        
        if (allRates.length > 0) {
          // Находим самую позднюю дату в данных
          allRates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          const latestDataTime = allRates[0].updatedAt;
          
          console.log(`🔧 Восстанавливаем metadata на основе данных от ${latestDataTime}`);
          
          if (!lastUpdate) {
            await this.setMetadata('lastUpdate', latestDataTime);
          }
          if (!lastSyncDate) {
            await this.setMetadata('lastSyncDate', latestDataTime);
          }
        } else {
          // Нет данных - устанавливаем заведомо старую дату для принудительного обновления
          console.log('🆆 Нет данных, форсируем обновление');
          const oldDate = '2020-01-01T00:00:00.000Z'; // Старая дата = принудительное обновление
          
          if (!lastUpdate) {
            await this.setMetadata('lastUpdate', oldDate);
          }
          if (!lastSyncDate) {
            await this.setMetadata('lastSyncDate', oldDate);
          }
        }
        
        console.log('✅ metadata восстановлена!');
      } else {
        console.log('✅ metadata в порядке');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка проверки metadata:', error);
      // Не падаем - система продолжит работать
    }
  }

  // Получение размера кеша
  async getCacheSize(): Promise<{ ratesCount: number; metadataCount: number }> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates', 'metadata'], 'readonly');

    const ratesCount = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore('rates').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const metadataCount = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore('metadata').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return { ratesCount, metadataCount };
  }

  // БЕЗОПАСНОЕ удаление metadata (с автовосстановлением)
  async clearMetadataSafely(): Promise<void> {
    try {
      console.log('🗑️ Очищаем metadata...');
      
      const db = await this.ensureDB();
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('✅ metadata очищена');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      
      // Немедленно восстанавливаем
      await this.ensureMetadataIntegrity();
      
    } catch (error) {
      console.error('❌ Ошибка очистки metadata:', error);
      throw error;
    }
  }

  // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ - сбрасываем metadata для форса загрузки
  async forceUpdate(): Promise<void> {
    try {
      console.log('🚀 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ!');
      
      // Ставим старую дату для принудительного обновления
      const oldDate = '2020-01-01T00:00:00.000Z';
      await this.setMetadata('lastUpdate', oldDate);
      await this.setMetadata('lastSyncDate', oldDate);
      
      console.log('✅ metadata сброшена для принудительного обновления');
      
    } catch (error) {
      console.error('❌ Ошибка принудительного обновления:', error);
      throw error;
    }
  }
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();

// Инициализация при импорте
if (typeof window !== 'undefined') {
  indexedDBManager.init().catch(console.error);
  
  // ДОБАВЛЯЕМ ОТЛАДОЧНЫЕ ФУНКЦИИ В КОНСОЛЬ!
  (window as any).__debugExchangeRates = {
    forceUpdate: async () => {
      console.log('🚀 Принудительное обновление...');
      await indexedDBManager.forceUpdate();
      sessionStorage.setItem('exchangeRatesForceUpdated', 'true');
      location.reload(); // Перезагружаем страницу
    },
    clearMetadata: async () => {
      console.log('🗑️ Очистка metadata...');
      await indexedDBManager.clearMetadataSafely();
    },
    getLatestRate: async (currency = 'USD') => {
      const rate = await indexedDBManager.getLatestRate(currency);
      console.log(`💰 Последний курс ${currency}:`, rate);
      return rate;
    },
    
    // ВРЕМЕННАЯ ФУНКЦИЯ ДЛЯ ОТЛАДКИ ПРОБЛЕМЫ С РАБОЧИМИ ДНЯМИ
    forceReloadAndCheck: async () => {
      console.log('🔄 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА С ОТЛАДКОЙ РАБОЧИХ ДНЕЙ');
      
      try {
        // Используем forceUpdate для сброса метаданных
        await indexedDBManager.forceUpdate();
        console.log('🗑️ Метаданные сброшены для принудительной загрузки');
        
        console.log('📡 Принудительно перезагрузи страницу для отладки');
        console.log('📊 В логах будет подробная информация о рабочих днях ЦБ РФ');
        
      } catch (error) {
        console.error('❌ Ошибка при сбросе:', error);
        console.log('🔄 Просто перезагрузи страницу для отладки');
      }
    },
    getCacheInfo: async () => {
      const size = await indexedDBManager.getCacheSize();
      const lastUpdate = await indexedDBManager.getMetadata('lastUpdate');
      const lastSync = await indexedDBManager.getMetadata('lastSyncDate');
      console.log('📈 Инфо о кеше:', { size, lastUpdate, lastSync });
      return { size, lastUpdate, lastSync };
    },
    testWorkingDays: () => {
      console.log('📅 Тест рабочих дней:');
      const days = ['VOSKR', 'PONED', 'VTOR', 'SREDA', 'CHETV', 'PYATN', 'SUBBOT'];
      for (let i = 0; i < 7; i++) {
        const isWorking = (i >= 1 && i <= 5); // пн-пт
        console.log(`${i}: ${days[i]} = ${isWorking ? '✅ РАБОЧИЙ' : '❌ ВЫХОДНОЙ'}`);
      }
    }
  };
  
  console.log('🛫 Отладка: вызови __debugExchangeRates.forceUpdate() для принудительного обновления!');
  
  // АВТОМАТИЧЕСКОЕ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПРИ ПЕРВОМ ЗАПУСКЕ
  setTimeout(async () => {
    try {
      // Проверяем, не было ли уже принудительного обновления в этой сессии
      const hasBeenForceUpdated = sessionStorage.getItem('exchangeRatesForceUpdated');
      if (hasBeenForceUpdated) {
        console.log('✅ Принудительное обновление уже выполнялось в этой сессии');
        return;
      }

      const cacheInfo = await (window as any).__debugExchangeRates.getCacheInfo();
      const latestRate = await indexedDBManager.getLatestRate('USD');
      
      if (!latestRate || latestRate.date < '20.08.2025') {
        console.log('🚀 Автоматическое принудительное обновление - старые данные!');
        await indexedDBManager.forceUpdate();
        
        // Устанавливаем флаг, что обновление было выполнено
        sessionStorage.setItem('exchangeRatesForceUpdated', 'true');
        
        // Перезагружаем только один раз
        location.reload();
      }
    } catch (e) {
      console.warn('⚠️ Ошибка автообновления:', e);
    }
  }, 2000);
}
