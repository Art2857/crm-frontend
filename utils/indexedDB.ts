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

  // Получение последнего курса для валюты
  async getLatestRate(currencyCode: string): Promise<CachedExchangeRate | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['rates'], 'readonly');
    const store = transaction.objectStore('rates');
    const index = store.index('currencyCode');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(currencyCode), 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
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

  // Получение метаданных
  async getMetadata(key: string): Promise<string | null> {
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
      request.onerror = () => reject(request.error);
    });
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
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();

// Инициализация при импорте
if (typeof window !== 'undefined') {
  indexedDBManager.init().catch(console.error);
}
