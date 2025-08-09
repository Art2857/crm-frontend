'use client';

import React from 'react';
import { formatCurrency } from '../../utils/payments';

interface FinancialSummaryProps {
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  isPaymentDue?: boolean;
  className?: string;
}

export default function FinancialSummary({
  totalAccrued,
  totalPaid,
  remainingDebt,
  isPaymentDue = false,
  className = '',
}: FinancialSummaryProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 text-center ${className}`}>
      <div className="bg-blue-50 rounded-lg p-2">
        <p className="text-xs text-blue-600 font-medium">Начислено</p>
        <p className="text-sm font-bold text-blue-800">
          {formatCurrency(totalAccrued)}
        </p>
      </div>
      <div className="bg-green-50 rounded-lg p-2">
        <p className="text-xs text-green-600 font-medium">Выплачено</p>
        <p className="text-sm font-bold text-green-800">
          {formatCurrency(totalPaid)}
        </p>
      </div>
      <div
        className={`rounded-lg p-2 ${
          remainingDebt > 0 ? 'bg-red-50' : 'bg-orange-50'
        }`}
      >
        <p
          className={`text-xs font-medium ${
            remainingDebt > 0 ? 'text-red-600' : 'text-orange-600'
          }`}
        >
          Остаток
        </p>
        <p
          className={`text-sm font-bold ${
            remainingDebt > 0 ? 'text-red-800' : 'text-orange-800'
          }`}
        >
          {formatCurrency(remainingDebt)}
        </p>
      </div>
    </div>
  );
}
