'use client';

import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/payments';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';

interface FinancialSummaryProps {
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  className?: string;
  currency?: 'RUB' | 'USD'; // display currency
}

export default function FinancialSummary({
  totalAccrued,
  totalPaid,
  remainingDebt,
  className = '',
  currency = 'RUB',
}: FinancialSummaryProps) {
  const { convert } = useCurrencyConversion();

  // Convert base RUB values to display currency
  const display = useMemo(() => {
    const to = currency;
    return {
      accrued: convert(totalAccrued, 'RUB', to),
      paid: convert(totalPaid, 'RUB', to),
      remaining: convert(remainingDebt, 'RUB', to),
    };
  }, [convert, totalAccrued, totalPaid, remainingDebt, currency]);

  const remainingTone =
    remainingDebt > 0
      ? {
          card: 'bg-red-50',
          label: 'text-red-600',
          value: 'text-red-800',
        }
      : remainingDebt < 0
        ? {
            card: 'bg-emerald-50',
            label: 'text-emerald-600',
            value: 'text-emerald-800',
          }
        : {
            card: 'bg-gray-50',
            label: 'text-gray-600',
            value: 'text-gray-800',
          };

  return (
    <div className={`grid grid-cols-3 gap-3 text-center ${className}`}>
      <div className="bg-blue-50 rounded-lg p-2">
        <p className="text-xs text-blue-600 font-medium">Начислено</p>
        <p className="text-sm font-bold text-blue-800">
          {formatCurrency(display.accrued, currency)}
        </p>
      </div>
      <div className="bg-green-50 rounded-lg p-2">
        <p className="text-xs text-green-600 font-medium">Выплачено</p>
        <p className="text-sm font-bold text-green-800">{formatCurrency(display.paid, currency)}</p>
      </div>
      <div className={`rounded-lg p-2 ${remainingTone.card}`}>
        <p className={`text-xs font-medium ${remainingTone.label}`}>Остаток</p>
        <p className={`text-sm font-bold ${remainingTone.value}`}>
          {formatCurrency(display.remaining, currency)}
        </p>
      </div>
    </div>
  );
}
