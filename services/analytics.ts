import { privateApi } from './ApiClient';
import { ANALYTICS_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';
import {
  ResponsibleUser,
  WorkDetail,
  DetailedCalculation,
} from '../types/payments';
import { Role } from '../types/user';

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
  currency?: string;
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
    _role: Role,
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
      endDate: string; // Российский формат DD.MM.YYYY
      users: Array<{
        userId: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        salaryDays?: number[];
        totals: {
          totalAccrued: number;
          totalPaid: number;
          totalDebt: number;
          remainingDebt: number;
          isPaymentDue: boolean;
          requiresAttention?: boolean;
        };
        works: Array<{
          workId: string;
          workName: string;
          salary: number;
          lastClosureDate: string | null;
          totals: { accrued: number; paid: number; debt: number };
          requiresAttention?: boolean;
          duties: Array<{
            dutyId: string;
            dutyName: string;
            monthlyAmount: number;
            debt: number;
            currency?: string;
          }>;
        }>;
      }>;
    }>(ANALYTICS_ENDPOINTS.paymentsManagement, {
      params: { endDate, worksId: worksIds, workerId: targetUserId },
    });

    // Преобразуем к ResponsibleUser[], без перерасчётов — только переименование полей
    const users: ResponsibleUser[] = data.users.map((u) => {
      const works: WorkDetail[] = u.works.map((w) => {
        const duties = w.duties.map((d) => ({
          dutyId: d.dutyId,
          dutyName: d.dutyName,
          monthlyAmount: d.monthlyAmount,
          debt: d.debt,
          currency: d.currency,
        }));
        // Use backend aggregated RUB totals to avoid extra per-work calls
        const totalAccruedRub = w.totals.accrued;
        const overpaidAmount = Math.max(w.totals.paid - totalAccruedRub, 0);
        const requiresAttention = w.requiresAttention || false;
        return {
          workId: w.workId,
          workName: w.workName,
          duties,
          totalDebt: w.totals.debt,
          paidAmount: w.totals.paid,
          totalAccrued: totalAccruedRub,
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

      // Индикатор у пользователя — используем значение из бэкенда или вычисляем на основе работ
      const requiresAttentionUser =
        u.totals.requiresAttention !== undefined
          ? u.totals.requiresAttention
          : works.some((w) => w.requiresAttention);
      return {
        userId: u.userId,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        salaryDays: u.salaryDays ?? [15],
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
    role: Role;
    userId: string;
    workId: string;
    endDate: string;
  }): Promise<DetailedCalculation> {
    // Убираем role из query параметров - роль должна браться из JWT!
    const { role, ...queryParams } = params;
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculation,
      { params: queryParams }
    );
    return data;
  },

  /** Получить общий детальный расчёт по пользователю (все работы) */
  async getPaymentsCalculationUser(params: {
    role: Role;
    userId: string;
    endDate: string;
  }): Promise<DetailedCalculation> {
    // Убираем role из query параметров - роль должна браться из JWT!
    const { role, ...queryParams } = params;
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculationUser,
      { params: queryParams }
    );
    return data;
  },
  /**
   * Получить анализ закрытий и периодов работ, где текущий пользователь является ответственным
   * @param endDate Дата окончания анализируемого периода YYYY-MM-DD (по умолчанию вчера)
   * @param worksIds
   * @param targetUserId ID работника, по которому нужно делать поиск
   * @param role
   */
  // legacy endpoint kept for backward-compat in rare places; prefer paymentsManagement
  async getUserWorksClosurePeriodsAnalysis(
    role: Role,
    endDate?: string,
    worksIds?: string[],
    targetUserId?: string
  ): Promise<UsersWorksClosurePeriodsAnalysisResult> {
    // Redirect to new endpoint behaviour when possible
    const users = await this.getPaymentsManagement(
      role,
      endDate,
      worksIds,
      targetUserId
    );
    return {
      endDate: endDate || new Date().toISOString().split('T')[0],
      users: users.map((u) => ({
        userId: u.userId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        works: [],
        totalWorks: u.works.length,
        totalClosures: 0,
        totalPeriods: 0,
      })),
      totalUsers: users.length,
    } as unknown as UsersWorksClosurePeriodsAnalysisResult;
  },

  /**
   * Получить задолженности текущего пользователя
   */
  async getMyDebts(): Promise<MyDebtsResponse> {
    try {
      const response = await privateApi.get<MyDebtsResponse>(ANALYTICS_ENDPOINTS.myDebts);
      return response.data;
    } catch (error) {
      logger.error('Error fetching my debts:', error);
      throw error;
    }
  },
};
