import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { ExchangeRate, ChartDataPoint } from '../../types/exchange-rates';
import { indexedDBManager, CachedExchangeRate } from '../../utils/indexedDB';
import { exchangeRatesService } from '../../services/exchangeRates';

// Типы для состояния
export interface ExchangeRatesState {
  // Основные данные
  rates: Record<string, ExchangeRate>; // key: "USD-2024-08-30"
  latestRates: Record<string, ExchangeRate>; // key: currency code
  chartData: Record<string, ChartDataPoint[]>; // key: "USD-from-to"
  
  // Метаданные кеша
  lastUpdate: string | null;
  cacheStatus: 'loading' | 'loaded' | 'error' | 'empty';
  
  // UI состояние
  isLoading: boolean;
  isUpdating: boolean; // для фонового обновления
  error: string | null;
  
  // Статистика
  totalCachedRates: number;
  lastSyncDate: string | null;
}

const initialState: ExchangeRatesState = {
  rates: {},
  latestRates: {},
  chartData: {},
  lastUpdate: null,
  cacheStatus: 'empty',
  isLoading: false,
  isUpdating: false,
  error: null,
  totalCachedRates: 0,
  lastSyncDate: null,
};

// Утилиты для ключей
const createRateKey = (currencyCode: string, date: string) => `${currencyCode}-${date}`;
const createChartKey = (currencyCode: string, fromDate: string, toDate: string) => 
  `${currencyCode}-${fromDate}-${toDate}`;

// Конвертация между форматами
const exchangeRateToCache = (rate: ExchangeRate): CachedExchangeRate => ({
  currencyCode: rate.currencyCode,
  rate: rate.rate,
  nominal: rate.nominal,
  date: rate.date,
  createdAt: rate.createdAt,
  updatedAt: rate.updatedAt,
});

const cacheToExchangeRate = (cached: CachedExchangeRate): ExchangeRate => ({
  id: cached.id?.toString() || '',
  currencyCode: cached.currencyCode,
  rate: cached.rate,
  nominal: cached.nominal,
  date: cached.date,
  createdAt: cached.createdAt,
  updatedAt: cached.updatedAt,
});

// Асинхронные действия

// Загрузка данных из IndexedDB в Redux
export const loadFromCache = createAsyncThunk(
  'exchangeRates/loadFromCache',
  async (currencyCode: string = 'USD') => {
    try {
      // Загружаем все курсы из кеша
      const cachedRates = await indexedDBManager.getAllRates(currencyCode);
      const latestRate = await indexedDBManager.getLatestRate(currencyCode);
      const lastUpdate = await indexedDBManager.getMetadata('lastUpdate');
      const lastSyncDate = await indexedDBManager.getMetadata('lastSyncDate');

      return {
        rates: cachedRates.map(cacheToExchangeRate),
        latestRate: latestRate ? cacheToExchangeRate(latestRate) : null,
        lastUpdate,
        lastSyncDate,
        totalCachedRates: cachedRates.length,
      };
    } catch (error) {
      console.error('Error loading from cache:', error);
      throw error;
    }
  }
);

// Обновление данных с API
export const updateFromAPI = createAsyncThunk(
  'exchangeRates/updateFromAPI',
  async (params: { 
    currencyCode?: string; 
    fromDate?: Date; 
    toDate?: Date;
    force?: boolean; // принудительное обновление
  } = {}) => {
    const { currencyCode = 'USD', fromDate, toDate, force = false } = params;
    
    try {
      // Проверяем, нужно ли обновление
      if (!force) {
        const lastUpdate = await indexedDBManager.getMetadata('lastUpdate');
        if (lastUpdate) {
          const lastUpdateDate = new Date(lastUpdate);
          const now = new Date();
          const diffHours = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
          
          // Если данные свежие (меньше часа), не обновляем
          if (diffHours < 1) {
            return null;
          }
        }
      }

      // Получаем свежие данные с API
      const response = await exchangeRatesService.getExchangeRates({
        currencyCode,
        fromDate,
        toDate,
      });

      // Сохраняем в IndexedDB
      if (response && response.data && response.data.length > 0) {
        const cachedRates = response.data.map(exchangeRateToCache);
        await indexedDBManager.saveRates(cachedRates);
        
        // Обновляем метаданные
        const now = new Date().toISOString();
        await indexedDBManager.setMetadata('lastUpdate', now);
        await indexedDBManager.setMetadata('lastSyncDate', now);
      }

      return {
        rates: response?.data || [],
        total: response?.total || 0,
        updateTime: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error updating from API:', error);
      throw error;
    }
  }
);

// Получение данных для графика (с кешированием)
export const loadChartData = createAsyncThunk(
  'exchangeRates/loadChartData',
  async (params: { 
    currencyCode: string; 
    fromDate: Date; 
    toDate: Date;
  }, { getState }) => {
    const { currencyCode, fromDate, toDate } = params;
    const state = getState() as { exchangeRates: ExchangeRatesState };
    
    const chartKey = createChartKey(
      currencyCode, 
      fromDate.toISOString().split('T')[0], 
      toDate.toISOString().split('T')[0]
    );

    // Проверяем кеш в Redux
    if (state.exchangeRates.chartData[chartKey]) {
      return {
        data: state.exchangeRates.chartData[chartKey],
        fromCache: true,
        chartKey,
      };
    }

    try {
      // Пытаемся загрузить из IndexedDB
      const cachedRates = await indexedDBManager.getRatesInRange(
        currencyCode,
        fromDate.toISOString().split('T')[0],
        toDate.toISOString().split('T')[0]
      );

      if (cachedRates.length > 0) {
        const chartData: ChartDataPoint[] = cachedRates.map(rate => ({
          date: rate.date,
          rate: rate.rate,
          nominal: rate.nominal,
          displayRate: rate.rate / rate.nominal,
        }));

        return {
          data: chartData,
          fromCache: true,
          chartKey,
        };
      }

      // Если в кеше нет данных, загружаем с API
      const response = await exchangeRatesService.getChartData(
        currencyCode,
        fromDate,
        toDate
      );

      return {
        data: response,
        fromCache: false,
        chartKey,
      };
    } catch (error) {
      console.error('Error loading chart data:', error);
      throw error;
    }
  }
);

// Быстрая конвертация валют (без API запросов)
export const convertCurrency = createAsyncThunk(
  'exchangeRates/convertCurrency',
  async (params: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    date?: string; // если не указана, используется последний курс
  }, { getState }) => {
    const { amount, fromCurrency, toCurrency, date } = params;
    const state = getState() as { exchangeRates: ExchangeRatesState };

    try {
      let rate: ExchangeRate | null = null;

      if (date) {
        // Ищем курс на конкретную дату
        const rateKey = createRateKey(fromCurrency, date);
        rate = state.exchangeRates.rates[rateKey] || null;
        
        console.log(`🔍 Ищем курс для ключа: ${rateKey}`, {
          found: !!rate,
          availableKeys: Object.keys(state.exchangeRates.rates).filter(k => k.includes(fromCurrency)),
          totalRates: Object.keys(state.exchangeRates.rates).length
        });
        
        // Если в Redux нет, ищем в IndexedDB
        if (!rate) {
          console.log(`💾 Fallback к IndexedDB для ${fromCurrency} на ${date}`);
          const cached = await indexedDBManager.getRateByDate(fromCurrency, date);
          rate = cached ? cacheToExchangeRate(cached) : null;
          console.log(`💾 IndexedDB результат:`, !!rate);
        }
      } else {
        // Используем последний курс
        rate = state.exchangeRates.latestRates[fromCurrency] || null;
        
        // Если в Redux нет, ищем в IndexedDB
        if (!rate) {
          const cached = await indexedDBManager.getLatestRate(fromCurrency);
          rate = cached ? cacheToExchangeRate(cached) : null;
        }
      }

      if (!rate) {
        // Последний fallback - попробуем найти любые данные USD и подгрузить недостающие
        console.log(`❌ Курс ${fromCurrency} не найден в кеше для даты ${date || 'latest'}`);
        
        // Попробуем подгрузить данные для этой даты с API
        if (date && fromCurrency === 'USD') {
          console.log(`🌐 Подгружаем данные с API для USD на ${date}`);
          try {
            const apiService = await import('../../services/exchangeRates');
            const result = await apiService.exchangeRatesService.getRateByDate('USD', new Date(date));
            if (result) {
              rate = result;
              console.log(`✅ Получен курс с API:`, rate);
            }
          } catch (apiError) {
            console.warn('API fallback failed:', apiError);
          }
        }
        
        if (!rate) {
          throw new Error(`Курс ${fromCurrency} не найден для даты ${date || 'latest'}`);
        }
      }

      const exchangeRate = rate.rate / rate.nominal;
      let result: number;

      if (fromCurrency === 'USD' && toCurrency === 'RUB') {
        result = amount * exchangeRate;
      } else if (fromCurrency === 'RUB' && toCurrency === 'USD') {
        result = amount / exchangeRate;
      } else {
        throw new Error(`Конвертация ${fromCurrency} -> ${toCurrency} не поддерживается`);
      }

      return {
        amount,
        fromCurrency,
        toCurrency,
        result,
        rate: exchangeRate,
        sourceRate: rate,
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw error;
    }
  }
);

// Очистка старого кеша
export const cleanOldCache = createAsyncThunk(
  'exchangeRates/cleanOldCache',
  async (daysToKeep: number = 365) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    await indexedDBManager.cleanOldRates(cutoffDate.toISOString().split('T')[0]);
    
    const cacheSize = await indexedDBManager.getCacheSize();
    return cacheSize;
  }
);

// Slice
const exchangeRatesSlice = createSlice({
  name: 'exchangeRates',
  initialState,
  reducers: {
    // Очистка ошибок
    clearError: (state) => {
      state.error = null;
    },
    
    // Установка статуса загрузки
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Добавление курса в состояние
    addRate: (state, action: PayloadAction<ExchangeRate>) => {
      const rate = action.payload;
      const key = createRateKey(rate.currencyCode, rate.date);
      state.rates[key] = rate;
      
      // ЭКСТРЕННЫЙ ФИКС: Очищаем latestRates полностью перед обновлением
      console.log(`🚨 addRate: ПОЛНОСТЬЮ ОБНОВЛЯЕМ ${rate.currencyCode}`, {
        newRate: rate,
        oldLatest: state.latestRates[rate.currencyCode],
        clearingLatestRates: true
      });
      
      // Очищаем старые данные для этой валюты
      delete state.latestRates[rate.currencyCode];
      
      // Добавляем новые данные
      state.latestRates[rate.currencyCode] = rate;
    },
    
    // Очистка кеша
    clearCache: (state) => {
      state.rates = {};
      state.latestRates = {};
      state.chartData = {};
      state.totalCachedRates = 0;
      state.lastUpdate = null;
      state.lastSyncDate = null;
      state.cacheStatus = 'empty';
    },
  },
  extraReducers: (builder) => {
    // loadFromCache
    builder
      .addCase(loadFromCache.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.cacheStatus = 'loading';
      })
      .addCase(loadFromCache.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cacheStatus = 'loaded';
        
        if (action.payload) {
          // Добавляем курсы в состояние
          action.payload.rates.forEach(rate => {
            const key = createRateKey(rate.currencyCode, rate.date);
            state.rates[key] = rate;
          });
          
          // Обновляем последний курс
          if (action.payload.latestRate) {
            state.latestRates[action.payload.latestRate.currencyCode] = action.payload.latestRate;
          }
          
          state.lastUpdate = action.payload.lastUpdate;
          state.lastSyncDate = action.payload.lastSyncDate;
          state.totalCachedRates = action.payload.totalCachedRates;
        }
      })
      .addCase(loadFromCache.rejected, (state, action) => {
        state.isLoading = false;
        state.cacheStatus = 'error';
        state.error = action.error.message || 'Ошибка загрузки кеша';
      });

    // updateFromAPI
    builder
      .addCase(updateFromAPI.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateFromAPI.fulfilled, (state, action) => {
        state.isUpdating = false;
        
        console.log('🚨 updateFromAPI.fulfilled - АНАЛИЗИРУЕМ ДАННЫЕ:', action.payload);
        
        if (action.payload) {
          // ФИКС: Анализируем что приходит и НЕ перезаписываем более свежие данные
          action.payload.rates.forEach(rate => {
            console.log(`📊 Анализируем курс: ${rate.date} = ${rate.rate}`);
            
            const key = createRateKey(rate.currencyCode, rate.date);
            
            // Проверяем есть ли уже более свежие данные
            const existingLatest = state.latestRates[rate.currencyCode];
            if (existingLatest && existingLatest.date > rate.date) {
              console.log(`⚠️ ПРОПУСКАЕМ СТАРЫЙ КУРС: ${rate.date} (есть более свежий ${existingLatest.date})`);
              return; // Пропускаем старые данные
            }
            
            state.rates[key] = rate;
            
            // Обновляем последний курс только если это действительно свежие данные
            const currentLatest = state.latestRates[rate.currencyCode];
            if (!currentLatest || rate.date > currentLatest.date) {
              console.log(`✅ ОБНОВЛЯЕМ ПОСЛЕДНИЙ КУРС: ${rate.date} = ${rate.rate}`);
              state.latestRates[rate.currencyCode] = rate;
            }
          });
          
          state.lastUpdate = action.payload.updateTime;
          state.lastSyncDate = action.payload.updateTime;
          state.totalCachedRates = Object.keys(state.rates).length;
        }
      })
      .addCase(updateFromAPI.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message || 'Ошибка обновления данных';
      });

    // loadChartData
    builder
      .addCase(loadChartData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadChartData.fulfilled, (state, action) => {
        state.isLoading = false;
        
        if (action.payload) {
          state.chartData[action.payload.chartKey] = action.payload.data;
        }
      })
      .addCase(loadChartData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Ошибка загрузки данных графика';
      });

    // convertCurrency
    builder
      .addCase(convertCurrency.rejected, (state, action) => {
        state.error = action.error.message || 'Ошибка конвертации валюты';
      });

    // cleanOldCache
    builder
      .addCase(cleanOldCache.fulfilled, (state, action) => {
        state.totalCachedRates = action.payload.ratesCount;
      });
  },
});

export const { clearError, setLoading, addRate, clearCache } = exchangeRatesSlice.actions;
export default exchangeRatesSlice.reducer;

// Селекторы
export const selectExchangeRates = (state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates;

// Мемоизированные селекторы для производительности
// ЭКСТРЕННЫЙ ФИКС: Убираем мемоизацию - она дает кэшированные данные!
export const selectLatestRate = (state: { exchangeRates: ExchangeRatesState }, currencyCode: string) => {
  // 🚀 ИСПОЛЬЗУЕМ ТОЧНО ТУ ЖЕ ЛОГИКУ КАК В convertCurrency!
  // Сначала пробуем latestRates (как в convertCurrency строка 252)
  let rate = state.exchangeRates.latestRates[currencyCode] || null;
  
  console.log(`🎯 selectLatestRate для ${currencyCode}:`, {
    fromLatestRates: rate,
    latestRatesKeys: Object.keys(state.exchangeRates.latestRates),
    totalRates: Object.keys(state.exchangeRates.rates).length
  });
  
  // Если нет в latestRates, ищем в rates (fallback как в convertCurrency)
  if (!rate) {
    console.log(`📊 Ищем в rates, нет в latestRates`);
    const currencyRates = Object.entries(state.exchangeRates.rates)
      .filter(([key]) => key.startsWith(`${currencyCode}-`))
      .map(([, rate]) => rate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    rate = currencyRates[0] || null;
    console.log(`📊 Найден в rates:`, rate);
  }
  
  console.log(`✅ ИТОГОВЫЙ РЕЗУЛЬТАТ selectLatestRate:`, rate);
  return rate;
};

export const selectRateByDate = createSelector(
  [
    (state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates.rates,
    (_: any, currencyCode: string, date: string) => createRateKey(currencyCode, date),
  ],
  (rates, key) => rates[key]
);

export const selectChartData = createSelector(
  [
    (state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates.chartData,
    (_: any, currencyCode: string, fromDate: string, toDate: string) => createChartKey(currencyCode, fromDate, toDate),
  ],
  (chartData, key) => chartData[key]
);

// Мемоизированный селектор для статуса кеша
export const selectCacheStatus = createSelector(
  [(state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates],
  (exchangeRates) => ({
    status: exchangeRates.cacheStatus,
    totalRates: exchangeRates.totalCachedRates,
    lastUpdate: exchangeRates.lastUpdate,
    lastSync: exchangeRates.lastSyncDate,
    isLoading: exchangeRates.isLoading,
    isUpdating: exchangeRates.isUpdating,
  })
);
