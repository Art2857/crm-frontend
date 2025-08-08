'use client';

import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface WorkPeriodSelectorProps {
  userId?: string;
  workId: string;
  selectedDate: string;
  onDateChange: (workId: string, date: string, userId?: string) => void;
}

export default function WorkPeriodSelector({
  userId,
  workId,
  selectedDate,
  onDateChange 
}: WorkPeriodSelectorProps) {
  return (
    <div className="flex items-center space-x-3">
      <CalendarIcon className="h-5 w-5 text-blue-500" />
      <span className="text-sm font-medium text-gray-700">Расчет до даты:</span>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(workId, e.target.value, userId)}
        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
} 