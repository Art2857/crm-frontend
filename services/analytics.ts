import { privateApi } from './ApiClient';
import { ANALYTICS_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';
import {
  ResponsibleUser,
  WorkDetail,
  DetailedCalculation,
} from '../types/payments';

// ==========================
// Types returned by backend
// ==========================

interface DistributionDutyInfo {
  id: string;
  name: string;
  basePrice: number | null;
  basePercentage: number | null;
}

interface DistributionDetail {
  id: string;
  dutyId: string;
  userId: string;
  price: number | null;
  percentage: number | null;
  calculatedValuePeriod?: number;
  duty: DistributionDutyInfo;
}

interface WorkHistoryPeriod {
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  distributionDetails: DistributionDetail[];
}

interface WorkHistoryPeriodsResult {
  dutiesPeriods: WorkHistoryPeriod[];
  totalPeriods: number;
  requestedPeriod: {
    startDate: string;
    endDate: string;
  };
}

interface PaymentClosureUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName?: string | null;
  email: string;
}

interface PaymentClosureInfo {
  id: string;
  workId: string;
  userId: string;
  closureDate: string;
  createdAt: string;
  user: PaymentClosureUser;
}

interface PaymentClosureWithPeriods {
  closure: PaymentClosureInfo;
  userPeriods: WorkHistoryPeriodsResult;
}

interface WorkWithClosuresAndPeriods {
  workId: string;
  workName: string;
  salary: number;
  createdAt: string;
  updatedAt: string;
  releaseDate: string | null;
  usersClosuresWithPeriods: PaymentClosureWithPeriods[];
}

// --------------------------
// Новые типы (пользователь → работы)
// --------------------------

interface UserWithWorksAndPeriods {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  works: WorkWithClosuresAndPeriods[];
  totalWorks: number;
  totalClosures: number;
  totalPeriods: number;
}

interface UsersWorksClosurePeriodsAnalysisResult {
  endDate: string;
  users: UserWithWorksAndPeriods[];
  totalUsers: number;
}

// ==========================
// Types for My Debts
// ==========================

interface DutyPeriod {
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  debt: number;
  accrued?: number;
}

interface DutyDebt {
  id: string; // ← ПРАВИЛЬНО! Backend возвращает id
  name: string; // ← ПРАВИЛЬНО! Backend возвращает name
  monthlyAmount: number;
  totalAccrued: number;
  totalDebt: number;
  totalPaid: number;
  calculatedPeriods: Array<{
    accrued: number;
    debt: number;
    paid: number;
    start: string;
    end: string;
  }>;
}

interface ResponsibleUserDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface MyDebt {
  workId: string;
  workName: string;
  responsibleUser: ResponsibleUserDto;
  lastClosureDate: string;
  totalDebt: number;
  totalAccrued: number;
  totalPaid: number;
  isPaymentDue: boolean;
  duties: DutyDebt[];
  payments?: Array<{
    id: string;
    amount: number;
    paymentType: 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';
    description: string | null;
    paymentDate: string;
    createdAt: string;
  }>;
}

export interface MyDebtsResponse {
  debts: MyDebt[];
}

export const analyticsService = {
  /**
   * Получить агрегированные данные для вкладки «Управление выплатами»
   * Возвращает уже готовые ResponsibleUser[]
   */
  async getPaymentsManagement(
    endDate?: string,
    worksIds?: string[],
    targetUserId?: string
  ): Promise<ResponsibleUser[]> {
    // дата по умолчанию — вчера
    if (!endDate) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      endDate = date.toISOString().split('T')[0];
    }

    const { data } = await privateApi.get<{
      endDateIso: string;
      endDateRu: string;
      users: Array<{
        userId: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        salaryDay?: number | null;
        totals: {
          totalAccrued: number;
          totalPaid: number;
          totalDebt: number;
          remainingDebt: number;
          isPaymentDue: boolean;
        };
        works: Array<{
          workId: string;
          workName: string;
          salary: number;
          lastClosureDate: string | null;
          totals: { accrued: number; paid: number; debt: number };
          duties: Array<{
            dutyId: string;
            dutyName: string;
            monthlyAmount: number;
            debt: number;
          }>;
        }>;
      }>;
    }>(ANALYTICS_ENDPOINTS.paymentsManagement, {
      params: { endDate, worksId: worksIds, workerId: targetUserId },
    });

    // Подготовим дату расчёта для вычисления индикаторов «внимания»
    const calcDate = endDate ? new Date(endDate) : new Date();

    // Преобразуем к ResponsibleUser[], без перерасчётов — только переименование полей
    const users: ResponsibleUser[] = data.users.map((u) => {
      const works: WorkDetail[] = u.works.map((w) => {
        const duties = w.duties.map((d) => ({
          dutyId: d.dutyId,
          dutyName: d.dutyName,
          monthlyAmount: d.monthlyAmount,
          debt: d.debt,
        }));
        const totalAccrued = duties.reduce((sum, d) => sum + (d.debt || 0), 0);
        const overpaidAmount = Math.max(w.totals.paid - totalAccrued, 0);
        // Индикатор «требует внимания»: если с даты последнего закрытия до даты расчёта прошло >= 1 календарный месяц
        const requiresAttention = (() => {
          if (!w.lastClosureDate) return false;
          const lc = new Date(w.lastClosureDate);
          const end = calcDate;
          const monthsDiff =
            (end.getFullYear() - lc.getFullYear()) * 12 +
            (end.getMonth() - lc.getMonth());
          if (monthsDiff > 1) return true;
          if (monthsDiff < 1) return false;
          // Ровно один месяц разницы — дополнительно проверяем число
          return end.getDate() >= lc.getDate();
        })();
        return {
          workId: w.workId,
          workName: w.workName,
          duties,
          totalDebt: w.totals.debt,
          paidAmount: w.totals.paid,
          totalAccrued,
          overpaidAmount,
          requiresAttention,
          isPaymentDue: w.totals.debt > 0,
          lastClosureDate: w.lastClosureDate,
          users: [
            {
              userId: u.userId,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email,
              totalDebt: w.totals.debt,
              isPaymentDue: w.totals.debt > 0,
              lastClosureDate: w.lastClosureDate,
              duties,
            },
          ],
          salary: w.salary,
        } as WorkDetail;
      });

      // Индикатор у пользователя — если хотя бы одна работа требует внимания
      const requiresAttentionUser = works.some((w) => w.requiresAttention);
      return {
        userId: u.userId,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        salaryDay: u.salaryDay ?? 15,
        works,
        totalDebt: u.totals.totalDebt,
        totalAccrued: u.totals.totalAccrued,
        totalPaid: u.totals.totalPaid,
        overpaidAmount: works.reduce((s, w) => s + (w.overpaidAmount || 0), 0),
        remainingDebt: u.totals.remainingDebt,
        isPaymentDue: u.totals.isPaymentDue,
        requiresAttention: requiresAttentionUser,
        lastPaymentDate: null,
        lastPaymentAmount: null,
      } as ResponsibleUser;
    });

    return users;
  },

  /** Получить детальный расчёт по работе/пользователю для модалки */
  async getPaymentsCalculation(params: {
    userId: string;
    workId: string;
    endDate: string;
  }): Promise<DetailedCalculation> {
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculation,
      { params }
    );
    return data;
  },

  /** Получить общий детальный расчёт по пользователю (все работы) */
  async getPaymentsCalculationUser(params: {
    userId: string;
    endDate: string;
  }): Promise<DetailedCalculation> {
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculationUser,
      { params }
    );
    return data;
  },
  /**
   * Получить анализ закрытий и периодов работ, где текущий пользователь является ответственным
   * @param endDate Дата окончания анализируемого периода YYYY-MM-DD (по умолчанию вчера)
   * @param worksIds
   * @param targetUserId ID работника, по которому нужно делать поиск
   */
  async getUserWorksClosurePeriodsAnalysis(
    endDate?: string,
    worksIds?: string[],
    targetUserId?: string
  ): Promise<UsersWorksClosurePeriodsAnalysisResult> {
    try {
      // Если дата не передана — используем вчерашний день
      if (!endDate) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        endDate = date.toISOString().split('T')[0];
      }

      logger.debug('params: ', {
        endDate,
        worksId: worksIds,
        workerId: targetUserId,
      });
      const response =
        await privateApi.get<UsersWorksClosurePeriodsAnalysisResult>(
          ANALYTICS_ENDPOINTS.worksClosurePeriodsAnalysis,
          {
            params: {
              endDate,
              worksId: worksIds,
              workerId: targetUserId,
            },
          }
        );

      return response.data;
    } catch (error) {
      logger.error('Error fetching works-closure periods analysis:', error);
      throw error;
    }
  },

  /**
   * Получить задолженности текущего пользователя
   */
  async getMyDebts(): Promise<MyDebtsResponse> {
    try {
      const response = await privateApi.get<MyDebtsResponse>(
        ANALYTICS_ENDPOINTS.myDebts
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching my debts:', error);
      throw error;
    }
  },
};
