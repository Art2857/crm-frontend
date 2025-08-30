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
                {showArchived && (
                  <span className="ml-2 text-orange-600">(Архив)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            {/* Финансовые карточки */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Прибыль */}
              <div className={`group relative overflow-hidden ${
                group.totals.totalIncome >= 0 
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' 
                  : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
              } border rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:scale-105 min-w-0 flex-1`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${
                      group.totals.totalIncome >= 0 
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                        : 'bg-gradient-to-br from-red-500 to-red-600'
                    } rounded-lg flex items-center justify-center shadow-sm`}>
                      {group.totals.totalIncome >= 0 ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${
                        group.totals.totalIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
                      } truncate`}>Прибыль</div>
                      <div className={`text-lg sm:text-xl font-bold ${
                        group.totals.totalIncome >= 0 ? 'text-emerald-800' : 'text-red-800'
                      } truncate`}>
                        {formatCurrency(group.totals.totalIncome)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`absolute inset-0 bg-gradient-to-r ${
                  group.totals.totalIncome >= 0 
                    ? 'from-emerald-500/0 to-emerald-500/5' 
                    : 'from-red-500/0 to-red-500/5'
                } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              </div>

              {/* Расходы */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:scale-105 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-rose-700 truncate">Расходы</div>
                      <div className="text-lg sm:text-xl font-bold text-rose-800 truncate">
                        {formatCurrency(group.totals.totalExpenses)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Бюджет */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:scale-105 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-blue-700 truncate">Бюджет</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-800 truncate">
                        {formatCurrency(group.totals.totalSalary)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* Кнопка раскрытия */}
            <div className="flex justify-center sm:justify-end">
              <div
                className={`transform transition-all duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                } flex justify-center items-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 cursor-pointer`}
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-gray-900">
                    {work.name}
                  </div>
                  <button
                    onClick={() => onViewWork(work.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all duration-200 ml-2 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3 mb-4">
                  {/* Финансовые карточки для мобильного */}
                  <div className="grid grid-cols-1 gap-2">
                    {/* Доход */}
                    <div className={`flex items-center justify-between ${
                      work.income >= 0 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-red-50 border-red-200'
                    } border rounded-lg p-3`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 ${
                          work.income >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                        } rounded-md flex items-center justify-center`}>
                          {work.income >= 0 ? (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          work.income >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>Доход</span>
                      </div>
                      <div className={`font-semibold ${
                        work.income >= 0 ? 'text-emerald-800' : 'text-red-800'
                      }`}>
                        {formatCurrency(work.income)}
                      </div>
                    </div>

                    {/* Расходы */}
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-rose-500 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-rose-700">Расходы</span>
                      </div>
                      <div className="font-semibold text-rose-800">
                        {formatCurrency(work.expenses)}
                      </div>
                    </div>

                    {/* Зарплата */}
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-blue-700">Зарплата</span>
                      </div>
                      <div className="font-semibold text-blue-800">
                        {formatCurrency(work.salary)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Десктопное отображение */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Работа
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">
                    Доход
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">
                    Расходы
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">
                    Зарплата
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700 w-12">
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWorks.map((work, index) => (
                  <tr
                    key={work.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {work.name}
                      </div>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${work.income >= 0 ? 'text-emerald-600' : 'text-red-900'}`}
                    >
                      {formatCurrency(work.income)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-900 font-medium">
                      {formatCurrency(work.expenses)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-blue-700">
                      {formatCurrency(work.salary)}
                    </td>
                    <td className="py-3 px-4 text-center w-12">
                      <button
                        onClick={() => onViewWork(work.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
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
