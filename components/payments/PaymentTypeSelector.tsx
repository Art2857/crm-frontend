'use client';

import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface PaymentTypeSelectorProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
}

export default function PaymentTypeSelector({
  selectedType,
  onTypeChange,
}: PaymentTypeSelectorProps) {
  const paymentTypes = [
    {
      value: 'SALARY',
      label: 'Зарплата',
      icon: '💰',
      desc: 'Влияет на закрытие долга',
    },
    {
      value: 'ADVANCE',
      label: 'Аванс',
      icon: '⚡',
      desc: 'Влияет на закрытие долга',
    },
    { value: 'BONUS', label: 'Премия', icon: '🎁', desc: 'Не влияет на долг' },
    { value: 'EXTRA', label: 'Доплата', icon: '➕', desc: 'Не влияет на долг' },
  ];

  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-semibold text-gray-700">
        <DocumentTextIcon className="h-4 w-4 mr-2 text-orange-500" />
        Тип выплаты
      </label>
      <div className="grid grid-cols-2 gap-2">
        {paymentTypes.map((option) => (
          <div
            key={option.value}
            onClick={() => onTypeChange(option.value)}
            className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
              selectedType === option.value
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm">{option.icon}</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500">{option.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
