/**
 * IndexedDB хранилище для котировок валют
 * Реализует интерфейс IExchangeRateStorage
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: только хранение и получение котировок
 * Open/Closed: легко расширяется новыми операциями
 * Liskov Substitution: реализует интерфейс IExchangeRateStorage
 * Interface Segregation: четкий интерфейс без лишних методов
 * Dependency Inversion: зависит от интерфейсов
 */

import { IExchangeRateStorage, IExchangeRate, IExchangeRateCacheStats } from '../services/exchangeRateService';
import { ExchangeRateDate, ExchangeRateDates } from '../utils/exchangeRateDate';

/**
 * Конфигурация базы данных
 */
const DB_CONFIG = {
  name: 'ExchangeRatesDB',
  version: 3,
  stores: {
    rates: 'exchange_rates',
    metadata: 'metadata'
  }
} as const;

/**
 * Ключи метаданных
 */
const METADATA_KEYS = {
  lastUpdate: 'lastUpdate',
  lastSync: 'lastSyncDate',
  version: 'version'
} as const;

/**
 * Тип для ключа котировки
 */
type RateKey = [string, string]; // [currencyCode, date]

/**
 * IndexedDB реализация хранилища котировок
 */
export class IndexedDBExchangeRateStorage implements IExchangeRateStorage {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Инициализация базы данных
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        console.error('❌ Ошибка открытия IndexedDB:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB инициализирован');
        this.ensureMetadataIntegrity();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Создаем хранилище котировок с составным ключом [currencyCode, date]
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.rates)) {
          const ratesStore = db.createObjectStore(DB_CONFIG.stores.rates, {
            keyPath: ['currencyCode', 'date']
          });
          ratesStore.createIndex('currencyCode', 'currencyCode', { unique: false });
          ratesStore.createIndex('date', 'date', { unique: false });
          ratesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Создаем хранилище метаданных
        if (!db.objectStoreNames.contains(DB_CONFIG.stores.metadata)) {
          db.createObjectStore(DB_CONFIG.stores.metadata, {
            keyPath: 'key'
          });
        }

        console.log('✅ IndexedDB схема обновлена');
      };
    });

    return this.initPromise;
  }

  /**
   * Получает котировку валюты на указанную дату
   */
  async getRate(currencyCode: string, date: string): Promise<IExchangeRate | null> {
    await this.ensureInitialized();
    
    const exchangeDate = ExchangeRateDates.fromString(date);
    const key: RateKey = [currencyCode, exchangeDate.value];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.stores.rates);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('❌ Ошибка получения котировки:', request.error);
        reject(new Error(`Failed to get rate: ${request.error}`));
      };
    });
  }

  /**
   * Сохраняет котировку валюты
   */
  async setRate(rate: IExchangeRate): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates, DB_CONFIG.stores.metadata], 'readwrite');
      const ratesStore = transaction.objectStore(DB_CONFIG.stores.rates);
      const metaStore = transaction.objectStore(DB_CONFIG.stores.metadata);

      // Сохраняем котировку
      const rateRequest = ratesStore.put(rate);
      
      // Обновляем метаданные
      const now = new Date().toISOString();
      metaStore.put({ key: METADATA_KEYS.lastUpdate, value: now });
      metaStore.put({ key: METADATA_KEYS.lastSync, value: rate.date });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('❌ Ошибка сохранения котировки:', transaction.error);
        reject(new Error(`Failed to set rate: ${transaction.error}`));
      };
    });
  }

  /**
   * Получает котировки валюты в диапазоне дат
   */
  async getRatesInRange(currencyCode: string, startDate: string, endDate: string): Promise<IExchangeRate[]> {
    await this.ensureInitialized();

    const start = ExchangeRateDates.fromString(startDate);
    const end = ExchangeRateDates.fromString(endDate);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.stores.rates);
      const index = store.index('currencyCode');
      const request = index.getAll(currencyCode);

      request.onsuccess = () => {
        const allRates = request.result as IExchangeRate[];
        const filteredRates = allRates.filter(rate => {
          const rateDate = ExchangeRateDates.fromString(rate.date);
          return !rateDate.isBefore(start) && !rateDate.isAfter(end);
        });
        
        // Сортируем по дате (новые сначала)
        filteredRates.sort((a, b) => {
          const dateA = ExchangeRateDates.fromString(a.date);
          const dateB = ExchangeRateDates.fromString(b.date);
          return dateB.toDate().getTime() - dateA.toDate().getTime();
        });
        
        resolve(filteredRates);
      };

      request.onerror = () => {
        console.error('❌ Ошибка получения котировок в диапазоне:', request.error);
        reject(new Error(`Failed to get rates in range: ${request.error}`));
      };
    });
  }

  /**
   * Получает все котировки валюты
   */
  async getAllRates(currencyCode: string): Promise<IExchangeRate[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.stores.rates);
      const index = store.index('currencyCode');
      const request = index.getAll(currencyCode);

      request.onsuccess = () => {
        const rates = request.result as IExchangeRate[];
        
        // Сортируем по дате (новые сначала)
        rates.sort((a, b) => {
          const dateA = ExchangeRateDates.fromString(a.date);
          const dateB = ExchangeRateDates.fromString(b.date);
          return dateB.toDate().getTime() - dateA.toDate().getTime();
        });
        
        resolve(rates);
      };

      request.onerror = () => {
        console.error('❌ Ошибка получения всех котировок:', request.error);
        reject(new Error(`Failed to get all rates: ${request.error}`));
      };
    });
  }

  /**
   * Получает статистику кеша
   */
  async getCacheStats(): Promise<IExchangeRateCacheStats> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates, DB_CONFIG.stores.metadata], 'readonly');
      const ratesStore = transaction.objectStore(DB_CONFIG.stores.rates);
      const metaStore = transaction.objectStore(DB_CONFIG.stores.metadata);

      const allRatesRequest = ratesStore.getAll();
      const lastUpdateRequest = metaStore.get(METADATA_KEYS.lastUpdate);

      let allRatesResult: IExchangeRate[] = [];
      let lastUpdateResult: any = null;

      allRatesRequest.onsuccess = () => {
        allRatesResult = allRatesRequest.result;
        checkComplete();
      };

      lastUpdateRequest.onsuccess = () => {
        lastUpdateResult = lastUpdateRequest.result;
        checkComplete();
      };

      let completed = 0;
      function checkComplete() {
        completed++;
        if (completed === 2) {
          try {
            const currencies = Array.from(new Set(allRatesResult.map(r => r.currencyCode)));
            const dates = allRatesResult.map(r => ExchangeRateDates.fromString(r.date));
            
            let earliest = '';
            let latest = '';
            
            if (dates.length > 0) {
              const sortedDates = ExchangeRateDates.sortAscending(dates);
              earliest = sortedDates[0].value;
              latest = sortedDates[sortedDates.length - 1].value;
            }

            resolve({
              totalRates: allRatesResult.length,
              currencies,
              dateRange: { earliest, latest },
              lastUpdate: lastUpdateResult?.value || null
            });
          } catch (error) {
            reject(error);
          }
        }
      }

      transaction.onerror = () => {
        console.error('❌ Ошибка получения статистики:', transaction.error);
        reject(new Error(`Failed to get cache stats: ${transaction.error}`));
      };
    });
  }

  /**
   * Очищает весь кеш
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.rates, DB_CONFIG.stores.metadata], 'readwrite');
      const ratesStore = transaction.objectStore(DB_CONFIG.stores.rates);
      const metaStore = transaction.objectStore(DB_CONFIG.stores.metadata);

      ratesStore.clear();
      metaStore.clear();

      transaction.oncomplete = () => {
        console.log('✅ Кеш очищен');
        resolve();
      };

      transaction.onerror = () => {
        console.error('❌ Ошибка очистки кеша:', transaction.error);
        reject(new Error(`Failed to clear cache: ${transaction.error}`));
      };
    });
  }

  /**
   * Получает метаданные
   */
  async getMetadata(key: string): Promise<any> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.metadata], 'readonly');
      const store = transaction.objectStore(DB_CONFIG.stores.metadata);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        console.error('❌ Ошибка получения метаданных:', request.error);
        reject(new Error(`Failed to get metadata: ${request.error}`));
      };
    });
  }

  /**
   * Устанавливает метаданные
   */
  async setMetadata(key: string, value: any): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DB_CONFIG.stores.metadata], 'readwrite');
      const store = transaction.objectStore(DB_CONFIG.stores.metadata);
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Ошибка установки метаданных:', request.error);
        reject(new Error(`Failed to set metadata: ${request.error}`));
      };
    });
  }

  /**
   * Проверяет и восстанавливает целостность метаданных
   */
  async ensureMetadataIntegrity(): Promise<void> {
    try {
      const lastUpdate = await this.getMetadata(METADATA_KEYS.lastUpdate);
      const lastSync = await this.getMetadata(METADATA_KEYS.lastSync);

      if (!lastUpdate) {
        await this.setMetadata(METADATA_KEYS.lastUpdate, new Date('2025-01-01').toISOString());
        console.log('🔧 Восстановлен lastUpdate');
      }

      if (!lastSync) {
        const stats = await this.getCacheStats();
        const defaultSync = stats.dateRange.latest || '01.01.2025';
        await this.setMetadata(METADATA_KEYS.lastSync, defaultSync);
        console.log('🔧 Восстановлен lastSyncDate');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка восстановления метаданных:', error);
    }
  }

  /**
   * Получает размер кеша
   */
  async getCacheSize(): Promise<number> {
    const stats = await this.getCacheStats();
    return stats.totalRates;
  }

  /**
   * Принудительное обновление (совместимость с старым API)
   */
  async forceUpdate(): Promise<void> {
    // Эта функция будет делегирована к ExchangeRateService
    console.log('🔄 forceUpdate вызван на storage - делегируем к сервису');
  }

  /**
   * Проверяет инициализацию
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Закрывает соединение с базой данных
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

/**
 * Синглтон хранилища
 */
export const indexedDBStorage = new IndexedDBExchangeRateStorage();
