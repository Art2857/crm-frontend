'use client';

import { useMemo, useCallback, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { ChartDataPoint } from '../../types/exchange-rates';
import { parseDate, isValidDate } from '../../utils/dateHelpers';

interface ExchangeRateChartProps {
  data: ChartDataPoint[];
  currency: string;
  dateRange: { from: Date; to: Date };
  height?: number;
  onStatsCalculated?: (stats: {
    min: number;
    max: number;
    avg: number;
    change: number;
    changePercent: number;
  }) => void;
}

export function ExchangeRateChart({
  data,
  currency,
  dateRange,
  height = 400,
  onStatsCalculated,
}: ExchangeRateChartProps) {
  // Подготовка данных для графика
  const chartData = useMemo(() => {
    return data
      .map((point) => {
        const parsedDate = parseDate(point.date);
        const validDate = parsedDate || new Date(0);

        return {
          ...point,
          date: parsedDate
            ? parsedDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: data.length > 180 ? '2-digit' : undefined, // Показываем год только для длинных периодов
              })
            : 'Неизвестно',
          fullDate: validDate,
          displayRate: point.displayRate || point.rate / point.nominal,
        };
      })
      .filter((point) => point.fullDate.getTime() > 0) // убираем невалидные даты
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  }, [data]);

  // Расчет статистики
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { min: 0, max: 0, avg: 0, change: 0, changePercent: 0 };
    }

    const rates = chartData.map((d) => d.displayRate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    const firstRate = rates[0];
    const lastRate = rates[rates.length - 1];
    const change = lastRate - firstRate;
    const changePercent = firstRate !== 0 ? (change / firstRate) * 100 : 0;

    return { min, max, avg, change, changePercent };
  }, [chartData]);

  // Передаём статистику родительскому компоненту
  useEffect(() => {
    if (onStatsCalculated) {
      onStatsCalculated(stats);
    }
  }, [stats, onStatsCalculated]);

  // Форматирование значений для отображения
  const formatValue = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }, []);

  // Кастомный tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-blue-600">
            <span className="font-medium">{currency}/RUB:</span> {formatValue(data.displayRate)}
          </p>
          <p className="text-gray-500 text-sm">
            Номинал: {data.nominal} {currency}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📈</div>
          <p className="text-gray-500">Нет данных для отображения</p>
          <p className="text-gray-400 text-sm">Выберите другой период или валюту</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            fontSize={12}
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tick={{ fontSize: 12 }}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="displayRate"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#colorRate)"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
