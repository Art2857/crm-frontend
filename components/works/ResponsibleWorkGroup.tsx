'use client';

import React from 'react';
import {
  ArchiveBoxIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { WorkAnalyticsByResponsible } from '../../types/workAnalytics';
import { formatAmountWithCurrency } from '../../utils/currency';
import Avatar from '../profile/Avatar';
import Card from '../ui/Card';
import CurrencySwitch from '../ui/CurrencySwitch';

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
  const [totalsCurrency, setTotalsCurrency] = React.useState<'RUB' | 'USD'>('RUB');
  const responsibleNameParts = React.useMemo(
    () => group.responsibleUserName.split(' ').filter((part) => part.length > 0),
    [group.responsibleUserName],
  );
  const avatarUser = React.useMemo(
    () => ({
      firstName: responsibleNameParts[0] ?? group.responsibleUserName,
      lastName: responsibleNameParts.slice(1).join(' '),
      email: null,
      avatarUrl: group.responsibleUserAvatarUrl,
    }),
    [group.responsibleUserAvatarUrl, group.responsibleUserName, responsibleNameParts],
  );

  // Сохраняем выбор валюты в localStorage
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('workListCurrency', totalsCurrency);
      }
    } catch {}
  }, [totalsCurrency]);

  // Получаем totals в зависимости от выбранной валюты (без запросов!)
  const totalsDisplay = React.useMemo(() => {
    if (totalsCurrency === 'USD' && group.totalsUsd) {
      return {
        totalIncome: group.totalsUsd.totalIncome,
        totalExpenses: group.totalsUsd.totalExpenses,
        totalSalary: group.totalsUsd.totalSalary,
      };
    }
    return {
      totalIncome: group.totals.totalIncome,
      totalExpenses: group.totals.totalExpenses,
      totalSalary: group.totals.totalSalary,
    };
  }, [group.totals, group.totalsUsd, totalsCurrency]);

  // No per-work currency switchers; totalsCurrency controls all conversions

  // Если все работы в группе скрыты — totals тоже скрыты
  const allConfidential = group.works.every((w) => w.isConfidential === true);
  const showFinancialAnalytics = !allConfidential;

  // Сортируем работы внутри группы по доходу
  const sortedWorks = [...group.works].sort((a, b) => b.income - a.income);
  const summaryMetrics = [
    {
      key: 'income',
      label: 'Прибыль',
      value: totalsDisplay.totalIncome,
      valueClass: allConfidential
        ? 'text-gray-500'
        : group.totals.totalIncome >= 0
          ? 'text-emerald-700'
          : 'text-rose-700',
    },
    {
      key: 'expenses',
      label: 'Расходы',
      value: totalsDisplay.totalExpenses,
      valueClass: allConfidential ? 'text-gray-500' : 'text-rose-700',
    },
    {
      key: 'salary',
      label: 'Бюджет',
      value: totalsDisplay.totalSalary,
      valueClass: allConfidential ? 'text-gray-500' : 'text-blue-700',
    },
  ] as const;

  return (
    <Card
      className="overflow-hidden border-0 bg-gradient-to-r from-white via-gray-50 to-white shadow-lg transition-all duration-300 hover:shadow-xl"
      bodyClassName="p-0"
    >
      <div className="relative cursor-pointer p-6" onClick={onToggle}>
        <div
          className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${
            showArchived
              ? 'from-slate-400 via-gray-400 to-slate-500'
              : 'from-blue-400 via-indigo-400 to-purple-400'
          }`}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center space-x-4">
            <Avatar
              user={avatarUser}
              size="medium"
              className={
                showArchived
                  ? '!h-20 !w-20 !rounded-2xl ring-2 ring-slate-200 shadow-lg'
                  : '!h-20 !w-20 !rounded-2xl ring-2 ring-blue-200 shadow-lg'
              }
            />

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h3 className="truncate text-xl font-bold text-gray-900">
                  {group.responsibleUserName}
                </h3>
                {showArchived && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    <ArchiveBoxIcon className="h-4 w-4" />
                    <span>Архив</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  <span>Работ: {group.totals.worksCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {showFinancialAnalytics && (
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {summaryMetrics.map((metric) => (
                  <div key={metric.key} className="min-w-0 px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                      {metric.label}
                    </div>
                    <div
                      className={`mt-1 text-base sm:text-lg font-semibold truncate ${metric.valueClass}`}
                    >
                      {formatAmountWithCurrency(metric.value, totalsCurrency)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-row items-center justify-between gap-3 xl:flex-col xl:justify-center">
              {showFinancialAnalytics && (
                <div onClick={(e) => e.stopPropagation()}>
                  <CurrencySwitch value={totalsCurrency} onChange={setTotalsCurrency} size="sm" />
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-all duration-200 hover:bg-gray-50"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="block space-y-4 p-4 sm:hidden">
            {sortedWorks.map((work) => (
              <div
                key={work.id}
                role="button"
                tabIndex={0}
                onClick={() => onViewWork(work.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewWork(work.id);
                  }
                }}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{work.name}</div>
                  </div>
                  <span
                    className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400"
                    aria-hidden
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
                {work.isConfidential !== true && (
                  <div className="mb-4 space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <div
                        className={`flex items-center justify-between ${
                          work.income >= 0
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-red-200 bg-red-50'
                        } rounded-lg border p-3`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md ${
                              work.income >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          >
                            {work.income >= 0 ? (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              work.income >= 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            Доход
                          </span>
                        </div>
                        <div
                          className={`font-semibold ${
                            work.income >= 0 ? 'text-emerald-800' : 'text-red-800'
                          }`}
                        >
                          {formatAmountWithCurrency(
                            work.originalIncome ?? Number(work.income || 0),
                            work.currency === 'USD' ? 'USD' : 'RUB',
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-rose-700">Расходы</span>
                        </div>
                        <div className="font-semibold text-rose-800">
                          {formatAmountWithCurrency(
                            work.originalExpenses ?? Number(work.expenses || 0),
                            work.currency === 'USD' ? 'USD' : 'RUB',
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-blue-700">Зарплата</span>
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-blue-800">
                          <span>
                            {formatAmountWithCurrency(
                              work.originalSalary ?? Number(work.salary || 0),
                              work.currency === 'USD' ? 'USD' : 'RUB',
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Работа</th>
                  {showFinancialAnalytics && (
                    <>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Доход</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Расходы</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Зарплата</th>
                    </>
                  )}
                  <th
                    className="w-12 py-3 px-2 text-center font-medium text-gray-700"
                    aria-label="Перейти"
                  >
                    <span className="sr-only">Переход</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedWorks.map((work, index) => (
                  <tr
                    key={work.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onViewWork(work.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViewWork(work.id);
                      }
                    }}
                    className={`cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{work.name}</div>
                    </td>
                    {showFinancialAnalytics && (
                      <>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            work.isConfidential === true
                              ? 'text-transparent'
                              : work.income >= 0
                                ? 'text-emerald-600'
                                : 'text-red-900'
                          }`}
                        >
                          {work.isConfidential === true
                            ? ''
                            : formatAmountWithCurrency(
                                work.originalIncome ?? Number(work.income || 0),
                                work.currency === 'USD' ? 'USD' : 'RUB',
                              )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            work.isConfidential === true ? 'text-transparent' : 'text-red-900'
                          }`}
                        >
                          {work.isConfidential === true
                            ? ''
                            : formatAmountWithCurrency(
                                work.originalExpenses ?? Number(work.expenses || 0),
                                work.currency === 'USD' ? 'USD' : 'RUB',
                              )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            work.isConfidential === true ? 'text-transparent' : 'text-blue-700'
                          }`}
                        >
                          <div className="inline-flex items-center gap-3 justify-end">
                            <span>
                              {work.isConfidential === true
                                ? ''
                                : formatAmountWithCurrency(
                                    work.originalSalary ?? Number(work.salary || 0),
                                    work.currency === 'USD' ? 'USD' : 'RUB',
                                  )}
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="w-12 py-3 px-2 text-center">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400"
                        aria-hidden
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
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
