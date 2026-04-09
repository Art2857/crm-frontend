'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { CurrencyConversion } from '../../types/exchange-rates';
import { exchangeRatesService } from '../../services/exchangeRates';
import { exchangeRateCacheService } from '../../services/exchangeRateCache';
import { indexedDBManager } from '../../utils/indexedDB';
import { logger } from '../../utils/logger';
import { useAppSelector } from '../../store';
import { selectLatestRate } from '../../store/slices/exchangeRates';

interface CurrencyConverterProps {
  currencies: string[];
}

// Утилиты для работы с рабочими днями ЦБР (вынесены наружу для стабильности)
const isWorkingDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник

  // Исключаем выходные ЦБ РФ (воскресенье и понедельник)
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    return false;
  }

  // TODO: Здесь можно добавить исключение российских праздников
  // Для простоты пока проверяем только выходные
  return true;
};

const getLastWorkingDay = (): Date => {
  const today = new Date();

  // Ищем последний рабочий день от сегодня назад
  let current = new Date(today);
  for (let i = 0; i < 30; i++) {
    // Расширяем поиск до 30 дней
    if (isWorkingDay(current)) {
      return current;
    }
    current.setDate(current.getDate() - 1);
  }

  // Fallback на сегодня если ничего не нашли
  return today;
};

const CurrencyConverterLegacy = memo(function CurrencyConverterLegacy({
  currencies,
}: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('RUB');
  const [amount, setAmount] = useState<string>('100');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Инициализируем последним рабочим днем от сегодня
    return getLastWorkingDay().toISOString().split('T')[0];
  });
  const [result, setResult] = useState<number | null>(null);

  // Курс USD/RUB из IndexedDB
  const [usdToRubRate, setUsdToRubRate] = useState<any>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrencyValue = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }, []);

  const handleConvert = useCallback(
    async (inputAmount: string) => {
      const numAmount = parseFloat(inputAmount);

      if (isNaN(numAmount) || numAmount <= 0) {
        setResult(null);
        setRate(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Используем быструю конвертацию из кеша с учетом выбранной даты
        const conversion = await exchangeRateCacheService.convertCurrencyFast(
          numAmount,
          fromCurrency,
          toCurrency,
          selectedDate
        );

        setResult(conversion.result);
        setRate(conversion.rate);
      } catch (error: any) {
        // Игнорируем отмененные запросы - это нормально при быстром переключении
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          return; // Просто выходим, не показываем ошибку
        }

        logger.error('Error converting currency', error);
        // Более мягкая обработка - не показываем ошибку если это начальная загрузка без пользовательского ввода
        if (numAmount > 0) {
          setError('Не удалось получить курс для выбранной даты');
        }
        setResult(null);
        setRate(null);
      } finally {
        setIsLoading(false);
      }
    },
    [fromCurrency, selectedDate, toCurrency]
  );

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setResult(null);
    setRate(null);
    setError(null);
  };

  // Загружаем последний курс USD НАПРЯМУЮ ИЗ IndexedDB!
  useEffect(() => {
    const loadLatestUsdRate = async () => {
      try {
        const rate = await indexedDBManager.getLatestRate('USD');
        logger.debug('Получили последний курс USD из IndexedDB', rate);
        if (rate) {
          setUsdToRubRate(rate);
        }
      } catch (error) {
        logger.error('Ошибка загрузки курса USD', error);
      }
    };

    loadLatestUsdRate();
  }, []);

  // Подписываемся на обновление курса в Redux (если он придет позже или обновится)
  const latestRate = useAppSelector((state) => selectLatestRate(state, 'USD'));

  useEffect(() => {
    if (latestRate) {
      logger.debug('Redux обновил курс USD', latestRate);
      setUsdToRubRate(latestRate);
    }
  }, [latestRate]);

  // Конвертация при изменении суммы, валют или даты с небольшим debounce,
  // чтобы избежать двойных вызовов в React StrictMode и лишних запросов
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const timer = setTimeout(() => {
        handleConvert(amount);
      }, 250);

      return () => clearTimeout(timer);
    } else {
      setResult(null);
      setRate(null);
      setError(null);
    }
  }, [amount, fromCurrency, toCurrency, selectedDate, handleConvert]);

  // Мемоизированные функции и значения для оптимизации
  const getCurrencySymbol = useCallback((currency: string) => {
    return currency === 'USD' ? '$' : '₽';
  }, []);

  const formatCurrency = useCallback((value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  }, []);

  // Мемоизируем обработчики для предотвращения пере-рендеров
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Разрешаем только числа и точку
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setAmount(value);
      }
    },
    []
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedDate(e.target.value);
    },
    []
  );

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 border border-gray-200 rounded-xl shadow-lg">
      <div className="p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          {/* Левая часть - информация о курсе */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Курс доллара США
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-4 mb-4">
              <span className="text-lg text-gray-600">USD/RUB</span>
              {usdToRubRate && (
                <>
                  <span className="text-gray-400 hidden sm:inline">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold text-green-600">
                      {formatCurrencyValue(
                        usdToRubRate.rate / usdToRubRate.nominal
                      )}
                    </span>
                    <span className="text-xl text-green-600 font-medium">
                      ₽
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Официальный курс Центрального банка России
              <br />
              {
                usdToRubRate?.date
                  ? (() => {
                      try {
                        // Парсинг даты в формате DD.MM.YYYY
                        const dateStr = usdToRubRate.date;
                        let date: Date;

                        // Если дата в формате DD.MM.YYYY - конвертируем
                        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
                          const [day, month, year] = dateStr.split('.');
                          date = new Date(
                            parseInt(year),
                            parseInt(month) - 1,
                            parseInt(day)
                          );
                        } else {
                          // Иначе пробуем обычный парсинг
                          date = new Date(dateStr);
                        }

                        // Проверяем валидность даты
                        if (isNaN(date.getTime())) {
                          console.warn(
                            'Invalid date in usdToRubRate:',
                            dateStr
                          );
                          return `Курс за ${getLastWorkingDay().toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' })}`;
                        }

                        return `Курс за ${date.toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}`;
                      } catch (error) {
                        console.error('Error parsing date:', error);
                        return `Курс за ${getLastWorkingDay().toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' })}`; // Fallback
                      }
                    })()
                  : `Курс за ${getLastWorkingDay().toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' })}` // Fallback если нет данных
              }
            </p>
          </div>

          {/* Правая часть - конвертер */}
          <div className="flex-1 w-full lg:max-w-lg">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">
                Конвертер валют
              </h2>

              {/* Основная линия конвертации */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-4">
                {/* Блок ввода */}
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="100"
                    className="w-32 text-center text-lg font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="off"
                  />
                  <span className="text-lg font-bold text-blue-600">
                    {getCurrencySymbol(fromCurrency)} {fromCurrency}
                  </span>
                </div>

                {/* Средняя колонка - переключение валют и дата */}
                <div className="flex flex-col items-center gap-3">
                  {/* Кнопка переключения */}
                  <Button
                    variant="outline"
                    onClick={handleSwapCurrencies}
                    className="w-12 h-12 rounded-full p-0 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex-shrink-0"
                    title="Поменять направление конвертации"
                  >
                    <span className="text-lg">⇄</span>
                  </Button>

                  {/* Выбор даты - минимально */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      max={getLastWorkingDay().toISOString().split('T')[0]}
                      min="2020-01-01"
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      title="Дата курса (только рабочие дни)"
                      onInput={(e) => {
                        // Дополнительная валидация на стороне клиента
                        const input = e.target as HTMLInputElement;
                        const inputDate = new Date(input.value);
                        if (!isWorkingDay(inputDate)) {
                          input.setCustomValidity(
                            'Выберите рабочий день (вторник-суббота)'
                          );
                        } else {
                          input.setCustomValidity('');
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Блок результата */}
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  {isLoading ? (
                    <div className="flex items-center gap-2 h-8">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-gray-500 text-sm">Загрузка...</span>
                    </div>
                  ) : result !== null ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(result)}
                      </div>
                      <div className="text-lg font-medium text-green-600">
                        {getCurrencySymbol(toCurrency)} {toCurrency}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">—</div>
                      <div className="text-lg font-medium text-gray-400">
                        {getCurrencySymbol(toCurrency)} {toCurrency}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Дополнительная информация о курсе */}
              {rate && !error && (
                <div className="text-center text-sm text-gray-600">
                  Курс на {selectedDate}
                  {!isWorkingDay(new Date(selectedDate)) && (
                    <span className="text-orange-500 ml-1">
                      (выходной, показан ближайший)
                    </span>
                  )}
                  :{' '}
                  <span className="font-medium">
                    1 {fromCurrency} = {formatCurrency(rate)} {toCurrency}
                  </span>
                </div>
              )}

              {/* Ошибка */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { CurrencyConverterLegacy as CurrencyConverter };
export default CurrencyConverterLegacy;
