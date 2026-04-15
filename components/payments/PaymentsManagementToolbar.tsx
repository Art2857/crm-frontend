'use client';

import React from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';

import Button from '../ui/Button';
import PaymentsDateCalculationPanel from './PaymentsDateCalculationPanel';

interface PaymentsManagementToolbarProps {
  selectedDate: string;
  minDate?: string;
  isLoading?: boolean;
  onCalculate: (date: string) => void;
  onCreatePayment: () => void;
}

export default function PaymentsManagementToolbar({
  selectedDate,
  minDate,
  isLoading = false,
  onCalculate,
  onCreatePayment,
}: PaymentsManagementToolbarProps) {
  return (
    <PaymentsDateCalculationPanel
      label="Расчет задолженности до даты (дата не включается): "
      selectedDate={selectedDate}
      minDate={minDate}
      isLoading={isLoading}
      onCalculate={onCalculate}
      rightSlot={
        <Button
          onClick={onCreatePayment}
          className="flex items-center justify-center gap-2 border bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
        >
          <BanknotesIcon className="h-5 w-5" />
          <span>Создать выплату</span>
        </Button>
      }
    />
  );
}
