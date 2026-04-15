import { privateApi } from './ApiClient';
import { ANALYTICS_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';
import { getCurrentDateISO } from '../utils/date';
import { ResponsibleUser, WorkDetail, DetailedCalculation } from '../types/payments';

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
  avatarUrl?: string | null;
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
    targetUserId?: string,
  ): Promise<{ users: ResponsibleUser[]; hasResponsibleWorks: boolean }> {
    // дата по умолчанию — сегодня
    if (!endDate) {
      endDate = getCurrentDateISO();
    }

    const { data } = await privateApi.get<{
      endDate: string; // Российский формат DD.MM.YYYY
      hasResponsibleWorks: boolean;
      users: Array<{
        userId: string;
        login: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        avatarUrl?: string | null;
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

    const hasResponsibleWorks = data.hasResponsibleWorks === true;

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
        const requiresAttention = w.requiresAttention || false;
        return {
          workId: w.workId,
          workName: w.workName,
          duties,
          totalDebt: w.totals.debt,
          paidAmount: w.totals.paid,
          totalAccrued: totalAccruedRub,
          requiresAttention,
          isPaymentDue: w.totals.debt > 0,
          lastClosureDate: w.lastClosureDate,
          users: [
            {
              userId: u.userId,
              login: u.login,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email,
              avatarUrl: u.avatarUrl,
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
        login: u.login,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        avatarUrl: u.avatarUrl,
        salaryDays: u.salaryDays ?? [15],
        works,
        totalDebt: u.totals.totalDebt,
        totalAccrued: u.totals.totalAccrued,
        totalPaid: u.totals.totalPaid,
        remainingDebt: u.totals.remainingDebt,
        isPaymentDue: u.totals.isPaymentDue,
        requiresAttention: requiresAttentionUser,
        lastPaymentDate: null,
        lastPaymentAmount: null,
      } as ResponsibleUser;
    });

    return { users, hasResponsibleWorks };
  },

  /** Получить детальный расчёт по работе/пользователю для модалки */
  async getPaymentsCalculation(params: {
    userId: string;
    workId: string;
    endDate: string;
    dutyId?: string;
  }): Promise<DetailedCalculation> {
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculation,
      { params },
    );
    return data;
  },

  /** Получить общий детальный расчёт по пользователю (все работы) */
  async getPaymentsCalculationUser(params: {
    userId: string;
    endDate: string;
    worksId?: string[];
  }): Promise<DetailedCalculation> {
    const { data } = await privateApi.get<DetailedCalculation>(
      ANALYTICS_ENDPOINTS.paymentsCalculationUser,
      { params },
    );
    return data;
  },
  /**
   * Получить задолженности текущего пользователя
   */
  async getMyDebts(endDate?: string): Promise<MyDebtsResponse> {
    try {
      const response = await privateApi.get<MyDebtsResponse>(ANALYTICS_ENDPOINTS.myDebts, {
        params: endDate !== undefined ? { endDate } : {},
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching my debts:', error);
      throw error;
    }
  },
};
