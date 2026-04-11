/**
 * Инициализация системы котировок валют
 * Объединяет все рефакторенные сервисы в единую систему
 * Следует принципам SOLID, DRY, KISS
 *
 * Этот файл должен быть импортирован в точке входа приложения
 * для инициализации всей системы котировок
 */

import { exchangeRateFacade } from './exchangeRateFacade';
import { indexedDBStorage } from '../storage/indexedDBStorage';
import { exchangeRateWorkingDaysService } from './exchangeRateWorkingDays.service';

/**
 * Конфигурация системы котировок
 */
interface ExchangeRateSystemConfig {
  autoInitialize: boolean;
  enableDebugMode: boolean;
  enableAutoUpdate: boolean;
  updateIntervalMinutes: number;
  supportedCurrencies: string[];
}

/**
 * Конфигурация по умолчанию
 */
const DEFAULT_CONFIG: ExchangeRateSystemConfig = {
  autoInitialize: true,
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableAutoUpdate: true,
  updateIntervalMinutes: 30,
  supportedCurrencies: ['USD', 'EUR', 'CNY', 'GBP', 'JPY'],
};

/**
 * Менеджер системы котировок
 */
class ExchangeRateSystemManager {
  private config: ExchangeRateSystemConfig;
  private isInitialized = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ExchangeRateSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Инициализирует систему котировок
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🏁 Система котировок уже инициализирована');
      return;
    }

    try {
      console.log('🚀 Инициализация системы котировок...');

      // Инициализируем хранилище
      await this.initializeStorage();

      // Настраиваем автообновление
      if (this.config.enableAutoUpdate) {
        this.setupAutoUpdate();
      }

      // Настраиваем отладочный режим
      if (this.config.enableDebugMode) {
        this.setupDebugMode();
      }

      // Выполняем первоначальную загрузку данных
      await this.performInitialDataLoad();

      this.isInitialized = true;
      console.log('✅ Система котировок успешно инициализирована');
    } catch (error) {
      console.error('❌ Ошибка инициализации системы котировок:', error);
      throw error;
    }
  }

  /**
   * Инициализирует хранилище
   */
  private async initializeStorage(): Promise<void> {
    try {
      // IndexedDB инициализируется автоматически при первом обращении
      const stats = await exchangeRateFacade.getCacheInfo();
      console.log('📊 Статистика кеша:', stats);

      // Проверяем целостность данных
      if (stats.totalRates === 0) {
        console.log('📥 Кеш пуст, потребуется загрузка данных');
      } else {
        console.log(
          `📋 В кеше ${stats.totalRates} котировок для валют: ${stats.currencies.join(', ')}`,
        );
      }
    } catch (error) {
      console.warn('⚠️ Проблема с инициализацией хранилища:', error);
    }
  }

  /**
   * Настраивает автообновление
   */
  private setupAutoUpdate(): void {
    const intervalMs = this.config.updateIntervalMinutes * 60 * 1000;

    this.updateInterval = setInterval(async () => {
      try {
        console.log('⏰ Автоматическое обновление котировок...');

        for (const currency of this.config.supportedCurrencies) {
          const result = await exchangeRateFacade.smartUpdate(currency);
          if (result.loaded > 0) {
            console.log(`✅ Обновлено ${result.loaded} котировок для ${currency}`);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка автообновления:', error);
      }
    }, intervalMs);

    console.log(`⏰ Автообновление настроено на каждые ${this.config.updateIntervalMinutes} минут`);
  }

  /**
   * Настраивает отладочный режим
   */
  private setupDebugMode(): void {
    console.log('🐛 Отладочный режим включен');

    // Дополнительное логирование
    if (typeof window !== 'undefined') {
      (window as any).__exchangeRateSystem = {
        manager: this,
        facade: exchangeRateFacade,
        storage: indexedDBStorage,
        workingDays: exchangeRateWorkingDaysService,

        // Быстрые команды для отладки
        async quickTest() {
          console.log('🧪 Быстрый тест системы...');

          const usdRate = await exchangeRateFacade.getLatestRate('USD');
          console.log('💵 USD курс:', usdRate);

          const cacheInfo = await exchangeRateFacade.getCacheInfo();
          console.log('📊 Кеш:', cacheInfo);

          const debugInfo = await exchangeRateFacade.getDebugInfo('USD');
          console.log('🔍 Отладочная информация:', debugInfo);

          exchangeRateFacade.testWorkingDays();
        },

        async clearAll() {
          console.log('🗑️ Полная очистка системы...');
          await exchangeRateFacade.clearCache();
          console.log('✅ Кеш очищен');
        },

        async forceReload() {
          console.log('🔄 Принудительная перезагрузка...');
          for (const currency of DEFAULT_CONFIG.supportedCurrencies) {
            await exchangeRateFacade.forceUpdate(currency, 30);
          }
          console.log('✅ Данные перезагружены');
        },
      };

      console.log('🛠️ Отладочные команды доступны через __exchangeRateSystem');
    }
  }

  /**
   * Выполняет первоначальную загрузку данных
   */
  private async performInitialDataLoad(): Promise<void> {
    try {
      console.log('📡 Проверка актуальности данных...');

      let needsUpdate = false;

      for (const currency of this.config.supportedCurrencies) {
        const result = await exchangeRateFacade.smartUpdate(currency);
        if (result.loaded > 0) {
          console.log(`📥 Загружено ${result.loaded} новых котировок для ${currency}`);
          needsUpdate = true;
        }
      }

      if (!needsUpdate) {
        console.log('✅ Все данные актуальны');
      }
    } catch (error) {
      console.warn('⚠️ Проблема с загрузкой данных:', error);
    }
  }

  /**
   * Останавливает систему
   */
  shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isInitialized = false;
    console.log('🛑 Система котировок остановлена');
  }

  /**
   * Получает состояние системы
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      autoUpdateActive: this.updateInterval !== null,
    };
  }

  /**
   * Обновляет конфигурацию
   */
  updateConfig(newConfig: Partial<ExchangeRateSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Перенастраиваем автообновление если изменился интервал
    if (newConfig.updateIntervalMinutes && this.config.enableAutoUpdate) {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      this.setupAutoUpdate();
    }
  }
}

/**
 * Глобальный экземпляр менеджера системы
 */
export const exchangeRateSystem = new ExchangeRateSystemManager();

/**
 * Функция для быстрой инициализации системы
 */
export async function initializeExchangeRateSystem(
  config?: Partial<ExchangeRateSystemConfig>,
): Promise<void> {
  if (config) {
    exchangeRateSystem.updateConfig(config);
  }

  await exchangeRateSystem.initialize();
}

/**
 * Хук для React приложений
 */
export function useExchangeRateSystem() {
  return {
    system: exchangeRateSystem,
    facade: exchangeRateFacade,
    initialize: () => exchangeRateSystem.initialize(),
    getStatus: () => exchangeRateSystem.getSystemStatus(),
  };
}

/**
 * Автоматическая инициализация для браузера
 */
if (typeof window !== 'undefined' && DEFAULT_CONFIG.autoInitialize) {
  // Инициализируем после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeExchangeRateSystem().catch(console.error);
    });
  } else {
    // DOM уже загружен
    initializeExchangeRateSystem().catch(console.error);
  }
}
