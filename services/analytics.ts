import { privateApi } from './ApiClient';
import { ANALYTICS_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';

// ==========================
// Types returned by backend
// ==========================

export interface DistributionDutyInfo {
  id: string;
  name: string;
  basePrice: number | null;
  basePercentage: number | null;
}

export interface DistributionDetail {
  id: string;
  dutyId: string;
  userId: string;
  price: number | null;
  percentage: number | null;
  calculatedValuePeriod?: number;
  duty: DistributionDutyInfo;
}

export interface WorkHistoryPeriod {
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  distributionDetails: DistributionDetail[];
}

export interface WorkHistoryPeriodsResult {
  dutiesPeriods: WorkHistoryPeriod[];
  totalPeriods: number;
  requestedPeriod: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentClosureUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName?: string | null;
  email: string;
}

export interface PaymentClosureInfo {
  id: string;
  workId: string;
  userId: string;
  closureDate: string;
  createdAt: string;
  user: PaymentClosureUser;
}

export interface PaymentClosureWithPeriods {
  closure: PaymentClosureInfo;
  userPeriods: WorkHistoryPeriodsResult;
}

export interface WorkWithClosuresAndPeriods {
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

export interface UserWithWorksAndPeriods {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  works: WorkWithClosuresAndPeriods[];
  totalWorks: number;
  totalClosures: number;
  totalPeriods: number;
}

export interface UsersWorksClosurePeriodsAnalysisResult {
  endDate: string;
  users: UserWithWorksAndPeriods[];
  totalUsers: number;
}

// ==========================
// Types for My Debts
// ==========================

export interface DutyPeriod {
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  debt: number;
  accrued?: number;
}

export interface DutyDebt {
  id: string;               // ← ПРАВИЛЬНО! Backend возвращает id
  name: string;             // ← ПРАВИЛЬНО! Backend возвращает name
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

export interface ResponsibleUserDto {
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

      logger.debug('params: ', { endDate, worksId: worksIds, workerId: targetUserId });
      const response = await privateApi.get<UsersWorksClosurePeriodsAnalysisResult>(
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
      const response = await privateApi.get<MyDebtsResponse>(ANALYTICS_ENDPOINTS.myDebts);
      return response.data;
    } catch (error) {
      logger.error('Error fetching my debts:', error);
      throw error;
    }
  },
}; 