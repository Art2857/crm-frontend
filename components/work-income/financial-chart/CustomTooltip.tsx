import React from 'react';
import { formatAmountWithCurrency } from '../../../utils/currency';
import { formatDateForDisplay } from '../../../utils/date';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  hoveredType: 'income' | 'expense' | 'planned' | 'budget' | null;
  workCurrency: 'RUB' | 'USD';
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  hoveredType,
  workCurrency,
}) => {
  if (active && payload && payload.length && hoveredType) {
    const data = payload[0].payload;

    // Поступления
    if (hoveredType === 'income' && data.incomeItems && data.incomeItems.length > 0) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm max-w-xs z-50 relative pointer-events-none">
          <div className="font-bold mb-2 border-b pb-1 text-gray-700">
            {formatDateForDisplay(data.isoDate)}
          </div>
          <div className="mb-1">
            <div className="text-green-600 font-semibold mb-2">
              Поступлений: {data.incomeItems.length}
            </div>
            {data.incomeItems.map((item: any, idx: number) => (
              <div key={idx} className="mb-2 border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                <div className="text-gray-800 font-bold">
                  +{formatAmountWithCurrency(item.amount, item.currency)}
                  {item.currency !== (item.convertedCurrency || workCurrency) && (
                    <span className="text-gray-400 font-normal ml-1 text-xs">
                      (
                      {formatAmountWithCurrency(
                        item.convertedAmount,
                        item.convertedCurrency || workCurrency,
                      )}
                      )
                    </span>
                  )}
                </div>
                {item.description && (
                  <div className="text-gray-600 italic text-xs">&quot;{item.description}&quot;</div>
                )}
              </div>
            ))}
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              Накоплено (на конец дня):{' '}
              {formatAmountWithCurrency(data.accAfter, workCurrency || 'RUB')}
            </div>
          </div>
        </div>
      );
    }

    // Обязанности распределения на сумму, траты
    if (hoveredType === 'expense' && data.expenseItems && data.expenseItems.length > 0) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm max-w-xs z-50 relative pointer-events-none">
          <div className="font-bold mb-2 border-b pb-1 text-gray-700">
            {formatDateForDisplay(data.isoDate)}
          </div>
          <div className="mb-1">
            <div className="text-red-600 font-semibold mb-2">
              Выплат: {data.expenseItems.length}
            </div>
            {data.expenseItems.map((item: any, idx: number) => (
              <div key={idx} className="mb-2 border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                <div className="text-gray-800 font-bold">
                  -{formatAmountWithCurrency(item.amount, item.currency || 'RUB')}
                </div>
                {item.toUser && (
                  <div className="text-gray-600 text-xs">
                    Кому: {item.toUser.firstName} {item.toUser.lastName}
                  </div>
                )}
              </div>
            ))}
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              Накоплено (на конец дня):{' '}
              {formatAmountWithCurrency(Math.abs(data.accAfter), workCurrency || 'RUB')}
            </div>
          </div>
        </div>
      );
    }

    // Запланированные траты по обозянностям
    if (hoveredType === 'planned' && data.plannedExpense !== null) {
      return (
        <div className="bg-white p-2 border border-pink-200 shadow-sm rounded text-xs z-50 relative pointer-events-none">
          <div className="text-pink-600 font-semibold">
            План расходов: {formatAmountWithCurrency(Math.abs(data.plannedExpense), 'RUB')}
          </div>
          <div className="text-gray-400 text-[10px] mt-1">
            {new Date(data.date).toLocaleDateString()}
          </div>
        </div>
      );
    }

    // Бюджет
    if (hoveredType === 'budget' && data.budget !== undefined) {
      return (
        <div className="bg-white p-2 border border-green-200 shadow-sm rounded text-xs z-50 relative pointer-events-none">
          <div className="text-green-600 font-semibold">
            Бюджет проекта: {formatAmountWithCurrency(data.budget, 'RUB')}
          </div>
        </div>
      );
    }
  }

  return null;
};
