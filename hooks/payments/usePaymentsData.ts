import { useCallback, useMemo, useState } from 'react';
import { analyticsService, MyDebt } from '../../services/analytics';
import { logger } from '../../utils/logger';
import { useNotification } from '../../contexts/NotificationContext';
import { ResponsibleUser } from '../../types/payments';
import { useAppSelector } from '../../store';

interface LoadParams {
  endDate?: string;
  targetWorkId?: string;
  targetUserId?: string;
}

function mergeWorksById(
  existingWorks: ResponsibleUser['works'],
  updatedWorks: ResponsibleUser['works']
) {
  const updatedWorksMap = new Map(
    updatedWorks.map((work) => [work.workId, work] as const)
  );

  const mergedWorks = existingWorks.map(
    (existingWork) => updatedWorksMap.get(existingWork.workId) ?? existingWork
  );

  const newWorks = updatedWorks.filter(
    (work) => !existingWorks.some((existing) => existing.workId === work.workId)
  );

  return [...mergedWorks, ...newWorks];
}

function buildUserTotalsFromWorks(works: ResponsibleUser['works']) {
  const totalAccrued = works.reduce(
    (sum, work) => sum + (work.totalAccrued || 0),
    0
  );
  const totalPaid = works.reduce(
    (sum, work) => sum + (work.paidAmount || 0),
    0
  );
  const totalDebt = works.reduce(
    (sum, work) => sum + ((work.totalAccrued || 0) - (work.paidAmount || 0)),
    0
  );
  const remainingDebt = works.reduce(
    (sum, work) =>
      sum + Math.max((work.totalAccrued || 0) - (work.paidAmount || 0), 0),
    0
  );
  const overpaidAmount = works.reduce(
    (sum, work) => sum + (work.overpaidAmount || 0),
    0
  );

  return {
    totalAccrued,
    totalPaid,
    totalDebt,
    remainingDebt,
    overpaidAmount,
  };
}

export function usePaymentsData() {
  const { showError } = useNotification();
  const { user } = useAppSelector((state) => state.auth);

  const [usersData, setUsersData] = useState<ResponsibleUser[]>([]);
  const [myDebts, setMyDebts] = useState<MyDebt[]>([]);

  const getWorksData = useCallback(
    async (data: LoadParams = {}) => {
      const { endDate, targetWorkId, targetUserId } = data;

      const mappedUsers = await analyticsService.getPaymentsManagement(
        user.role,
        endDate,
        targetWorkId ? [targetWorkId] : undefined,
        targetUserId
      );

      const sortByName = (arr: ResponsibleUser[]) =>
        arr.slice().sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return nameA.localeCompare(nameB, 'ru');
        });

      return sortByName(mappedUsers);
    },
    [user.role]
  );

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
        const updatedUsersMap = new Map(
          mappedUsers.map((userEntry) => [userEntry.userId, userEntry] as const)
        );

        const nextUsers = prev.map((existingUser) => {
          const updatedUserInNewResult = updatedUsersMap.get(
            existingUser.userId
          );
          if (!updatedUserInNewResult) {
            return existingUser;
          }

          const nextWorks =
            data.targetWorkId !== undefined
              ? mergeWorksById(existingUser.works, updatedUserInNewResult.works)
              : updatedUserInNewResult.works;

          const recalculatedTotals = buildUserTotalsFromWorks(nextWorks);

          return {
            ...existingUser,
            ...updatedUserInNewResult,
            works: nextWorks,
            ...recalculatedTotals,
            isPaymentDue: recalculatedTotals.remainingDebt > 0,
            requiresAttention: nextWorks.some((work) => work.requiresAttention),
          } as ResponsibleUser;
        });

        const newUsers = mappedUsers.filter(
          (mappedUser) =>
            !prev.some(
              (existingUser) => existingUser.userId === mappedUser.userId
            )
        );

        return [...nextUsers, ...newUsers];
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
      showError('Не удалось загрузить данные о задолженностях');
    }
  }, [showError]);

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
