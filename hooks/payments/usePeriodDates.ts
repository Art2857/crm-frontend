import { useCallback, useState } from 'react';

export function usePeriodDates() {
  const [workPeriodDates, setWorkPeriodDates] = useState<
    Record<string, string>
  >({});
  const [userPeriodDates, setUserPeriodDates] = useState<
    Record<string, string>
  >({});

  const getWorkPeriodDate = useCallback(
    (workId: string): string => {
      if (workPeriodDates[workId]) return workPeriodDates[workId];
      const d = new Date();
      return d.toISOString().split('T')[0];
    },
    [workPeriodDates]
  );

  const getUserPeriodDate = useCallback(
    (userId: string): string => {
      if (userPeriodDates[userId]) return userPeriodDates[userId];
      const d = new Date();
      return d.toISOString().split('T')[0];
    },
    [userPeriodDates]
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
