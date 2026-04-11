/**
 * Высокоуровневый сервис для управления кешированием курсов валют
 * Координирует работу Redux Store и IndexedDB
 */

import { store } from '../store';
import {
  loadFromCache,
  updateFromAPI,
  loadChartData,
  convertCurrency,
  cleanOldCache,
  smartLoadMissingData,
  selectLatestRate,
  selectChartData,
  selectCacheStatus,
} from '../store/slices/exchangeRates';
import { indexedDBManager } from '../utils/indexedDB';

export interface CacheInitResult {
  fromCache: boolean;
  ratesCount: number;
  lastUpdate: string | null;
}

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  result: number;
  rate: number;
  instant: boolean; // был ли результат получен мгновенно из кеша
}

class ExchangeRateCacheService {
  private initialized = false;
  private initPromise: Promise<CacheInitResult> | null = null;

  // Return current USD->RUB rate using Redux/IndexedDB only (no API fallback)
  async getUsdRubRate(date?: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }
    const normalizedDate = date ? new Date(date).toISOString().split('T')[0] : undefined;
    const result = await store.dispatch(
      convertCurrency({
        amount: 1,
        fromCurrency: 'USD',
        toCurrency: 'RUB',
        date: normalizedDate,
      }),
    );
    if (result.payload && typeof result.payload === 'object') {
      const payload: any = result.payload;
      return payload.rate as number;
    }
    throw new Error('Rate is not available');
  }

  /**
   * Инициализация системы кеширования
   * Загружает данные из IndexedDB в Redux и проверяет необходимость обновления
   */
  async initialize(currencyCode: string = 'USD'): Promise<CacheInitResult> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize(currencyCode);
    return this.initPromise;
  }

  private async _doInitialize(currencyCode: string): Promise<CacheInitResult> {
    try {
      // ПРОВЕРЯЕМ ЦЕЛОСТНОСТЬ metadata ПОСЛЕ ВОЗМОЖНОГО УДАЛЕНИЯ
      await indexedDBManager.ensureMetadataIntegrity();

      const cacheResult = await store.dispatch(loadFromCache(currencyCode));

      let fromCache = false;
      let ratesCount = 0;
      let lastUpdate: string | null = null;

      if (cacheResult.payload && typeof cacheResult.payload === 'object') {
        const payload = cacheResult.payload as any;
        fromCache = true;
        ratesCount = payload.totalCachedRates || 0;
        lastUpdate = payload.lastUpdate || null;
      }

      // Используем умную загрузку недостающих данных
      store
        .dispatch(smartLoadMissingData({ currencyCode }))
        .then((result) => {
          console.log('🚀 Умная загрузка завершена:', result.payload);
        })
        .catch((error) => {
          console.error('❌ Ошибка умной загрузки:', error);
        });

      this._scheduleCleanup();

      this.initialized = true;

      return {
        fromCache,
        ratesCount,
        lastUpdate,
      };
    } catch (error) {
      console.error('❌ Ошибка инициализации кеша:', error);
      this.initialized = false;
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Проверка необходимости обновления данных
   */
  private async _shouldUpdate(lastUpdate: string | null): Promise<boolean> {
    if (!lastUpdate) return true;

    const lastUpdateDate = new Date(lastUpdate);
    const now = new Date();
    const diffHours = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);

    // Обновляем если данные старше 30 минут
    return diffHours >= 0.5;
  }

  /**
   * Планирование очистки старых данных
   */
  private _scheduleCleanup(): void {
    // Проверяем, нужна ли очистка (раз в день)
    const lastCleanup = localStorage.getItem('exchangeRatesLastCleanup');
    const now = new Date();

    if (!lastCleanup) {
      localStorage.setItem('exchangeRatesLastCleanup', now.toISOString());
      return;
    }

    const lastCleanupDate = new Date(lastCleanup);
    const diffDays = (now.getTime() - lastCleanupDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays >= 1) {
      store.dispatch(cleanOldCache(365)); // Оставляем данные за год
      localStorage.setItem('exchangeRatesLastCleanup', now.toISOString());
    }
  }

  /**
   * Получение последнего курса валюты
   */
  getLatestRate(currencyCode: string) {
    const state = store.getState();
    return selectLatestRate(state, currencyCode);
  }

  /**
   * Получение данных для графика с кешированием
   */
  async getChartData(currencyCode: string, fromDate: Date, toDate: Date) {
    await this._ensureInitialized();

    const chartKey = `${currencyCode}-${fromDate.toISOString().split('T')[0]}-${toDate.toISOString().split('T')[0]}`;
    const state = store.getState();
    const cachedData = selectChartData(
      state,
      currencyCode,
      fromDate.toISOString().split('T')[0],
      toDate.toISOString().split('T')[0],
    );

    if (cachedData) {
      return cachedData;
    }

    const result = await store.dispatch(loadChartData({ currencyCode, fromDate, toDate }));

    if (result.payload && typeof result.payload === 'object') {
      const payload = result.payload as any;
      return payload.data || [];
    }

    throw new Error('Не удалось загрузить данные для графика');
  }

  /**
   * Быстрая конвертация валют из кеша
   */
  async convertCurrencyFast(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string,
  ): Promise<ConversionResult> {
    // Одинаковые валюты
    if (fromCurrency === toCurrency) {
      return {
        amount,
        fromCurrency,
        toCurrency,
        result: amount,
        rate: 1,
        instant: true,
      };
    }

    // УПРОЩАЕМ: всегда используем полную Redux логику для надежности
    await this._ensureInitialized();

    try {
      const normalizedDate = date ? new Date(date).toISOString().split('T')[0] : undefined;
      const result = await store.dispatch(
        convertCurrency({
          amount,
          fromCurrency,
          toCurrency,
          date: normalizedDate,
        }),
      );

      if (result.payload && typeof result.payload === 'object') {
        const payload = result.payload as any;
        return {
          amount: payload.amount,
          fromCurrency: payload.fromCurrency,
          toCurrency: payload.toCurrency,
          result: payload.result,
          rate: payload.rate,
          instant: true, // Redux достаточно быстрый
        };
      }

      throw new Error('Конвертация не удалась');
    } catch (error) {
      console.error('Redux convertCurrency failed:', error);

      // Последний fallback к API
      try {
        const { exchangeRatesService } = await import('./exchangeRates');
        const apiResult = await exchangeRatesService.convertCurrency({
          amount,
          fromCurrency,
          toCurrency,
          date: date ? new Date(date) : undefined,
        });

        return {
          amount,
          fromCurrency,
          toCurrency,
          result: apiResult.result,
          rate: apiResult.rate,
          instant: false,
        };
      } catch (apiError) {
        const err = apiError as any;
        const msg = err && err.message ? err.message : 'Неизвестная ошибка API';
        throw new Error(`Не удалось получить курс: ${msg}`);
      }
    }
  }

  /**
   * Принудительное обновление данных
   */
  async forceUpdate(currencyCode: string = 'USD') {
    const result = await store.dispatch(
      updateFromAPI({
        currencyCode,
        force: true,
      }),
    );

    if (result.payload) {
      return result.payload;
    }

    throw new Error('Обновление не удалось');
  }

  /**
   * Получение статуса кеша
   */
  getCacheStatus() {
    const state = store.getState();
    return selectCacheStatus(state);
  }

  /**
   * Очистка всего кеша
   */
  async clearCache() {
    // Очищаем Redux
    const { clearCache } = await import('../store/slices/exchangeRates');
    store.dispatch(clearCache());

    // Очищаем IndexedDB
    await indexedDBManager.cleanOldRates(new Date().toISOString());

    // Очищаем localStorage
    localStorage.removeItem('exchangeRatesLastCleanup');

    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Получение статистики кеша
   */
  async getCacheStats() {
    const indexedDBStats = await indexedDBManager.getCacheSize();
    const reduxState = store.getState().exchangeRates;

    return {
      indexedDB: indexedDBStats,
      redux: {
        ratesCount: Object.keys(reduxState.rates).length,
        latestRatesCount: Object.keys(reduxState.latestRates).length,
        chartDataCount: Object.keys(reduxState.chartData).length,
      },
      status: {
        initialized: this.initialized,
        lastUpdate: reduxState.lastUpdate,
        lastSync: reduxState.lastSyncDate,
        isLoading: reduxState.isLoading,
        isUpdating: reduxState.isUpdating,
      },
    };
  }

  /**
   * Проверка инициализации
   */
  private async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Предзагрузка данных для улучшения производительности
   */
  async preloadData(currencyCode: string = 'USD') {
    await this._ensureInitialized();

    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Предзагружаем данные за последний месяц
    try {
      await this.getChartData(currencyCode, lastMonth, now);
    } catch (error) {
      console.warn('⚠️  Предзагрузка данных не удалась:', error);
    }
  }
}

// Singleton instance
export const exchangeRateCacheService = new ExchangeRateCacheService();

// Автоинициализация при импорте (если мы в браузере)
if (typeof window !== 'undefined') {
  // Инициализируем с задержкой, чтобы не блокировать загрузку
  setTimeout(() => {
    exchangeRateCacheService.initialize().catch(console.error);
  }, 1000);
}
