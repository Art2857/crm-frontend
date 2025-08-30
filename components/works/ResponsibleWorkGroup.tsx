'use client';

import React from 'react';
import { WorkAnalyticsByResponsible } from '../../types/workAnalytics';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay } from '../../utils/date';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ResponsibleWorkGroupProps {
  group: WorkAnalyticsByResponsible;
  isExpanded: boolean;
  onToggle: () => void;
  onViewWork: (workId: string) => void;
  showArchived?: boolean;
}

export default function ResponsibleWorkGroup({
  group,
  isExpanded,
  onToggle,
  onViewWork,
  showArchived = false,
}: ResponsibleWorkGroupProps) {
  // Функция для определения цвета доходности
  const getIncomeColor = (income: number) => {
    return income >= 0 ? 'text-green-600' : 'text-red-900';
  };

  // Сортируем работы внутри группы по доходу
  const sortedWorks = [...group.works].sort((a, b) => b.income - a.income);

  return (
    <Card className="overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300">
      {/* Заголовок группы */}
      <div
        className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors"
        onClick={onToggle}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-lg">
                {group.responsibleUserName
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {group.responsibleUserName}
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                {group.totals.worksCount} работ(ы)
                {showArchived && <span className="ml-2 text-orange-600">(Архив)</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
            <div>
              <div className="text-base sm:text-lg font-semibold text-green-700">
                {formatCurrency(group.totals.totalSalary)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Бюджет</div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-semibold text-red-900">
                {formatCurrency(group.totals.totalExpenses)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Расходы</div>
            </div>
            <div>
              <div
                className={`text-base sm:text-lg font-semibold ${getIncomeColor(
                  group.totals.totalIncome
                )}`}
              >
                {formatCurrency(group.totals.totalIncome)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Прибыль</div>
            </div>
            <div className="flex items-center justify-end">
              <div
                className={`transform transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                } flex justify-center items-center w-8 h-8 rounded-full hover:bg-gray-200`}
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Детали группы */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-gray-50">
          {/* Мобильное отображение */}
          <div className="block sm:hidden space-y-4">
            {sortedWorks.map((work) => (
              <div
                key={work.id}
                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
              >
                <div className="font-medium text-gray-900 mb-3">
                  {work.name}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">Зарплата:</span>
                    <div className="font-medium text-green-700">{formatCurrency(work.salary)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Расходы:</span>
                    <div className="font-medium text-red-900">{formatCurrency(work.expenses)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Доход:</span>
                    <div className={`font-medium ${getIncomeColor(work.income)}`}>
                      {formatCurrency(work.income)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Дата:</span>
                    <div className="text-gray-700">
                      {work.releaseDate ? formatDateForDisplay(work.releaseDate) : 'Не указана'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewWork(work.id)}
                  className="w-full"
                >
                  Просмотр
                </Button>
              </div>
            ))}
          </div>

          {/* Десктопное отображение */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Работа</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Зарплата</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Расходы</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Доход</th>

                  <th className="text-right py-3 px-4 font-medium text-gray-700">Дата выхода</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedWorks.map((work, index) => (
                  <tr
                    key={work.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{work.name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-green-700">
                      {formatCurrency(work.salary)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-900 font-medium">
                      {formatCurrency(work.expenses)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${getIncomeColor(work.income)}`}>
                      {formatCurrency(work.income)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {work.releaseDate ? formatDateForDisplay(work.releaseDate) : 'Не указана'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewWork(work.id)}
                        className="text-sm"
                      >
                        Просмотр
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
