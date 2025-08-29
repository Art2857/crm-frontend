'use client';

import { useEffect } from 'react';
import { useTimezone } from '../contexts/TimezoneContext';
import { dateManager } from '../utils/DateManager';

/**
 * Хук для интеграции DateManager с TimezoneContext
 */
export const useDateManager = () => {
  const timezoneContext = useTimezone();

  // Синхронизируем timezone при изменении контекста
  useEffect(() => {
    if (timezoneContext?.timezone) {
      dateManager.setUserTimezone(timezoneContext.timezone);
    }
  }, [timezoneContext?.timezone]);

  return {
    dateManager,
    timezone: timezoneContext?.timezone || 'UTC',

    // Методы форматирования с учетом текущего timezone
    formatISO: (date: string | Date | null | undefined) =>
      dateManager.formatISO(date),

    formatRussian: (date: string | Date | null | undefined) =>
      dateManager.formatRussian(date),

    formatRussianWithTime: (date: string | Date | null | undefined) =>
      dateManager.formatRussianWithTime(date, true),

    formatByField: (
      date: string | Date | null | undefined,
      fieldName: string
    ) => dateManager.formatByField(date, fieldName, true),

    // Вспомогательные методы
    getCurrentDateISO: () => dateManager.getCurrentDateISO(),
    getYesterdayISO: () => dateManager.getYesterdayISO(),
    calculateAge: (birthday: string | Date | null | undefined) =>
      dateManager.calculateAge(birthday),

    // Валидация
    isValidRussianFormat: (dateString: string) =>
      dateManager.isValidRussianFormat(dateString),
  };
};
