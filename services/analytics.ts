import { privateApi } from './ApiClient';

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
  dutyId: string;
  dutyName: string;
  debt: number;
  accrued?: number;
  paid?: number;
  monthlyAmount: number;
  periods: DutyPeriod[];
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

      console.log('params: ', { endDate, worksId: worksIds, workerId: targetUserId });
      const response = await privateApi.get<UsersWorksClosurePeriodsAnalysisResult>(
        `/analytics/user/works-closure-periods-analysis`,
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
      console.error('Error fetching works-closure periods analysis:', error);
      throw error;
    }
  },

  /**
   * Получить задолженности текущего пользователя
   */
  async getMyDebts(): Promise<MyDebtsResponse> {
    try {
      const response = await privateApi.get<MyDebtsResponse>('/analytics/user/my-debts');
      return response.data;
    } catch (error) {
      console.error('Error fetching my debts:', error);
      throw error;
    }
  },
}; 