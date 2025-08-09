import { useCallback, useMemo, useState } from 'react';
import { analyticsService, MyDebt } from '../../services/analytics';
import { mapAnalysisToUsers } from '../../utils/paymentsMapping';
import { logger } from '../../utils/logger';
import { useNotification } from '../../contexts/NotificationContext';
import { ResponsibleUser } from '../../types/payments';

interface LoadParams {
  endDate?: string;
  targetWorkId?: string;
  targetUserId?: string;
}

export function usePaymentsData() {
  const notification = useNotification();

  const [usersData, setUsersData] = useState<ResponsibleUser[]>([]);
  const [myDebts, setMyDebts] = useState<MyDebt[]>([]);

  const getWorksData = useCallback(async (data: LoadParams = {}) => {
    const { endDate, targetWorkId, targetUserId } = data;

    const analysis = await analyticsService.getUserWorksClosurePeriodsAnalysis(
      endDate,
      targetWorkId ? [targetWorkId] : undefined,
      targetUserId
    );

    const mappedUsers = mapAnalysisToUsers(analysis);

    const sortByName = (arr: ResponsibleUser[]) =>
      arr.slice().sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
        return nameA.localeCompare(nameB, 'ru');
      });

    return sortByName(mappedUsers);
  }, []);

  const fetchWorksData = useCallback(
    async (data: LoadParams = {}) => {
      const mappedUsers = await getWorksData(data);
      setUsersData(mappedUsers);
    },
    [getWorksData]
  );

  const updateWorksData = useCallback(
    async (data: LoadParams = {}) => {
      const mappedUsers = await getWorksData(data);
      setUsersData((prev) => {
        const updatedUsers = prev.map((user) => {
          const updatedUserInNewResult = mappedUsers.find(
            (mu) => mu.userId === user.userId
          );
          if (updatedUserInNewResult) {
            const works = user.works.map((oldWorkData) => {
              const updatedWorkInNewResult = updatedUserInNewResult.works.find(
                (nw) => oldWorkData.workId === nw.workId
              );
              return updatedWorkInNewResult || oldWorkData;
            });
            return { ...updatedUserInNewResult, works };
          }
          return user;
        });
        return updatedUsers;
      });
    },
    [getWorksData]
  );

  const fetchMyDebtsData = useCallback(async () => {
    try {
      const myDebtsData = await analyticsService.getMyDebts();
      setMyDebts(myDebtsData.debts as unknown as MyDebt[]);
    } catch (error) {
      logger.error('Ошибка загрузки моих задолженностей:', error);
      notification.showError('Не удалось загрузить данные о задолженностях');
    }
  }, [notification]);

  const responsibleUsersSummary = useMemo(() => usersData, [usersData]);

  return {
    // state
    usersData,
    setUsersData,
    myDebts,
    setMyDebts,
    responsibleUsersSummary,
    // actions
    fetchWorksData,
    updateWorksData,
    fetchMyDebtsData,
  };
}
