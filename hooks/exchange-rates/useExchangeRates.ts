import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ExchangeRate, 
  ChartDataPoint,
} from '../../types/exchange-rates';
import { exchangeRatesService } from '../../services/exchangeRates';
import { exchangeRateCacheService } from '../../services/exchangeRateCache';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectLatestRate, selectCacheStatus } from '../../store/slices/exchangeRates';

export function useExchangeRates() {
  const dispatch = useAppDispatch();
  const cacheStatus = useAppSelector(selectCacheStatus);
  const usdRate = useAppSelector((state) => selectLatestRate(state, 'USD'));
  
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Создаем Map из Redux данных для обратной совместимости
  const latestRates = useMemo(() => {
    const map = new Map<string, ExchangeRate>();
    if (usdRate) {
      map.set('USD', usdRate);
    }
    return map;
  }, [usdRate]);

  // ВРЕМЕННАЯ ИНИЦИАЛИЗАЦИЯ - только из IndexedDB БЕЗ фонового обновления
  useEffect(() => {
    console.log('🛡️ БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ - только из IndexedDB');
    const safeInit = async () => {
      try {
        // Загружаем ТОЛЬКО из IndexedDB без фонового обновления
        const dispatch = (await import('../../store')).store.dispatch;
        const { loadFromCache } = await import('../../store/slices/exchangeRates');
        
        await dispatch(loadFromCache('USD'));
        console.log('✅ Данные загружены ТОЛЬКО из IndexedDB');
      } catch (error) {
        console.error('Ошибка безопасной инициализации:', error);
      }
    };
    
    safeInit();
  }, []);



  // Загрузка списка доступных валют (только USD)
  const loadCurrencies = useCallback(async () => {
    // Сразу возвращаем USD, так как это единственная поддерживаемая валюта
    return ['USD'];
  }, []);

  // Загрузка данных для графика с кешированием
  const loadChartData = useCallback(async (
    currencyCode: string,
    fromDate?: Date,
    toDate?: Date
  ) => {
    if (!fromDate || !toDate) {
      setError('Необходимо указать диапазон дат');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Используем кеширующий сервис вместо прямого API
      const data = await exchangeRateCacheService.getChartData(currencyCode, fromDate, toDate);
      setChartData(data);
    } catch (error: any) {
      console.error('Error loading chart data:', error);
      setError(error.message || 'Ошибка загрузки данных графика');
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка последних котировок USD
  const loadLatestRates = useCallback(async () => {
    // Если данные уже есть в Redux, не делаем дополнительных запросов
    if (usdRate) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Пытаемся получить из кеша
      const cachedRate = exchangeRateCacheService.getLatestRate('USD');
      
      if (!cachedRate) {
        // Если в кеше нет, принудительно обновляем
        await exchangeRateCacheService.forceUpdate('USD');
      }
    } catch (error: any) {
      console.error('Error loading latest rates:', error);
      setError(error.message || 'Ошибка загрузки курсов валют');
    } finally {
      setIsLoading(false);
    }
  }, [usdRate]);

  // Обновление выбранной валюты (устарело, но оставляем для совместимости)
  const setSelectedCurrency = useCallback((currency: string) => {
    // USD зафиксирован, игнорируем изменения
    console.warn('setSelectedCurrency is deprecated, USD is fixed');
  }, []);

  // Обновление диапазона дат (устарело, управляется на уровне компонентов)
  const setDateRange = useCallback((dateRange: { from: Date; to: Date }) => {
    console.warn('setDateRange is deprecated, manage dates at component level');
  }, []);

  // Получение статистики по валюте
  const getCurrencyStats = useCallback((currencyCode: string) => {
    const rate = latestRates.get(currencyCode);
    if (!rate) return null;

    // Находим данные за предыдущий день для расчета изменения
    if (chartData.length < 2) {
      return {
        current: rate.rate / rate.nominal,
        change24h: 0,
        changePercent24h: 0,
        high24h: rate.rate / rate.nominal,
        low24h: rate.rate / rate.nominal,
      };
    }

    const currentRate = rate.rate / rate.nominal;
    const previousRate = chartData[chartData.length - 2]?.displayRate || currentRate;
    
    const change24h = currentRate - previousRate;
    const changePercent24h = previousRate !== 0 ? (change24h / previousRate) * 100 : 0;

    // Находим максимум и минимум за последние 24 часа
    const recent24h = chartData.slice(-24); // Примерно последние 24 точки
    const rates24h = recent24h.map(d => d.displayRate || 0);
    const high24h = Math.max(...rates24h);
    const low24h = Math.min(...rates24h);

    return {
      current: currentRate,
      change24h,
      changePercent24h,
      high24h,
      low24h,
    };
  }, [latestRates, chartData]);

  // Форматирование курса
  const formatRate = useCallback((rate: number, nominal: number = 1) => {
    return exchangeRatesService.formatRate(rate, nominal);
  }, []);

  // Очистка ошибок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Обновление всех данных
  const refreshAll = useCallback(async () => {
    try {
      await exchangeRateCacheService.forceUpdate('USD');
    } catch (error: any) {
      setError(error.message || 'Ошибка обновления данных');
    }
  }, []);

  return {
    // Данные
    chartData,
    latestRates,
    
    // Методы загрузки данных
    loadCurrencies,
    loadChartData,
    loadLatestRates,
    
    // Устаревшие методы (для совместимости)
    setSelectedCurrency,
    setDateRange,
    refreshAll,
    clearError,
    
    // Состояние UI (комбинируем локальное состояние и Redux)
    isLoading: isLoading || cacheStatus.isLoading || cacheStatus.isUpdating,
    error: error || null,
    
    // Утилиты
    getCurrencyStats,
    formatRate,
    
    // Дополнительная информация о кеше
    cacheStatus: {
      initialized: cacheStatus.status !== 'empty',
      lastUpdate: cacheStatus.lastUpdate,
      totalRates: cacheStatus.totalRates,
      isUpdating: cacheStatus.isUpdating,
    },
  };
}
