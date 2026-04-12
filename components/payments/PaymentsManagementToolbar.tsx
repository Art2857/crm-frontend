'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import Button from '../ui/Button';
import { formatDateToISO } from '../../utils/date';

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
  const [draftDate, setDraftDate] = useState(selectedDate);
  const normalizedMinDate = useMemo(() => (minDate ? formatDateToISO(minDate) : ''), [minDate]);

  useEffect(() => {
    setDraftDate(formatDateToISO(selectedDate));
  }, [selectedDate]);

  const isDateTooEarly = normalizedMinDate !== '' && formatDateToISO(draftDate) < normalizedMinDate;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 text-blue-800">
            <CalendarIcon className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <span className="text-sm font-medium">Расчет задолженности до даты:</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="date"
              value={formatDateToISO(draftDate)}
              min={normalizedMinDate || undefined}
              onChange={(e) => setDraftDate(formatDateToISO(e.target.value))}
              className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <Button
              onClick={() => {
                if (isDateTooEarly || isLoading) return;
                onCalculate(formatDateToISO(draftDate));
              }}
              disabled={isDateTooEarly || isLoading}
              className="flex items-center justify-center gap-2 border bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClockIcon className="h-4 w-4" />
              <span>{isLoading ? 'Обновляем...' : 'Рассчитать'}</span>
            </Button>
          </div>
        </div>

        <Button
          onClick={onCreatePayment}
          className="flex items-center justify-center gap-2 border bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
        >
          <BanknotesIcon className="h-5 w-5" />
          <span>Создать выплату</span>
        </Button>
      </div>

      {isDateTooEarly && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            Дата не может быть раньше текущей даты закрытия периода хотя бы по одной работе
          </span>
        </div>
      )}
    </div>
  );
}
