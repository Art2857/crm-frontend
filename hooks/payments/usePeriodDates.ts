import { useCallback, useState } from 'react';
import { getCurrentDateISO } from '../../utils/date';

export function usePeriodDates() {
  const [workPeriodDates, setWorkPeriodDates] = useState<Record<string, string>>({});
  const [userPeriodDates, setUserPeriodDates] = useState<Record<string, string>>({});

  const getWorkPeriodDate = useCallback(
    (workId: string): string => {
      if (workPeriodDates[workId]) return workPeriodDates[workId];
      return getCurrentDateISO();
    },
    [workPeriodDates],
  );

  const getUserPeriodDate = useCallback(
    (userId: string): string => {
      if (userPeriodDates[userId]) return userPeriodDates[userId];
      return getCurrentDateISO();
    },
    [userPeriodDates],
  );

  return {
    workPeriodDates,
    setWorkPeriodDates,
    userPeriodDates,
    setUserPeriodDates,
    getWorkPeriodDate,
    getUserPeriodDate,
  };
}
