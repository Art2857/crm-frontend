/**
 * Хук для конвертации валют с кешированием курсов
 * Минимизирует количество запросов к API за счёт кеширования курса на дату
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { exchangeRateCacheService } from '../services/exchangeRateCache';

interface CachedRate {
  rate: number;
  date: string;
  timestamp: number;
}

interface UseCurrencyConversionOptions {
  /** Дата для получения курса (ISO формат: YYYY-MM-DD) */
  date?: string;
  /** Время жизни кеша в миллисекундах (по умолчанию 5 минут) */
  cacheLifetime?: number;
}

interface UseCurrencyConversionResult {
  /** Конвертировать сумму из одной валюты в другую */
  convert: (amount: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD') => Promise<number>;
  /** Синхронная конвертация с использованием закешированного курса (если доступен) */
  convertSync: (amount: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD') => number | null;
  /** Текущий курс USD/RUB */
  rate: number | null;
  /** Идёт ли загрузка курса */
  isLoading: boolean;
  /** Ошибка загрузки */
  error: string | null;
  /** Предзагрузить курс на указанную дату */
  preloadRate: (date?: string) => Promise<void>;
}

/**
 * Хук для конвертации валют с кешированием
 * 
 * @example
 * ```tsx
 * const { convert, convertSync, rate, isLoading } = useCurrencyConversion({ date: '2024-01-15' });
 * 
 * // Асинхронная конвертация (загрузит курс если нужно)
 * const usdAmount = await convert(1000, 'RUB', 'USD');
 * 
 * // Синхронная конвертация (вернёт null если курс ещё не загружен)
 * const rubAmount = convertSync(100, 'USD', 'RUB');
 * ```
 */
export function useCurrencyConversion(options: UseCurrencyConversionOptions = {}): UseCurrencyConversionResult {
  const { date, cacheLifetime = 5 * 60 * 1000 } = options;
  
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Кеш курсов по датам (хранится в ref чтобы не вызывать перерендеры)
  const rateCache = useRef<Map<string, CachedRate>>(new Map());
  
  // Текущий запрос (для предотвращения дублирования)
  const pendingRequest = useRef<Promise<number> | null>(null);
  const pendingRequestDate = useRef<string | null>(null);

  /**
   * Получает ключ кеша для даты
   */
  const getCacheKey = useCallback((targetDate?: string): string => {
    return targetDate || 'latest';
  }, []);

  /**
   * Проверяет, актуален ли кеш для даты
   */
  const isCacheValid = useCallback((targetDate?: string): boolean => {
    const key = getCacheKey(targetDate);
    const cached = rateCache.current.get(key);
    
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < cacheLifetime;
  }, [getCacheKey, cacheLifetime]);

  /**
   * Получает курс из кеша
   */
  const getCachedRate = useCallback((targetDate?: string): number | null => {
    const key = getCacheKey(targetDate);
    const cached = rateCache.current.get(key);
    
    if (cached && isCacheValid(targetDate)) {
      return cached.rate;
    }
    
    return null;
  }, [getCacheKey, isCacheValid]);

  /**
   * Загружает курс с сервера и кеширует его
   */
  const loadRate = useCallback(async (targetDate?: string): Promise<number> => {
    const key = getCacheKey(targetDate);
    
    // Проверяем кеш
    const cachedRate = getCachedRate(targetDate);
    if (cachedRate !== null) {
      return cachedRate;
    }
    
    // Проверяем, нет ли уже активного запроса для этой даты
    if (pendingRequest.current && pendingRequestDate.current === key) {
      return pendingRequest.current;
    }
    
    // Создаём новый запрос
    pendingRequestDate.current = key;
    pendingRequest.current = (async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Используем конвертацию 1 USD -> RUB чтобы получить курс
        const result = await exchangeRateCacheService.convertCurrencyFast(
          1,
          'USD',
          'RUB',
          targetDate
        );
        
        const newRate = result.rate;
        
        // Сохраняем в кеш
        rateCache.current.set(key, {
          rate: newRate,
          date: targetDate || 'latest',
          timestamp: Date.now(),
        });
        
        setRate(newRate);
        return newRate;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки курса';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
        pendingRequest.current = null;
        pendingRequestDate.current = null;
      }
    })();
    
    return pendingRequest.current;
  }, [getCacheKey, getCachedRate]);

  /**
   * Конвертирует сумму из одной валюты в другую (асинхронно)
   */
  const convert = useCallback(async (
    amount: number,
    fromCurrency: 'RUB' | 'USD',
    toCurrency: 'RUB' | 'USD'
  ): Promise<number> => {
    // Одинаковые валюты - возвращаем без конвертации
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Получаем курс (из кеша или загружаем)
    const currentRate = await loadRate(date);
    
    // Конвертируем
    if (fromCurrency === 'USD' && toCurrency === 'RUB') {
      return amount * currentRate;
    } else {
      return amount / currentRate;
    }
  }, [date, loadRate]);

  /**
   * Конвертирует сумму синхронно (использует только кешированный курс)
   * Возвращает null если курс ещё не загружен
   */
  const convertSync = useCallback((
    amount: number,
    fromCurrency: 'RUB' | 'USD',
    toCurrency: 'RUB' | 'USD'
  ): number | null => {
    // Одинаковые валюты - возвращаем без конвертации
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Пробуем получить курс из кеша
    const cachedRate = getCachedRate(date);
    
    if (cachedRate === null) {
      return null;
    }
    
    // Конвертируем
    if (fromCurrency === 'USD' && toCurrency === 'RUB') {
      return amount * cachedRate;
    } else {
      return amount / cachedRate;
    }
  }, [date, getCachedRate]);

  /**
   * Предзагружает курс на указанную дату
   */
  const preloadRate = useCallback(async (targetDate?: string): Promise<void> => {
    try {
      await loadRate(targetDate);
    } catch {
      // Игнорируем ошибки предзагрузки
    }
  }, [loadRate]);

  // Автоматически загружаем курс при изменении даты
  useEffect(() => {
    if (date) {
      preloadRate(date);
    }
  }, [date, preloadRate]);

  return {
    convert,
    convertSync,
    rate,
    isLoading,
    error,
    preloadRate,
  };
}

/**
 * Хук для пакетной конвертации нескольких сумм
 * Оптимизирован для случаев когда нужно конвертировать много значений сразу
 */
export function useBatchCurrencyConversion(options: UseCurrencyConversionOptions = {}) {
  const { convert, convertSync, rate, isLoading, error, preloadRate } = useCurrencyConversion(options);
  
  /**
   * Конвертирует массив сумм
   */
  const convertBatch = useCallback(async (
    items: Array<{ amount: number; fromCurrency: 'RUB' | 'USD'; toCurrency: 'RUB' | 'USD' }>
  ): Promise<number[]> => {
    // Предзагружаем курс один раз
    await preloadRate(options.date);
    
    // Конвертируем все суммы (синхронно, т.к. курс уже загружен)
    return items.map(item => {
      const result = convertSync(item.amount, item.fromCurrency, item.toCurrency);
      return result ?? 0;
    });
  }, [options.date, preloadRate, convertSync]);

  return {
    convert,
    convertSync,
    convertBatch,
    rate,
    isLoading,
    error,
    preloadRate,
  };
}

export default useCurrencyConversion;

