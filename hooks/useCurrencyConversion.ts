import { useState, useEffect, useCallback } from 'react';
import { exchangeRateCacheService } from '../services/exchangeRateCache';

// Глобальная мапа для дедупликации параллельных запросов курса USD→RUB по дате
// Позволяет нескольким компонентам использовать один и тот же in-flight запрос
const inFlightRatePromises: Map<string, Promise<number>> = new Map();

export type DisplayCurrency = 'RUB' | 'USD';

interface ConversionState {
  rate: number | null;
  isLoading: boolean;
  error: string | null;
}

type UseCurrencyConversionOptions = {
  /** Дата курса в формате ISO (YYYY-MM-DD). Если не указана — берётся последний доступный курс */
  date?: string;
};

/**
 * Хук для конвертации валют с кешированием курса на уровне in-flight запросов
 *
 * Особенности:
 * - Загружает курс USD→RUB для конкретной даты (или "latest")
 * - Дедуплицирует параллельные запросы по дате через inFlightRatePromises
 * - Возвращает синхронные функции конвертации, работающие на уже загруженном курсе
 *
 * @example
 * ```tsx
 * const { convert, convertSync, rate, isLoading } = useCurrencyConversion({ date: '2024-01-15' });
 *
 * // Синхронная конвертация (вернёт исходную сумму, если курс ещё не загружен)
 * const usdAmount = convert(1000, 'RUB', 'USD');
 *
 * // Синхронная конвертация с явной проверкой (вернёт null если курса ещё нет)
 * const rubAmount = convertSync(100, 'USD', 'RUB');
 * ```
 */
export function useCurrencyConversion(options?: UseCurrencyConversionOptions) {
  const [state, setState] = useState<ConversionState>({
    rate: null,
    isLoading: true,
    error: null,
  });

  /**
   * Загрузка курса USD→RUB для указанной даты
   * Использует глобальный мап inFlightRatePromises для дедупликации запросов
   */
  useEffect(() => {
    const loadRate = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const key = options?.date ?? 'latest';
        let promise = inFlightRatePromises.get(key);
        if (!promise) {
          promise = exchangeRateCacheService
            .convertCurrencyFast(1, 'USD', 'RUB', options?.date)
            .then((r) => r.rate)
            .finally(() => inFlightRatePromises.delete(key));
          inFlightRatePromises.set(key, promise);
        }
        const rate = await promise;
        setState({
          rate,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to load exchange rate:', error);
        setState({
          rate: null,
          isLoading: false,
          error: 'Не удалось загрузить курс валют',
        });
      }
    };

    loadRate();
  }, [options?.date]);

  /**
   * Синхронная конвертация с "мягким" поведением:
   * - если курс ещё не загружен, возвращает исходную сумму без конвертации
   * - если валюты совпадают, просто возвращает исходную сумму
   * - округляет результат до целого
   */
  const convert = useCallback(
    (amount: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD'): number => {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      if (state.rate === null) {
        return amount;
      }

      if (fromCurrency === 'USD' && toCurrency === 'RUB') {
        return Math.round(amount * state.rate);
      }

      if (fromCurrency === 'RUB' && toCurrency === 'USD') {
        return Math.round(amount / state.rate);
      }

      return amount;
    },
    [state.rate],
  );

  /**
   * Синхронная конвертация с "жёстким" поведением:
   * - если курс ещё не загружен, возвращает null
   * - если валюты совпадают, возвращает исходную сумму
   * - округляет результат до целого
   *
   * Удобно, если вызывающая сторона явно хочет знать,
   * загружен ли курс (например, для отображения скелетона или плейсхолдера)
   */
  const convertSync = useCallback(
    (amount: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD'): number | null => {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      if (state.rate === null) {
        return null;
      }

      if (fromCurrency === 'USD' && toCurrency === 'RUB') {
        return Math.round(amount * state.rate);
      }

      if (fromCurrency === 'RUB' && toCurrency === 'USD') {
        return Math.round(amount / state.rate);
      }

      return amount;
    },
    [state.rate],
  );

  /**
   * Утилита для конвертации произвольной суммы в рубли
   * Использует convert и наследует его поведение
   */
  const toRub = useCallback(
    (amount: number, fromCurrency: 'RUB' | 'USD'): number => {
      return convert(amount, fromCurrency, 'RUB');
    },
    [convert],
  );

  /**
   * Утилита для конвертации произвольной суммы в доллары
   * Использует convert и наследует его поведение
   */
  const toUsd = useCallback(
    (amount: number, fromCurrency: 'RUB' | 'USD'): number => {
      return convert(amount, fromCurrency, 'USD');
    },
    [convert],
  );

  return {
    rate: state.rate,
    isLoading: state.isLoading,
    error: state.error,
    convert,
    convertSync,
    toRub,
    toUsd,
  };
}
