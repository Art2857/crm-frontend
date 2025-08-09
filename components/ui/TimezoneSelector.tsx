'use client';

import React, { useMemo } from 'react';
import { useTimezone } from '../../contexts/TimezoneContext';

type Props = {
  className?: string;
  // Режим контролируемого использования (для форм админки)
  value?: string;
  onChange?: (tz: string) => void;
  label?: string;
  selectClassName?: string;
};

function formatOffset(minutes: number): string {
  const sign = minutes <= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

function getTzOffset(tz: string): number {
  try {
    const now = new Date();
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Получаем локальное время в TZ и сравниваем с UTC
    const parts = f
      .formatToParts(now)
      .reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
    const tzLocal = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const diffMs = tzLocal - now.getTime();
    return Math.round(diffMs / 60000);
  } catch {
    return 0;
  }
}

const TimezoneSelector: React.FC<Props> = ({ className, value, onChange, label = 'Часовой пояс', selectClassName }) => {
  const { timezone, setTimezone, availableTimezones } = useTimezone();

  const options = useMemo(() => {
    return availableTimezones
      .map((tz) => ({ tz, offsetMin: getTzOffset(tz) }))
      .sort((a, b) => a.offsetMin - b.offsetMin)
      .map(({ tz, offsetMin }) => ({
        value: tz,
        label: `${tz} (${formatOffset(offsetMin)})`,
      }));
  }, [availableTimezones]);

  const currentValue = value ?? timezone;
  const handleChange = (tz: string) => {
    if (onChange) onChange(tz);
    else setTimezone(tz);
  };

  return (
    <div className={`flex items-center ${className || ''}`}>
      <span className="mr-2 text-xs text-gray-500 whitespace-nowrap">{label}</span>
      <select
        id="tz"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`block text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white ${selectClassName || 'max-w-[280px]'}`}
        title={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimezoneSelector;
