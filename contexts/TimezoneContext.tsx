'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildTimezoneOptions, TimezoneOption } from '../utils/timezones';

export type TimezoneContextValue = {
  timezone: string;
  setTimezone: (tz: string) => void;
  availableTimezones: TimezoneOption[];
};

const STORAGE_KEY = 'app.timezone';

const defaultTimezone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

const getStoredTimezone = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
};

const setStoredTimezone = (tz: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, tz);
  } catch {}
};

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timezone, setTimezoneState] = useState<string>(getStoredTimezone() || defaultTimezone);

  const availableTimezones = useMemo(
    () => buildTimezoneOptions([timezone, defaultTimezone, getStoredTimezone()]),
    [timezone],
  );

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    setStoredTimezone(tz);
  };

  // Синхронизация при первом рендере: если нет сохранённого TZ — сохраняем дефолтный
  useEffect(() => {
    if (!getStoredTimezone()) setStoredTimezone(timezone);
  }, []);

  const value = useMemo(
    () => ({ timezone, setTimezone, availableTimezones }),
    [timezone, availableTimezones],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
};

export const useTimezone = () => {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used within TimezoneProvider');
  return ctx;
};

export const TimezoneStorage = {
  key: STORAGE_KEY,
  get: getStoredTimezone,
  set: setStoredTimezone,
  default: defaultTimezone,
};
