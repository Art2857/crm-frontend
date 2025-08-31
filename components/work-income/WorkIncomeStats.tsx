'use client';

import React from 'react';
import { WorkIncomeStats as WorkIncomeStatsType } from '../../types/work-income';

interface WorkIncomeStatsProps {
  stats: WorkIncomeStatsType | null;
  isLoading?: boolean;
}

const WorkIncomeStats: React.FC<WorkIncomeStatsProps> = ({
  stats,
  isLoading = false,
}) => {
  const formatAmount = (amount: number, currency: 'RUB' | 'USD') => {
    const symbol = currency === 'RUB' ? '₽' : '$';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: currency === 'RUB' ? 0 : 2,
      maximumFractionDigits: currency === 'RUB' ? 0 : 2,
    }).format(amount) + ` ${symbol}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="text-center text-gray-500">
          Статистика недоступна
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Компактный заголовок */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Анализ доходности
            </h3>
            <p className="text-xs text-gray-500">
              Аналитика по поступлениям
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div className="font-medium">{stats.workingDaysTotal} рабочих дней</div>
            <div>из {stats.totalDays} дней</div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Средние значения с аналитикой */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-1 h-4 bg-indigo-500 rounded-full mr-2"></div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Средняя доходность
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Рубли */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">В рублях</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatAmount(stats.avgSalaryRub, 'RUB')}
                  </div>
                </div>
              </div>

            </div>

            {/* Доллары */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">В долларах</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatAmount(stats.avgSalaryUsd, 'USD')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Общие суммы (компактно) */}
        <div>
          <div className="flex items-center mb-3">
            <div className="w-1 h-4 bg-emerald-500 rounded-full mr-2"></div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Итого поступлений
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Рубли</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatAmount(stats.totalRub, 'RUB')}
                  </div>
                </div>
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-green-600 font-bold text-xs">₽</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Доллары</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatAmount(stats.totalUsd, 'USD')}
                  </div>
                </div>
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">$</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkIncomeStats;