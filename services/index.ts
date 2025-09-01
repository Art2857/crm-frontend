/**
 * Центральный экспорт всех сервисов системы котировок
 * Обеспечивает удобный импорт для потребителей
 */

// Основные сервисы
export { ExchangeRateService } from './exchangeRateService';
export { WorkingDaysService, workingDaysService } from './workingDaysService';
export { ExchangeRateWorkingDaysService, exchangeRateWorkingDaysService } from './exchangeRateWorkingDays.service';
export { ExchangeRateFacade, exchangeRateFacade } from './exchangeRateFacade';
export { exchangeRateSystem, initializeExchangeRateSystem, useExchangeRateSystem } from './exchangeRateSystem';

// Хранилище
export { IndexedDBExchangeRateStorage, indexedDBStorage } from '../storage/indexedDBStorage';

// Провайдеры данных
export { CBRExchangeRateProvider, cbrProvider } from '../providers/cbrProvider';

// Утилиты
export * from '../utils/exchangeRateDate';
// Exchange rate working days (CBR: tue-sat)
export { 
  isCBRWorkingDay as isExchangeRateWorkingDay, 
  getLastCBRWorkingDay as getLastExchangeRateWorkingDay 
} from '../utils/cbr-working-days';

// Salary working days (standard: mon-fri)  
export { 
  isSalaryWorkingDay, 
  getLastSalaryWorkingDay,
  getSalaryWorkingDaysInPeriod,
  getSalaryWorkingDaysInMonth
} from '../utils/salary-working-days';

// Хуки
export { useExchangeRates, useUSDRate, useMultipleExchangeRates } from '../hooks/useExchangeRates';

// Типы и интерфейсы
export type {
  IExchangeRate,
  IExchangeRateSearchResult,
  IExchangeRateSearchConfig,
  IExchangeRateCacheStats,
  IExchangeRateStorage,
  IExchangeRateProvider
} from './exchangeRateService';

export type {
  IWorkingDaysConfig,
  IWorkingDaysService
} from './workingDaysService';

export type {
  IExchangeRateDate
} from '../utils/exchangeRateDate';

// Компоненты (legacy версия активна)
export { default as CurrencyConverter } from '../components/exchange-rates/CurrencyConverter';

/**
 * Готовые конфигурации для быстрого старта
 */
export const QuickStartConfigs = {
  /**
   * Конфигурация для продакшена
   */
  production: {
    autoInitialize: true,
    enableDebugMode: false,
    enableAutoUpdate: true,
    updateIntervalMinutes: 60,
    supportedCurrencies: ['USD', 'EUR']
  },

  /**
   * Конфигурация для разработки
   */
  development: {
    autoInitialize: true,
    enableDebugMode: true,
    enableAutoUpdate: true,
    updateIntervalMinutes: 5,
    supportedCurrencies: ['USD', 'EUR', 'CNY', 'GBP', 'JPY']
  },

  /**
   * Минимальная конфигурация
   */
  minimal: {
    autoInitialize: false,
    enableDebugMode: false,
    enableAutoUpdate: false,
    updateIntervalMinutes: 0,
    supportedCurrencies: ['USD']
  }
};

/**
 * Быстрый старт для разных сценариев
 */
export const QuickStart = {
  /**
   * Инициализация для продакшена
   */
  async forProduction() {
    const { initializeExchangeRateSystem } = await import('./exchangeRateSystem');
    return initializeExchangeRateSystem(QuickStartConfigs.production);
  },

  /**
   * Инициализация для разработки
   */
  async forDevelopment() {
    const { initializeExchangeRateSystem } = await import('./exchangeRateSystem');
    return initializeExchangeRateSystem(QuickStartConfigs.development);
  },

  /**
   * Минимальная инициализация
   */
  async minimal() {
    const { initializeExchangeRateSystem } = await import('./exchangeRateSystem');
    return initializeExchangeRateSystem(QuickStartConfigs.minimal);
  }
};
