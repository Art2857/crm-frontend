'use client';

import React from 'react';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/payments';
import { EyeIcon } from '@heroicons/react/24/outline';
import { DutyDetail } from '../../types/payments';

interface DutyCardProps {
  duty: DutyDetail;
  index: number;
  onShowCalculation: (dutyId: string) => void;
}

export default function DutyCard({
  duty,
  index,
  onShowCalculation,
}: DutyCardProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-blue-400 rounded-full" />
        <div>
          <p className="font-medium text-gray-900">{duty.dutyName}</p>
          <p className="text-xs text-gray-500">
            {formatCurrency(duty.monthlyAmount)}/мес
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-lg font-bold text-red-600">
            {formatCurrency(duty.debt)}
          </p>
          <p className="text-xs text-gray-500">к выплате</p>
        </div>

        <Button
          onClick={() => onShowCalculation(duty.dutyId)}
          size="sm"
          className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
