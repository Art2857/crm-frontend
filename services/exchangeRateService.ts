/**
 * Единый сервис для работы с котировками валют
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: управление котировками валют
 * Open/Closed: легко расширяется новыми валютами и источниками данных
 * Liskov Substitution: может быть заменен на другую реализацию
 * Interface Segregation: четкие интерфейсы для разных аспектов работы
 * Dependency Inversion: зависит от абстракций (интерфейсов)
 * 
 * DRY: единое место для всей логики котировок
 * KISS: простой API для работы с котировками
 */

import { ExchangeRateDate, ExchangeRateDates } from '../utils/exchangeRateDate';
import { exchangeRateWorkingDaysService, IExchangeRateWorkingDaysService } from './exchangeRateWorkingDays.service';

/**
 * Интерфейс котировки валюты
 */
export interface IExchangeRate {
  id: string;
  currencyCode: string;
  rate: number;
  nominal: number;
  date: string; // DD.MM.YYYY
  createdAt: string;
  updatedAt: string;
}

/**
 * Результат поиска котировки
 */
export interface IExchangeRateSearchResult {
  found: boolean;
  rate?: IExchangeRate;
  searchedDate: string; // DD.MM.YYYY
  actualDate?: string; // DD.MM.YYYY - дата найденной котировки
  daysSearched: number;
}

/**
 * Конфигурация поиска котировок
 */
export interface IExchangeRateSearchConfig {
  maxDaysBack: number;
  onlyWorkingDays: boolean;
  fallbackToAnyDay: boolean;
}

/**
 * Статистика кеша котировок
 */
export interface IExchangeRateCacheStats {
  totalRates: number;
  currencies: string[];
  dateRange: {
    earliest: string; // DD.MM.YYYY
    latest: string; // DD.MM.YYYY
  };
  lastUpdate: string | null;
}

/**
 * Интерфейс для хранилища котировок
 */
export interface IExchangeRateStorage {
  getRate(currencyCode: string, date: string): Promise<IExchangeRate | null>;
  setRate(rate: IExchangeRate): Promise<void>;
  getRatesInRange(currencyCode: string, startDate: string, endDate: string): Promise<IExchangeRate[]>;
  getAllRates(currencyCode: string): Promise<IExchangeRate[]>;
  getCacheStats(): Promise<IExchangeRateCacheStats>;
  clear(): Promise<void>;
}

/**
 * Интерфейс для API провайдера котировок
 */
export interface IExchangeRateProvider {
  fetchRates(date: ExchangeRateDate): Promise<IExchangeRate[]>;
  fetchRatesRange(startDate: ExchangeRateDate, endDate: ExchangeRateDate): Promise<IExchangeRate[]>;
  getSupportedCurrencies(): string[];
}

/**
 * Конфигурация по умолчанию для поиска котировок
 */
export const DEFAULT_SEARCH_CONFIG: IExchangeRateSearchConfig = {
  maxDaysBack: 365,
  onlyWorkingDays: true,
  fallbackToAnyDay: true
};

/**
 * Сервис для работы с котировками валют
 */
export class ExchangeRateService {
  private storage: IExchangeRateStorage;
  private provider: IExchangeRateProvider;
  private workingDays: IExchangeRateWorkingDaysService;
  private defaultConfig: IExchangeRateSearchConfig;

  constructor(
    storage: IExchangeRateStorage,
    provider: IExchangeRateProvider,
    workingDaysService: IExchangeRateWorkingDaysService = exchangeRateWorkingDaysService,
    config: IExchangeRateSearchConfig = DEFAULT_SEARCH_CONFIG
  ) {
    this.storage = storage;
    this.provider = provider;
    this.workingDays = workingDaysService;
    this.defaultConfig = config;
  }

  /**
   * Получает котировку валюты на конкретную дату
   */
  async getRate(currencyCode: string, date: ExchangeRateDate | string): Promise<IExchangeRate | null> {
    const exchangeDate = typeof date === 'string' ? ExchangeRateDates.fromString(date) : date;
    return this.storage.getRate(currencyCode, exchangeDate.value);
  }

  /**
   * Получает последнюю доступную котировку валюты
   * Ищет от указанной даты (или текущей) назад до нахождения котировки
   */
  async getLatestRate(
    currencyCode: string, 
    fromDate?: ExchangeRateDate | string,
    config: Partial<IExchangeRateSearchConfig> = {}
  ): Promise<IExchangeRateSearchResult> {
    const searchConfig = { ...this.defaultConfig, ...config };
    const startDate = fromDate 
      ? (typeof fromDate === 'string' ? ExchangeRateDates.fromString(fromDate) : fromDate)
      : ExchangeRateDates.today();

    console.log(`🔍 Поиск последней котировки ${currencyCode} от ${startDate.value}`);

    let currentDate = startDate;
    let daysSearched = 0;

    // Первая фаза: поиск только по рабочим дням
    if (searchConfig.onlyWorkingDays) {
      while (daysSearched < searchConfig.maxDaysBack) {
        if (this.workingDays.isWorkingDay(currentDate)) {
          const rate = await this.storage.getRate(currencyCode, currentDate.value);
          if (rate) {
            console.log(`✅ Найдена котировка ${currencyCode} на ${currentDate.value}: ${rate.rate}`);
            return {
              found: true,
              rate,
              searchedDate: startDate.value,
              actualDate: currentDate.value,
              daysSearched: daysSearched + 1
            };
          }
        }
        
        currentDate = currentDate.subtractDays(1);
        daysSearched++;
      }
    }

    // Вторая фаза: поиск по всем дням, если разрешен fallback
    if (searchConfig.fallbackToAnyDay) {
      console.log(`🔄 Переход к поиску по всем дням для ${currencyCode}`);
      currentDate = startDate;
      daysSearched = 0;

      while (daysSearched < searchConfig.maxDaysBack) {
        const rate = await this.storage.getRate(currencyCode, currentDate.value);
        if (rate) {
          console.log(`✅ Найдена котировка ${currencyCode} на ${currentDate.value}: ${rate.rate} (любой день)`);
          return {
            found: true,
            rate,
            searchedDate: startDate.value,
            actualDate: currentDate.value,
            daysSearched: daysSearched + 1
          };
        }
        
        currentDate = currentDate.subtractDays(1);
        daysSearched++;
      }
    }

    console.log(`❌ Котировка ${currencyCode} не найдена за ${daysSearched} дней`);
    return {
      found: false,
      searchedDate: startDate.value,
      daysSearched
    };
  }

  /**
   * Проверяет актуальность данных и необходимость обновления
   */
  async checkForUpdates(currencyCode: string): Promise<{
    needsUpdate: boolean;
    reason: string;
    missingDates: ExchangeRateDate[];
  }> {
    const latestResult = await this.getLatestRate(currencyCode);
    
    if (!latestResult.found) {
      return {
        needsUpdate: true,
        reason: 'Нет котировок в кеше',
        missingDates: []
      };
    }

    const latestDate = ExchangeRateDates.fromString(latestResult.rate!.date);
    const today = ExchangeRateDates.today();
    
    // Проверяем, есть ли рабочие дни между последней котировкой и сегодня
    if (this.workingDays.hasWorkingDaysBetween(latestDate, today)) {
      const missingDates = this.workingDays.getWorkingDaysInRange(
        latestDate.addDays(1), 
        today
      );
      
      return {
        needsUpdate: true,
        reason: `Пропущены рабочие дни после ${latestDate.value}`,
        missingDates
      };
    }

    return {
      needsUpdate: false,
      reason: 'Данные актуальны',
      missingDates: []
    };
  }

  /**
   * Загружает недостающие котировки
   */
  async loadMissingRates(currencyCode: string, dates: ExchangeRateDate[]): Promise<{
    loaded: number;
    failed: ExchangeRateDate[];
  }> {
    let loaded = 0;
    const failed: ExchangeRateDate[] = [];

    for (const date of dates) {
      try {
        console.log(`📡 Загружаем котировки на ${date.value}`);
        const rates = await this.provider.fetchRates(date);
        const targetRate = rates.find(r => r.currencyCode === currencyCode);
        
        if (targetRate) {
          await this.storage.setRate(targetRate);
          loaded++;
          console.log(`✅ Сохранена котировка ${currencyCode} на ${date.value}: ${targetRate.rate}`);
        } else {
          console.log(`⚠️ Котировка ${currencyCode} на ${date.value} не найдена в ответе API`);
          failed.push(date);
        }
      } catch (error) {
        console.error(`❌ Ошибка загрузки котировки на ${date.value}:`, error);
        failed.push(date);
      }
    }

    return { loaded, failed };
  }

  /**
   * Умная загрузка: проверяет актуальность и загружает недостающие данные
   */
  async smartUpdate(currencyCode: string): Promise<{
    needsUpdate: boolean;
    loaded: number;
    failed: ExchangeRateDate[];
    reason: string;
  }> {
    const updateCheck = await this.checkForUpdates(currencyCode);
    
    if (!updateCheck.needsUpdate) {
      return {
        needsUpdate: false,
        loaded: 0,
        failed: [],
        reason: updateCheck.reason
      };
    }

    const loadResult = await this.loadMissingRates(currencyCode, updateCheck.missingDates);
    
    return {
      needsUpdate: true,
      loaded: loadResult.loaded,
      failed: loadResult.failed,
      reason: updateCheck.reason
    };
  }

  /**
   * Принудительное обновление - загружает данные за указанный период
   */
  async forceUpdate(
    currencyCode: string, 
    daysBack: number = 60
  ): Promise<{
    loaded: number;
    failed: ExchangeRateDate[];
  }> {
    const endDate = ExchangeRateDates.today();
    const startDate = endDate.subtractDays(daysBack);
    const workingDates = this.workingDays.getWorkingDaysInRange(startDate, endDate);
    
    console.log(`🔄 Принудительное обновление ${currencyCode} за ${daysBack} дней (${workingDates.length} рабочих дней)`);
    
    return this.loadMissingRates(currencyCode, workingDates);
  }

  /**
   * Получает статистику кеша
   */
  async getCacheStats(): Promise<IExchangeRateCacheStats> {
    return this.storage.getCacheStats();
  }

  /**
   * Очищает кеш
   */
  async clearCache(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Получает отладочную информацию
   */
  async getDebugInfo(currencyCode: string): Promise<object> {
    const stats = await this.getCacheStats();
    const latestResult = await this.getLatestRate(currencyCode);
    const updateCheck = await this.checkForUpdates(currencyCode);
    
    return {
      currency: currencyCode,
      cache: stats,
      latest: latestResult,
      updates: updateCheck,
      workingDaysConfig: { type: 'CBR', name: 'ЦБ РФ рабочие дни (вт-сб)' },
      searchConfig: this.defaultConfig
    };
  }

  /**
   * Получает список поддерживаемых валют
   */
  getSupportedCurrencies(): string[] {
    return this.provider.getSupportedCurrencies();
  }

  /**
   * Обновляет конфигурацию поиска
   */
  updateSearchConfig(config: Partial<IExchangeRateSearchConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}
