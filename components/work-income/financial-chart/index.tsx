import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { WorkIncome } from '../../../types/work-income';
import { Payment } from '../../../types/payment';
import { DistributionWithDetails } from '../../../types/duty';
import { formatAmountWithCurrency } from '../../../utils/currency';

import { CustomTooltip } from './CustomTooltip';
import { CustomAxisTick, CenteredBar } from './ChartElements';
import { useFinancialChartData } from './useFinancialChartData';

export interface FinancialHistoryChartProps {
  incomes: WorkIncome[];
  payments: Payment[];
  workCurrency: 'RUB' | 'USD';
  workReleaseDate?: string | null;
  totalWorkBudget?: number;
  distributions?: DistributionWithDetails[];
}

const FinancialHistoryChart: React.FC<FinancialHistoryChartProps> = ({
  incomes,
  payments,
  workCurrency,
  workReleaseDate,
  totalWorkBudget,
  distributions,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredType, setHoveredType] = useState<
    'income' | 'expense' | 'planned' | 'budget' | null
  >(null);

  const { chartData, totalIncome } = useFinancialChartData(
    incomes,
    payments,
    workCurrency,
    workReleaseDate,
    totalWorkBudget,
    distributions
  );

  const {
    xDomain,
    containerWidth,
    ticks,
    monthSeparators,
    yDomain,
    normalizedReleaseDate,
  } = useMemo(() => {
    if (chartData.length === 0)
      return {
        xDomain: ['auto', 'auto'],
        containerWidth: '100%',
        ticks: [],
        monthSeparators: [],
        yDomain: ['auto', 'auto'],
        normalizedReleaseDate: null,
      };

    const minDate = chartData[0].date;
    const maxDate = chartData[chartData.length - 1].date;

    const budgetVal =
      totalWorkBudget !== undefined ? totalWorkBudget : totalIncome;

    let maxY = budgetVal;
    let minY = 0;

    chartData.forEach((d) => {
      if (d.incomeValue) {
        if (d.incomeValue[1] > maxY) maxY = d.incomeValue[1];
      }
      if (d.expenseValue) {
        if (d.expenseValue[1] < minY) minY = d.expenseValue[1];
      }
      if (d.plannedExpense !== null && d.plannedExpense < minY) {
        minY = d.plannedExpense;
      }
    });

    const yPadding = (maxY - minY) * 0.1;
    const finalYDomain = [minY - yPadding, maxY + yPadding];

    const padding = 5 * 24 * 3600 * 1000;
    const xMin = minDate - padding;
    const xMax = maxDate + padding;

    const ticksList: number[] = [];
    const separators: number[] = [];
    const startD = new Date(xMin);
    startD.setDate(1);
    startD.setHours(12, 0, 0, 0);

    while (startD.getTime() <= xMax + padding) {
      const t = startD.getTime();
      if (t >= xMin && t <= xMax) {
        ticksList.push(t);
      }
      separators.push(t);
      startD.setMonth(startD.getMonth() + 1);
    }

    const days = (xMax - xMin) / (24 * 3600 * 1000);
    const widthPx = Math.max(0, days * 12);

    let normReleaseDate = null;
    if (workReleaseDate) {
      const r = new Date(workReleaseDate);
      r.setHours(12, 0, 0, 0);
      normReleaseDate = r.getTime();
    }

    return {
      xDomain: [xMin, xMax],
      ticks: ticksList,
      monthSeparators: separators,
      containerWidth: widthPx,
      yDomain: finalYDomain,
      normalizedReleaseDate: normReleaseDate,
    };
  }, [chartData, totalWorkBudget, totalIncome, workReleaseDate]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, [chartData, containerWidth]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY * 2;
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const budgetDisplay =
    totalWorkBudget !== undefined ? totalWorkBudget : totalIncome;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden p-4">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db; 
        }
      `}</style>
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto pb-2 custom-scrollbar"
      >
        <div
          style={{
            minWidth: '100%',
            width:
              typeof containerWidth === 'number'
                ? `${containerWidth}px`
                : containerWidth,
            height: '500px',
          }}
          className="p-4"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis
                xAxisId={0}
                dataKey="date"
                type="number"
                domain={xDomain}
                ticks={ticks}
                stroke="#9CA3AF"
                tick={<CustomAxisTick />}
                tickLine={false}
                interval={0}
              />
              <XAxis
                xAxisId={1}
                dataKey="date"
                type="number"
                domain={xDomain}
                ticks={ticks}
                hide
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                domain={yDomain}
                tickFormatter={(val) =>
                  Math.abs(val) >= 1000 ? `${val / 1000}k` : `${val}`
                }
              />
              <Tooltip
                content={
                  <CustomTooltip
                    workCurrency={workCurrency}
                    hoveredType={hoveredType}
                  />
                }
                cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
              />

              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={1} />

              {monthSeparators.map((ts) => (
                <ReferenceLine
                  key={ts}
                  x={ts}
                  stroke="#E5E7EB"
                  strokeDasharray="3 3"
                />
              ))}

              {workReleaseDate && normalizedReleaseDate && (
                <ReferenceLine
                  x={normalizedReleaseDate}
                  stroke="#F59E0B"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Релиз',
                    position: 'top',
                    fill: '#D97706',
                    fontSize: 12,
                  }}
                />
              )}

              {/* Фон для зон предупреждений */}
              {(() => {
                const zones = [];
                // Сортировка разделителей на всякий случай
                const sortedSeparators = [...monthSeparators].sort(
                  (a, b) => a - b
                );

                for (let i = 0; i < sortedSeparators.length - 1; i++) {
                  const start = sortedSeparators[i];
                  const end = sortedSeparators[i + 1];

                  // Проверка, нарушает ли какая-либо точка данных в этом диапазоне лимиты
                  const hasViolation = chartData.some((d) => {
                    if (d.date < start || d.date >= end) return false;

                    // Проверка Доход < Бюджет
                    if (
                      d.incomeValue &&
                      d.budget !== undefined &&
                      d.incomeValue[1] < d.budget
                    ) {
                      return true;
                    }

                    // Проверка Расход < Планируемого (более отрицательный, чем планируемый)
                    // expenseValue это [конец, начало]. конец это низ (более отрицательный).
                    // plannedExpense отрицательный.
                    if (
                      d.expenseValue &&
                      d.plannedExpense !== null &&
                      d.expenseValue[0] < d.plannedExpense
                    ) {
                      return true;
                    }

                    return false;
                  });

                  if (hasViolation) {
                    zones.push(
                      <ReferenceArea
                        key={`alert-${start}`}
                        x1={start}
                        x2={end}
                        fill="rgba(254, 202, 202, 0.3)"
                      />
                    );
                  }
                }
                return zones;
              })()}

              <Line
                type="monotone"
                dataKey="budget"
                stroke="rgba(5, 150, 105, 0.7)"
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: 'rgba(5, 150, 105, 0.7)' }}
                strokeWidth={1}
                onMouseEnter={() => setHoveredType('budget')}
                onMouseLeave={() => setHoveredType(null)}
              />

              <ReferenceLine
                y={budgetDisplay}
                stroke="transparent"
                label={{
                  value: `Бюджет`,
                  position: 'insideTopLeft',
                  fill: 'rgba(5, 150, 105, 0.7)',
                  fontSize: 12,
                  dy: -10,
                }}
              />

              {(() => {
                const firstPlannedPoint = chartData.find(
                  (d) => d.plannedExpense !== null
                );
                if (firstPlannedPoint) {
                  return (
                    <ReferenceDot
                      x={firstPlannedPoint.date}
                      y={firstPlannedPoint.plannedExpense}
                      r={0}
                      label={{
                        value: 'Выплаты',
                        position: 'left',
                        fill: '#FCA5A5',
                        fontSize: 12,
                      }}
                    />
                  );
                }
                return null;
              })()}

              <Line
                type="stepAfter"
                dataKey="plannedExpense"
                stroke="#FCA5A5"
                strokeDasharray="3 3"
                dot={false}
                strokeWidth={2}
                activeDot={{
                  r: 4,
                }}
                onMouseEnter={() => setHoveredType('planned')}
                onMouseLeave={() => setHoveredType(null)}
              />

              {monthSeparators.map((ts) => {
                // Попытка найти точную точку данных или вывести бюджет/план
                const dataPoint = chartData.find(
                  (d) => Math.abs(d.date - ts) < 86400000
                ); // в пределах 1 дня
                if (!dataPoint) return null;

                const planned = dataPoint.plannedExpense;
                const budgetVal = dataPoint.budget;

                return (
                  <React.Fragment key={`labels-${ts}`}>
                    {/* Метка бюджета в начале месяца */}
                    <ReferenceDot
                      x={ts}
                      y={budgetVal}
                      r={0}
                      label={{
                        value: formatAmountWithCurrency(
                          budgetVal,
                          workCurrency
                        ),
                        position: 'top',
                        fill: 'rgba(5, 150, 105, 0.7)',
                        fontSize: 10,
                        dy: -5,
                        dx: 40,
                      }}
                    />
                    {/* Метка планируемых расходов в начале месяца */}
                    {planned !== null && (
                      <ReferenceDot
                        x={ts}
                        y={planned}
                        r={0}
                        label={{
                          value: formatAmountWithCurrency(
                            Math.abs(planned),
                            workCurrency
                          ),
                          position: 'bottom',
                          fill: '#FCA5A5',
                          fontSize: 10,
                          dy: 5,
                          dx: 20,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              <Bar
                xAxisId={0}
                dataKey="incomeValue"
                fill="#10B981"
                shape={<CenteredBar />}
                isAnimationActive={false}
                onMouseEnter={() => setHoveredType('income')}
                onMouseLeave={() => setHoveredType(null)}
              />

              <Bar
                xAxisId={1}
                dataKey="expenseValue"
                fill="#EF4444"
                shape={<CenteredBar />}
                isAnimationActive={false}
                onMouseEnter={() => setHoveredType('expense')}
                onMouseLeave={() => setHoveredType(null)}
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-center gap-6 pb-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-sm mr-2"></div>
          Доходы
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-sm mr-2"></div>
          Расходы
        </div>
      </div>
    </div>
  );
};

export default FinancialHistoryChart;
