'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ExchangeRateChart } from '../../components/exchange-rates/ExchangeRateChart';
import { CurrencyConverter } from '../../components/exchange-rates/CurrencyConverter';
import { useExchangeRates } from '../../hooks/exchange-rates/useExchangeRates';

// Функция для поиска последнего рабочего дня (ЦБ публикует вт-сб, выходные вс-пн)
const getLastWorkingDay = (date: Date): Date => {
  // Ищем последний рабочий день от указанной даты назад
  let current = new Date(date);
  for (let i = 0; i < 30; i++) {
    const dayOfWeek = current.getDay();
    // Рабочие дни ЦБ РФ: вторник-суббота (2-6), выходные воскресенье-понедельник (0,1)
    if (dayOfWeek >= 2 && dayOfWeek <= 6) {
      return current;
    }
    current.setDate(current.getDate() - 1);
  }

  // Fallback на саму указанную дату
  return date;
};

export default function ExchangeRatesPage() {
  // Зафиксируем на USD/RUB - единственной доступной валютной паре
  const selectedCurrency = 'USD';
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const today = new Date();
    const to = getLastWorkingDay(today);
    const from = new Date(to);
    from.setMonth(from.getMonth() - 1); // 1 месяц назад по умолчанию
    return { from, to };
  });
  const [chartStats, setChartStats] = useState<{
    min: number;
    max: number;
    avg: number;
    change: number;
    changePercent: number;
  } | null>(null);

  const {
    chartData,
    latestRates,
    isLoading,
    error,
    getCurrencyStats,
    loadChartData,
    loadLatestRates,
  } = useExchangeRates();

  useEffect(() => {
    loadLatestRates();
    // Сразу загружаем данные для USD
    loadChartData(selectedCurrency, dateRange.from, dateRange.to);
  }, [loadLatestRates, loadChartData, selectedCurrency, dateRange]);

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  const setPresetRange = (period: number) => {
    const today = new Date();
    let to = new Date(today);
    let from = new Date(today);

    // Используем последний рабочий день от сегодня
    to = getLastWorkingDay(new Date());

    switch (period) {
      case 7: // 7 дней назад
        from = new Date(to);
        from.setDate(from.getDate() - 6); // 7 дней включая текущий
        break;

      case 30: // 1 месяц назад
        from = new Date(to);
        from.setMonth(from.getMonth() - 1); // Ровно 1 месяц
        break;

      case 90: // 3 месяца назад
        from = new Date(to);
        from.setMonth(from.getMonth() - 3); // Ровно 3 месяца
        break;

      case 365: // 1 год назад
        from = new Date(to);
        from.setFullYear(from.getFullYear() - 1); // Ровно 1 год
        break;

      default:
        // Fallback: используем дни
        from = new Date(to.getTime() - period * 24 * 60 * 60 * 1000);
    }

    setDateRange({ from, to });
  };

  // Функция для обработки статистики графика
  const handleStatsCalculated = useCallback(
    (stats: {
      min: number;
      max: number;
      avg: number;
      change: number;
      changePercent: number;
    }) => {
      setChartStats(stats);
    },
    []
  );

  // Форматирование значений для отображения
  const formatValue = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <h3 className="text-red-800 font-medium">Ошибка загрузки данных</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button
              onClick={() => {
                loadLatestRates();
                loadChartData(selectedCurrency, dateRange.from, dateRange.to);
              }}
              className="mt-3"
            >
              Попробовать снова
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Конвертер валют */}
      <CurrencyConverter currencies={['USD']} />

      {/* График */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-4">
            <div className="flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                График курса {selectedCurrency}/RUB
              </h2>
              <div className="text-sm text-gray-500">
                {dateRange.from.toLocaleDateString('ru-RU')} -{' '}
                {dateRange.to.toLocaleDateString('ru-RU')}
              </div>
            </div>

            {/* Статистика по центру */}
            {chartStats && (
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-500">Мин.</div>
                  <div className="font-medium">
                    {formatValue(chartStats.min)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Макс.</div>
                  <div className="font-medium">
                    {formatValue(chartStats.max)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Среднее</div>
                  <div className="font-medium">
                    {formatValue(chartStats.avg)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500">Изменение</div>
                  <div
                    className={`font-medium ${chartStats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {chartStats.change >= 0 ? '+' : ''}
                    {formatValue(chartStats.change)} (
                    {chartStats.changePercent >= 0 ? '+' : ''}
                    {chartStats.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(7)}
              >
                7 дней
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(30)}
              >
                1 месяц
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(90)}
              >
                3 месяца
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange(365)}
              >
                1 год
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ExchangeRateChart
              data={chartData}
              currency={selectedCurrency}
              dateRange={dateRange}
              onStatsCalculated={handleStatsCalculated}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
