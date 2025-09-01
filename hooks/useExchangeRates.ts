/**
 * React хук для работы с котировками валют
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: предоставляет интерфейс для React компонентов
 * DRY: единое место для логики в компонентах
 * KISS: простой API для использования
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { exchangeRateFacade } from '../services/exchangeRateFacade';

/**
 * Состояние котировки
 */
interface ExchangeRateState {
  rate: number | null;
  date: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Параметры хука
 */
interface UseExchangeRatesOptions {
  currencyCode?: string;
  autoUpdate?: boolean;
  updateInterval?: number; // в миллисекундах
  enableCache?: boolean;
}

/**
 * Результат хука
 */
interface UseExchangeRatesResult {
  // Состояние
  state: ExchangeRateState;
  
  // Методы
  refresh: () => Promise<void>;
  forceUpdate: () => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Утилиты
  isWorkingDay: (date: string | Date) => boolean;
  getLastWorkingDay: () => Date;
  
  // Отладка
  getDebugInfo: () => Promise<any>;
}

/**
 * Хук для работы с котировками валют
 */
export function useExchangeRates(options: UseExchangeRatesOptions = {}): UseExchangeRatesResult {
  const {
    currencyCode = 'USD',
    autoUpdate = true,
    updateInterval = 5 * 60 * 1000, // 5 минут
    enableCache = true
  } = options;

  // Состояние
  const [state, setState] = useState<ExchangeRateState>({
    rate: null,
    date: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  // Refs для предотвращения лишних ререндеров
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Безопасное обновление состояния (только если компонент еще монтирован)
   */
  const safeSetState = useCallback((newState: Partial<ExchangeRateState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...newState }));
    }
  }, []);

  /**
   * Загрузка последней котировки
   */
  const loadLatestRate = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        safeSetState({ loading: true, error: null });
      }

      console.log(`🔍 Загружаем последнюю котировку ${currencyCode}`);
      
      // Сначала пробуем умное обновление
      if (autoUpdate && enableCache) {
        await exchangeRateFacade.smartUpdate(currencyCode);
      }
      
      // Получаем последнюю котировку
      const rateData = await exchangeRateFacade.getLatestRate(currencyCode);
      
      if (rateData) {
        safeSetState({
          rate: rateData.rate,
          date: rateData.date,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString()
        });
        console.log(`✅ Котировка ${currencyCode} загружена: ${rateData.rate} на ${rateData.date}`);
      } else {
        safeSetState({
          rate: null,
          date: null,
          loading: false,
          error: `Котировка ${currencyCode} не найдена`,
          lastUpdated: null
        });
        console.warn(`⚠️ Котировка ${currencyCode} не найдена`);
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки котировки ${currencyCode}:`, error);
      safeSetState({
        loading: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }, [currencyCode, autoUpdate, enableCache, safeSetState]);

  /**
   * Принудительное обновление
   */
  const forceUpdate = useCallback(async () => {
    try {
      safeSetState({ loading: true, error: null });
      console.log(`🔄 Принудительное обновление ${currencyCode}`);
      
      await exchangeRateFacade.forceUpdate(currencyCode);
      await loadLatestRate(false);
    } catch (error) {
      console.error(`❌ Ошибка принудительного обновления ${currencyCode}:`, error);
      safeSetState({
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления'
      });
    }
  }, [currencyCode, loadLatestRate, safeSetState]);

  /**
   * Очистка кеша
   */
  const clearCache = useCallback(async () => {
    try {
      console.log('🗑️ Очистка кеша');
      await exchangeRateFacade.clearCache();
      await loadLatestRate();
    } catch (error) {
      console.error('❌ Ошибка очистки кеша:', error);
      safeSetState({
        error: error instanceof Error ? error.message : 'Ошибка очистки кеша'
      });
    }
  }, [loadLatestRate, safeSetState]);

  /**
   * Проверка рабочего дня
   */
  const isWorkingDay = useCallback((date: string | Date) => {
    return exchangeRateFacade.isWorkingDay(date);
  }, []);

  /**
   * Получение последнего рабочего дня
   */
  const getLastWorkingDay = useCallback(() => {
    return exchangeRateFacade.getLastWorkingDay();
  }, []);

  /**
   * Получение отладочной информации
   */
  const getDebugInfo = useCallback(async () => {
    return exchangeRateFacade.getDebugInfo(currencyCode);
  }, [currencyCode]);

  /**
   * Настройка автообновления
   */
  useEffect(() => {
    if (autoUpdate && updateInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log(`⏰ Автообновление котировки ${currencyCode}`);
        loadLatestRate(false);
      }, updateInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [autoUpdate, updateInterval, currencyCode, loadLatestRate]);

  /**
   * Первоначальная загрузка
   */
  useEffect(() => {
    loadLatestRate();
  }, [currencyCode]); // Загружаем при изменении валюты

  /**
   * Очистка при размонтировании
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    state,
    refresh: loadLatestRate,
    forceUpdate,
    clearCache,
    isWorkingDay,
    getLastWorkingDay,
    getDebugInfo
  };
}

/**
 * Упрощенный хук для получения только курса USD
 */
export function useUSDRate(): {
  rate: number | null;
  date: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { state, refresh } = useExchangeRates({ currencyCode: 'USD' });
  
  return {
    rate: state.rate,
    date: state.date,
    loading: state.loading,
    error: state.error,
    refresh
  };
}

/**
 * Хук для получения нескольких валют одновременно
 */
export function useMultipleExchangeRates(currencies: string[] = ['USD', 'EUR']) {
  const [rates, setRates] = useState<Record<string, ExchangeRateState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const results: Record<string, ExchangeRateState> = {};

      for (const currency of currencies) {
        try {
          const rateData = await exchangeRateFacade.getLatestRate(currency);
          
          results[currency] = {
            rate: rateData?.rate || null,
            date: rateData?.date || null,
            loading: false,
            error: rateData ? null : `Котировка ${currency} не найдена`,
            lastUpdated: new Date().toISOString()
          };
        } catch (err) {
          results[currency] = {
            rate: null,
            date: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Ошибка загрузки',
            lastUpdated: null
          };
        }
      }

      setRates(results);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setLoading(false);
    }
  }, [currencies]);

  useEffect(() => {
    loadAllRates();
  }, [loadAllRates]);

  return {
    rates,
    loading,
    error,
    refresh: loadAllRates
  };
}
