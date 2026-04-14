import { useCallback, useState } from 'react';
import { analyticsService, MyDebt } from '../../services/analytics';
import { logger } from '../../utils/logger';
import { useNotification } from '../../contexts/NotificationContext';
import { ResponsibleUser } from '../../types/payments';
import { useAppSelector } from '../../store';
import { getCurrentDateISO } from '../../utils/date';

interface LoadParams {
  endDate?: string;
  targetWorkId?: string;
  targetUserId?: string;
}

function mergeWorksById(
  existingWorks: ResponsibleUser['works'],
  updatedWorks: ResponsibleUser['works'],
) {
  const updatedWorksMap = new Map(updatedWorks.map((work) => [work.workId, work] as const));

  const mergedWorks = existingWorks.map(
    (existingWork) => updatedWorksMap.get(existingWork.workId) ?? existingWork,
  );

  const newWorks = updatedWorks.filter(
    (work) => !existingWorks.some((existing) => existing.workId === work.workId),
  );

  return [...mergedWorks, ...newWorks];
}

function buildUserTotalsFromWorks(works: ResponsibleUser['works']) {
  const totalAccrued = works.reduce((sum, work) => sum + (work.totalAccrued || 0), 0);
  const totalPaid = works.reduce((sum, work) => sum + (work.paidAmount || 0), 0);
  const totalDebt = works.reduce(
    (sum, work) => sum + ((work.totalAccrued || 0) - (work.paidAmount || 0)),
    0,
  );
  const remainingDebt = totalDebt;

  return {
    totalAccrued,
    totalPaid,
    totalDebt,
    remainingDebt,
  };
}

function parseIsoDateToUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function buildClampedDateUtc(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth)));
}

function getNextSalaryDate(user: ResponsibleUser, referenceDateIso: string): Date {
  const referenceDate = parseIsoDateToUtc(referenceDateIso);
  const salaryDays = user.salaryDays.length > 0 ? user.salaryDays : [1];

  let nextSalaryDate: Date | null = null;

  for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth() + monthOffset;

    for (const salaryDay of salaryDays) {
      const candidate = buildClampedDateUtc(year, month, salaryDay);
      if (candidate <= referenceDate) {
        continue;
      }

      if (nextSalaryDate === null || candidate < nextSalaryDate) {
        nextSalaryDate = candidate;
      }
    }
  }

  return (
    nextSalaryDate ??
    buildClampedDateUtc(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1)
  );
}

function compareUsersForPayments(
  left: ResponsibleUser,
  right: ResponsibleUser,
  referenceDateIso: string,
) {
  const leftRequiresAttention = left.requiresAttention === true ? 1 : 0;
  const rightRequiresAttention = right.requiresAttention === true ? 1 : 0;

  if (leftRequiresAttention !== rightRequiresAttention) {
    return rightRequiresAttention - leftRequiresAttention;
  }

  if (left.remainingDebt !== right.remainingDebt) {
    return right.remainingDebt - left.remainingDebt;
  }

  const leftNextSalaryDate = getNextSalaryDate(left, referenceDateIso);
  const rightNextSalaryDate = getNextSalaryDate(right, referenceDateIso);

  if (leftNextSalaryDate.getTime() !== rightNextSalaryDate.getTime()) {
    return leftNextSalaryDate.getTime() - rightNextSalaryDate.getTime();
  }

  const leftName = `${left.firstName || ''} ${left.lastName || ''}`.trim();
  const rightName = `${right.firstName || ''} ${right.lastName || ''}`.trim();
  return leftName.localeCompare(rightName, 'ru');
}

function sortUsersForPayments(users: ResponsibleUser[], referenceDateIso: string) {
  return users
    .slice()
    .sort((left, right) => compareUsersForPayments(left, right, referenceDateIso));
}

export function usePaymentsData() {
  const { showError } = useNotification();
  const { user } = useAppSelector((state) => state.auth);

  const [usersData, setUsersData] = useState<ResponsibleUser[]>([]);
  const [myDebts, setMyDebts] = useState<MyDebt[]>([]);

  const getWorksData = useCallback(
    async (data: LoadParams = {}) => {
      if (!user) {
        throw new Error('Пользователь не аутентифицирован');
      }

      const { endDate, targetWorkId, targetUserId } = data;
      const referenceDateIso = endDate ?? getCurrentDateISO();

      const mappedUsers = await analyticsService.getPaymentsManagement(
        endDate,
        targetWorkId ? [targetWorkId] : undefined,
        targetUserId,
      );

      return sortUsersForPayments(mappedUsers, referenceDateIso);
    },
    [user],
  );

  const fetchWorksData = useCallback(
    async (data: LoadParams = {}) => {
      const mappedUsers = await getWorksData(data);
      setUsersData(mappedUsers);
    },
    [getWorksData],
  );

  const updateWorksData = useCallback(
    async (data: LoadParams = {}) => {
      const mappedUsers = await getWorksData(data);
      setUsersData((prev) => {
        const updatedUsersMap = new Map(
          mappedUsers.map((userEntry) => [userEntry.userId, userEntry] as const),
        );

        const nextUsers = prev.map((existingUser) => {
          const updatedUserInNewResult = updatedUsersMap.get(existingUser.userId);
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
          (mappedUser) => !prev.some((existingUser) => existingUser.userId === mappedUser.userId),
        );

        return sortUsersForPayments(
          [...nextUsers, ...newUsers],
          data.endDate ?? getCurrentDateISO(),
        );
      });
    },
    [getWorksData],
  );

  const fetchMyDebtsData = useCallback(async () => {
    try {
      const myDebtsData = await analyticsService.getMyDebts();
      setMyDebts(myDebtsData.debts);
    } catch (error) {
      logger.error('Ошибка загрузки моих задолженностей:', error);
      showError('Не удалось загрузить данные о задолженностях');
    }
  }, [showError]);

  return {
    // state
    usersData,
    setUsersData,
    myDebts,
    setMyDebts,
    // actions
    fetchWorksData,
    updateWorksData,
    fetchMyDebtsData,
  };
}
