'use client';

import React from 'react';
import { WorkIncome, WorkIncomeFixation, CURRENCY_OPTIONS } from '../../types/work-income';
import { formatAmountWithCurrency } from '../../utils/currency';
import {
  DATE_RANGE_SEPARATOR,
  formatDateForDisplay,
  getCurrentDateISO,
  shiftDateISOByDays,
} from '../../utils/date';
import { calculateWorkIncomeFixationAmount } from '../../utils/work-income-fixation';

interface WorkIncomeListProps {
  incomes: WorkIncome[];
  fixations: WorkIncomeFixation[];
  currentFixationDate?: string;
  hasFixations?: boolean;
  workCurrency: 'RUB' | 'USD';
  isLoading?: boolean;
  onEdit?: (income: WorkIncome) => void;
  onDelete?: (income: WorkIncome) => void;
  showActions?: boolean;
}

const WorkIncomeList: React.FC<WorkIncomeListProps> = ({
  incomes,
  fixations,
  currentFixationDate,
  hasFixations = false,
  workCurrency,
  isLoading = false,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const sortIncomesByDateDesc = React.useCallback((items: WorkIncome[]) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.receivedDate);
      const dateB = new Date(b.receivedDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, []);

  const getCurrencyLabel = (currency: 'RUB' | 'USD') => {
    return CURRENCY_OPTIONS.find((option) => option.value === currency)?.label || currency;
  };

  // Цветовые схемы для валют
  const getCurrencyStyles = (currency: 'RUB' | 'USD') => {
    if (currency === 'RUB') {
      return {
        badge: 'bg-green-100 text-green-800 border-green-200',
        amount: 'text-green-700 font-semibold',
        converted: 'text-green-600',
        icon: 'text-green-600',
      };
    } else {
      return {
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        amount: 'text-blue-700 font-semibold',
        converted: 'text-blue-600',
        icon: 'text-blue-600',
      };
    }
  };

  const openIncomes = React.useMemo(
    () => sortIncomesByDateDesc(incomes.filter((income) => !income.fixationId)),
    [incomes, sortIncomesByDateDesc],
  );

  const openPeriodStartDate = React.useMemo(() => {
    if (!currentFixationDate) {
      return undefined;
    }

    return hasFixations ? shiftDateISOByDays(currentFixationDate, 1) : currentFixationDate;
  }, [currentFixationDate, hasFixations]);

  const openPeriodAmount = React.useMemo(() => {
    return calculateWorkIncomeFixationAmount({
      incomes: openIncomes,
      workCurrency,
      startDate: openPeriodStartDate,
      endDate: getCurrentDateISO(),
    });
  }, [openIncomes, openPeriodStartDate, workCurrency]);

  const fixedSections = React.useMemo(() => {
    return [...fixations]
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .map((fixation) => ({
        fixation,
        incomes: sortIncomesByDateDesc(
          incomes.filter((income) => income.fixationId === fixation.id),
        ),
      }));
  }, [fixations, incomes, sortIncomesByDateDesc]);

  const renderIncomeRow = (income: WorkIncome, isFixedSection: boolean) => (
    <tr key={income.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {formatDateForDisplay(income.receivedDate)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${getCurrencyStyles(income.currency as 'RUB' | 'USD').amount}`}>
          {formatAmountWithCurrency(income.amount, income.currency)}
        </div>
        <div
          className={`text-xs px-2 py-0.5 rounded-full inline-block border ${getCurrencyStyles(income.currency as 'RUB' | 'USD').badge}`}
        >
          {getCurrencyLabel(income.currency)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {income.convertedAmount && income.convertedCurrency ? (
          <div>
            <div
              className={`text-sm font-medium ${getCurrencyStyles(income.convertedCurrency as 'RUB' | 'USD').converted}`}
            >
              {formatAmountWithCurrency(income.convertedAmount, income.convertedCurrency)}
            </div>
            {income.exchangeRate && (
              <div className="text-xs text-gray-500">
                Курс:{' '}
                {new Intl.NumberFormat('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }).format(income.exchangeRate)}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs">
          {income.description || <span className="text-gray-400 italic">Без описания</span>}
        </div>
      </td>
      {showActions && (
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          {isFixedSection ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Зафиксировано
            </span>
          ) : (
            <div className="flex justify-end space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(income)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Изменить
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(income)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Удалить
                </button>
              )}
            </div>
          )}
        </td>
      )}
    </tr>
  );

  const renderSection = ({
    title,
    subtitle,
    amount,
    amountCurrency,
    incomes: sectionIncomes,
    isFixedSection,
    emptyMessage,
  }: {
    title: string;
    subtitle: string;
    amount?: number;
    amountCurrency?: 'RUB' | 'USD';
    incomes: WorkIncome[];
    isFixedSection: boolean;
    emptyMessage: string;
  }) => {
    return (
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                {title}
              </h4>
              <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            </div>
            {amount !== undefined && amountCurrency !== undefined && (
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                {formatAmountWithCurrency(amount, amountCurrency)}
              </div>
            )}
          </div>
        </div>

        {sectionIncomes.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Дата поступления
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Сумма
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Конвертированная сумма
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Описание
                  </th>
                  {showActions && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Действия
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sectionIncomes.map((income) => renderIncomeRow(income, isFixedSection))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (incomes.length === 0 && fixations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Записей о доходах пока нет</h3>
          <p className="text-gray-500">
            Добавьте первую запись о поступлении средств для этой работы
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(currentFixationDate || openIncomes.length > 0) &&
        renderSection({
          title: 'Открытый период',
          subtitle: currentFixationDate
            ? `${hasFixations ? 'После' : 'С'} ${formatDateForDisplay(currentFixationDate)} по текущий момент`
            : 'Текущие поступления, которые еще не были зафиксированы',
          amount: openPeriodAmount,
          amountCurrency: workCurrency,
          incomes: openIncomes,
          isFixedSection: false,
          emptyMessage: 'После последней фиксации поступлений пока не было.',
        })}

      {fixedSections.map(({ fixation, incomes: sectionIncomes }) => (
        <React.Fragment key={fixation.id}>
          {renderSection({
            title: 'Зафиксированный период',
            subtitle: `${formatDateForDisplay(fixation.startDate)}${DATE_RANGE_SEPARATOR}${formatDateForDisplay(fixation.endDate)}`,
            amount: fixation.fixedAmount,
            amountCurrency: fixation.currency,
            incomes: sectionIncomes,
            isFixedSection: true,
            emptyMessage: 'В этом периоде не было поступлений.',
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default WorkIncomeList;
