'use client';

import React, { useState } from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
// Убрали formatDateToISO - работаем с чистыми Date объектами

interface UserPeriodSelectorProps {
  userId: string;
  selectedDate: Date;
  onDateSet: (userId: string, date: Date) => void;
}

export default function UserPeriodSelector({
  userId,
  selectedDate,
  onDateSet,
}: UserPeriodSelectorProps) {
  const [date, setDate] = useState<Date>(selectedDate);

  return (
    <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
      <CalendarIcon className="h-5 w-5 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">
        Расчет задолженности до даты:
      </span>
      <input
        type="date"
        value={date.toISOString().split('T')[0]}
        onChange={(e) => setDate(new Date(e.target.value))}
        className="border border-blue-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        onClick={(e) => e.stopPropagation()}
      />
      <Button
        onClick={() => onDateSet(userId, date)}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 px-3 py-1 text-sm font-medium shadow-sm border"
      >
        <ClockIcon className="h-4 w-4" />
        <span>Рассчитать</span>
      </Button>
    </div>
  );
}
