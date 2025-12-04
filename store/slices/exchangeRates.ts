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

      // Поддерживаем только конвертации USD<->RUB, используем курс USD как базовый
      if (!((fromCurrency === 'USD' && toCurrency === 'RUB') || (fromCurrency === 'RUB' && toCurrency === 'USD'))) {
        throw new Error(`Конвертация ${fromCurrency} -> ${toCurrency} не поддерживается`);
      }

      const rateCurrency = 'USD';
      const normalizedDate = date ? new Date(date).toISOString().split('T')[0] : undefined;

      if (normalizedDate) {
        // Ищем курс на конкретную дату
        const rateKey = createRateKey(rateCurrency, normalizedDate);
        rate = state.exchangeRates.rates[rateKey] || null;

        if (!rate) {
          const cached = await indexedDBManager.getSmartRateByDate(rateCurrency, normalizedDate);
          rate = cached ? cacheToExchangeRate(cached) : null;
        }
      } else {
        // Просто ищем последний курс через IndexedDB (динамически!)
        const cached = await indexedDBManager.getLatestRate(rateCurrency);
        rate = cached ? cacheToExchangeRate(cached) : null;
        
        console.log('🔍 Получили из IndexedDB последний курс:', rate);
      }

      if (!rate) {
        // Попробуем подгрузить данные для этой даты с API (только для USD)
        if (normalizedDate) {
          try {
            const apiService = await import('../../services/exchangeRates');
            const result = await apiService.exchangeRatesService.getRateByDate('USD', new Date(normalizedDate));
            if (result) {
              rate = result as ExchangeRate;
            }
          } catch (apiError) {
            console.warn('API fallback failed:', apiError);
          }
        }

        if (!rate) {
          throw new Error(`Курс USD не найден для даты ${normalizedDate || 'latest'}`);
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

// Новая функция: умная загрузка недостающих данных
export const smartLoadMissingData = createAsyncThunk(
  'exchangeRates/smartLoadMissingData',
  async (params: { 
    currencyCode?: string;
    checkDaysBack?: number; // на сколько дней назад проверять
  } = {}) => {
    const { currencyCode = 'USD', checkDaysBack = 60 } = params;
    
    try {
      // Проверяем какие данные у нас есть (принудительно используем правильную функцию)
      console.log(`🔎 smartLoadMissingData: Проверяем последний курс для ${currencyCode}`);
      const latestRate = await indexedDBManager.getLatestRate(currencyCode);
      console.log(`📋 Получили последний курс:`, latestRate);
      
      const today = new Date();
      let needsUpdate = true;
      
      if (latestRate) {
        // ПАРСИМ ДАТУ В ФОРМАТЕ DD.MM.YYYY ПРАВИЛЬНО!
        let latestDate: Date;
        const dateStr = latestRate.date;
        
        if (dateStr.includes('.')) {
          // Формат DD.MM.YYYY
          const [day, month, year] = dateStr.split('.');
          latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          // Формат ISO
          latestDate = new Date(dateStr);
        }
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // ПРОВЕРЯЕМ НА РАБОЧИе ДНИ! Не просто 3 дня!
        console.log(`📅 Последние данные: ${latestRate.date} (парсинг: ${latestDate.toISOString().split('T')[0]}), разница дней: ${diffDays}`);
        
        // Проверяем есть ли рабочие дни между последними данными и сегодня
        let hasWorkingDaysBetween = false;
        const checkDate = new Date(latestDate);
        checkDate.setDate(checkDate.getDate() + 1); // Начинаем со следующего дня
        
        console.log(`🔍 Проверяем дни с ${checkDate.toISOString().split('T')[0]} по ${today.toISOString().split('T')[0]}`);
        
        while (checkDate <= today) {
          const dayOfWeek = checkDate.getDay();
          const dayName = ['VOSKR', 'PONED', 'VTOR', 'SREDA', 'CHETV', 'PYATN', 'SUBBOT'][dayOfWeek];
          
          console.log(`📅 Проверяем ${checkDate.toISOString().split('T')[0]} (${dayName}, dayOfWeek=${dayOfWeek})`);
          
          // Рабочие дни ЦБ РФ: вт-сб (2-6), ИСКЛЮЧАЕМ вс-пн (0,1)
          if (dayOfWeek >= 2 && dayOfWeek <= 6) {
            hasWorkingDaysBetween = true;
            console.log(`📈 НАШЛИ рабочий день без данных: ${checkDate.toISOString().split('T')[0]} (${dayName})`);
            break;
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        
        if (!hasWorkingDaysBetween) {
          needsUpdate = false;
          console.log('✅ Нет рабочих дней для обновления');
        } else {
          console.log(`🚀 НУЖНО ОБНОВЛЕНИЕ! Есть рабочие дни без данных`);
        }
      }
      
      if (!needsUpdate) {
        console.log(`✅ smartLoadMissingData: Данные актуальны для ${currencyCode}`);
        console.log(`📅 smartLoadMissingData: Последняя дата: ${latestRate?.date}`);
        return {
          message: 'Данные актуальны',
          latestDate: latestRate?.date,
          loaded: 0
        };
      }
      
      // Загружаем недостающие данные с API (ПОСЛЕДНИЕ 60 ДНЕЙ!)
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 60); // Увеличиваем до 60 дней назад
      
      console.log(`🚀 Загружаем данные с ${fromDate.toISOString().split('T')[0]} по ${today.toISOString().split('T')[0]}`);
      console.log(`📡 Параметры API запроса:`, {
        currencyCode,
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: today.toISOString().split('T')[0]
      });
      
      // ОТЛАДКА: покажем какие дни должны быть рабочими по логике ЦБ РФ
      console.log('🏦 Ожидаемые рабочие дни ЦБ РФ в запрашиваемом диапазоне:');
      const expectedWorkingDays = [];
      const checkFrom = new Date('2025-08-20'); // Проверим последние дни августа
      const checkTo = new Date('2025-08-31');
      
      for (let d = new Date(checkFrom); d <= checkTo; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const isWorkingCBR = dayOfWeek >= 2 && dayOfWeek <= 6; // вт-сб
        const dateStr = d.toISOString().split('T')[0];
        const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        
        console.log(`   ${dateStr} (${dayNames[dayOfWeek]}): ${isWorkingCBR ? '✅ Должен быть' : '❌ Выходной'}`);
        if (isWorkingCBR) expectedWorkingDays.push(dateStr);
      }
      console.log(`🎯 Итого ожидается ${expectedWorkingDays.length} рабочих дней:`, expectedWorkingDays);
      
      let response;
      try {
        response = await exchangeRatesService.getExchangeRates({
          currencyCode,
          fromDate,
          toDate: today,
        });
        console.log('📈 Ответ API:', response);
        console.log('📊 Количество записей:', response?.data?.length);
        console.log('📅 Первые 10 дат из API:', response?.data?.slice(0, 10).map(r => r.date));
        
        // Проверим какие рабочие дни ЦБ РФ пропущены в ответе
        if (response?.data) {
          const receivedDates = response.data.map(r => {
            // Конвертируем DD.MM.YYYY в YYYY-MM-DD для сравнения
            const [day, month, year] = r.date.split('.');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          });
          
          console.log('📋 Полученные даты в ISO формате:', receivedDates.slice(0, 10));
          
          const missingWorkingDays = expectedWorkingDays.filter(expected => !receivedDates.includes(expected));
          if (missingWorkingDays.length > 0) {
            console.warn('⚠️ ПРОПУЩЕНЫ рабочие дни ЦБ РФ:', missingWorkingDays);
            
            // Проверим конкретно 23.08.2025
            if (missingWorkingDays.includes('2025-08-23')) {
              console.error('🚨 КРИТИЧНО: 23.08.2025 (суббота) отсутствует в ответе API!');
              console.error('🏦 По логике ЦБ РФ суббота должна быть рабочим днем!');
            }
          } else {
            console.log('✅ Все ожидаемые рабочие дни получены с API');
          }
        }
      } catch (apiError) {
        console.error('❌ Ошибка API:', apiError);
        throw apiError;
      }
      
      if (response && response.data && response.data.length > 0) {
        // Сохраняем в IndexedDB
        const cachedRates = response.data.map(exchangeRateToCache);
        await indexedDBManager.saveRates(cachedRates);
        
        // Обновляем метаданные
        const now = new Date().toISOString();
        await indexedDBManager.setMetadata('lastUpdate', now);
        await indexedDBManager.setMetadata('lastSyncDate', now);
        
        // Находим МАКСИМАЛЬНУЮ дату среди загруженных данных через рефакторенные утилиты
        const dates = response.data.map(rate => rate.date);
        const sortedDates = dates.sort((a, b) => {
          // Правильное сравнение дат DD.MM.YYYY
          const [dayA, monthA, yearA] = a.split('.').map(Number);
          const [dayB, monthB, yearB] = b.split('.').map(Number);
          
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          
          return dateB.getTime() - dateA.getTime(); // Убывание (новые сначала)
        });
        
        const maxDate = sortedDates[0] || '';
        
        console.log(`📊 smartLoadMissingData: Загружено ${response.data.length} курсов`);
        console.log(`📅 smartLoadMissingData: Максимальная дата среди загруженных: ${maxDate}`);
        console.log(`🗂️ smartLoadMissingData: Все загруженные даты:`, sortedDates.slice(0, 5));
        
        return {
          message: 'Данные обновлены',
          rates: response.data,
          loaded: response.data.length,
          latestDate: maxDate
        };
      }
      
      return {
        message: 'Новых данных нет',
        loaded: 0
      };
    } catch (error) {
      console.error('Error in smartLoadMissingData:', error);
      throw error;
    }
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
        

        
        if (action.payload) {
          // ФИКС: Анализируем что приходит и НЕ перезаписываем более свежие данные
          action.payload.rates.forEach(rate => {

            
            const key = createRateKey(rate.currencyCode, rate.date);
            
            // Проверяем есть ли уже более свежие данные
            const existingLatest = state.latestRates[rate.currencyCode];
            if (existingLatest && existingLatest.date > rate.date) {

              return; // Пропускаем старые данные
            }
            
            state.rates[key] = rate;
            
            // Обновляем последний курс только если это действительно свежие данные
            const currentLatest = state.latestRates[rate.currencyCode];
            if (!currentLatest || rate.date > currentLatest.date) {

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

    // smartLoadMissingData
    builder
      .addCase(smartLoadMissingData.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(smartLoadMissingData.fulfilled, (state, action) => {
        state.isUpdating = false;
        
        if (action.payload && action.payload.rates) {
          // Добавляем новые курсы
          action.payload.rates.forEach(rate => {
            const key = createRateKey(rate.currencyCode, rate.date);
            state.rates[key] = rate;
            
            // НЕ обновляем latestRates - сравнение строк дат DD.MM.YYYY не работает!
            // IndexedDB всегда даст правильный последний курс
          });
          
          state.lastUpdate = new Date().toISOString();
          state.lastSyncDate = new Date().toISOString();
          state.totalCachedRates = Object.keys(state.rates).length;
        }
      })
      .addCase(smartLoadMissingData.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.error.message || 'Ошибка загрузки недостающих данных';
      });
  },
});

export const { clearError, setLoading, addRate, clearCache } = exchangeRatesSlice.actions;
export default exchangeRatesSlice.reducer;

// Селекторы
export const selectExchangeRates = (state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates;

// Селектор последнего курса - ИДЕМ В IndexedDB!
export const selectLatestRate = createSelector(
  [
    (state: { exchangeRates: ExchangeRatesState }) => state.exchangeRates.latestRates,
    (_: any, currencyCode: string) => currencyCode,
  ],
  (latestRates, currencyCode) => {
    // НЕ полагаемся на latestRates - они могут быть старыми!
    // Возвращаем null - компонент пойдет в IndexedDB
    return null;
  }
);

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
