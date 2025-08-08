'use client';

import React from 'react';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../utils/payments';
import { PeriodCalculation } from '../../types/payments';

interface PeriodCalculationSectionProps {
  periods: PeriodCalculation[];
  isCompact?: boolean;
}

export default function PeriodCalculationSection({ 
  periods, 
  isCompact = false 
}: PeriodCalculationSectionProps) {
  const totalAmount = periods.reduce((sum, period) => sum + period.totalAmount, 0);

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900">
        Разбивка по периодам изменения {isCompact ? 'обязанности' : 'обязанностей'}:
      </h4>
      
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {periods.map((period, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900">
                Период {index + 1}: {new Date(period.startDate).toLocaleDateString('ru-RU')} - {new Date(period.endDate).toLocaleDateString('ru-RU')}
              </h5>
              <Badge className="bg-blue-100 text-blue-800">
                {period.days} из {period.monthDays} дней
              </Badge>
            </div>
            
            <div className="space-y-2">
              {period.duties.map((duty) => (
                <div key={duty.dutyId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{duty.dutyName}:</span>
                  <span className="font-mono">
                    {formatCurrency(duty.monthlyAmount)} × {period.days}/{period.monthDays} = {formatCurrency(duty.calculatedAmount)}
                  </span>
                </div>
              ))}
              <hr className="border-gray-300" />
              <div className="flex items-center justify-between font-medium">
                <span>Итого за период:</span>
                <span className="text-blue-600">{formatCurrency(period.totalAmount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Общая сумма всех периодов */}
      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
        <div className="flex items-center justify-between">
          <h5 className="text-lg font-semibold text-green-800">
            Общая сумма за все периоды:
          </h5>
          <span className="text-2xl font-bold text-green-700">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
} 