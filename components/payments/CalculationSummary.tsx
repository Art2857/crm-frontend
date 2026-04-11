'use client';

import React from 'react';
import { formatCurrency } from '../../utils/payments';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { useDateManager } from '../../hooks/useDateManager';

interface CalculationSummaryProps {
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  overpaidAmount?: number;
  lastClosureDate?: string | null;
  calculationDate?: string;
  isDebtsView: boolean;
}

export default function CalculationSummary({
  totalAccrued,
  totalPaid,
  remainingDebt,
  overpaidAmount = 0,
  lastClosureDate,
  calculationDate,
  isDebtsView,
}: CalculationSummaryProps) {
  const { formatRussian } = useDateManager();
  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-sm text-blue-600 font-medium">Всего начислено</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalAccrued)}</p>
        </div>
        <div>
          <p className="text-sm text-green-600 font-medium">
            {isDebtsView ? 'Уже получено' : 'Уже выплачено'}
          </p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div>
          <p className="text-sm text-yellow-700 font-medium">Сверхурочные</p>
          <p className="text-2xl font-bold text-yellow-800">{formatCurrency(overpaidAmount)}</p>
        </div>
        <div>
          <p className="text-sm text-red-600 font-medium">
            {isDebtsView ? 'Мне должны' : 'К доплате'}
          </p>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(remainingDebt)}</p>
        </div>
      </div>

      {/* Компактная строка с датами */}
      {(lastClosureDate || calculationDate) && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex justify-center gap-6 text-sm">
            {lastClosureDate && (
              <div className="text-center">
                <span className="text-blue-600 font-medium">Последнее закрытие: </span>
                <span className="text-blue-800 font-semibold">
                  {formatRussian(lastClosureDate) || 'Неизвестная дата'}
                </span>
              </div>
            )}
            {calculationDate && (
              <div className="text-center">
                <CalendarIcon className="h-4 w-4 inline mr-1 text-green-600" />
                <span className="text-green-600 font-medium">Расчет до: </span>
                <span className="text-green-800 font-semibold">
                  {formatRussian(calculationDate) || 'Неизвестная дата'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
