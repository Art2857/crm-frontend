'use client';

import React, {useState} from 'react';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import {formatDateToISO} from "../../utils/date";

interface UserPeriodSelectorProps {
  userId: string;
  selectedDate: string;
  onDateSet: (userId: string, date: string) => void;
}

export default function UserPeriodSelector({ 
  userId, 
  selectedDate, 
  onDateSet
}: UserPeriodSelectorProps) {
  const [date, setDate] = useState<string>(selectedDate);

  return (
    <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
      <CalendarIcon className="h-5 w-5 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">Расчет задолженности до даты:</span>
      <input
        type="date"
        value={formatDateToISO(date)}
        onChange={(e) => setDate(formatDateToISO(e.target.value))}
        className="border border-blue-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        onClick={(e) => e.stopPropagation()}
      />
      <Button
        onClick={() => onDateSet(userId, formatDateToISO(date))}
        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 px-3 py-1 text-sm font-medium shadow-sm border"
      >
        <ClockIcon className="h-4 w-4" />
        <span>Установить время</span>
      </Button>
    </div>
  );
} 