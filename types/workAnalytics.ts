/**
 * Типы для аналитических данных работ
 */

/**
 * Аналитические данные одной работы
 */
export interface WorkAnalytics {
  id: string;
  name: string;
  responsibleUserId: string;
  responsibleUserName: string;
  salary: number;
  releaseDate: string | null;
  expenses: number; // Расходы - сумма всех DistributionDetail.calculatedValue
  income: number; // Доходы - salary - expenses
  createdAt: string;
  updatedAt: string;
}

/**
 * Аналитические данные работ, сгруппированные по ответственному
 */
export interface WorkAnalyticsByResponsible {
  responsibleUserId: string;
  responsibleUserName: string;
  works: WorkAnalytics[];
  totals: {
    totalSalary: number;
    totalExpenses: number;
    totalIncome: number;
    worksCount: number;
  };
}

/**
 * Полный ответ с аналитикой работ
 */
export interface WorkAnalyticsResponse {
  grouped: WorkAnalyticsByResponsible[];
  grandTotals: {
    totalSalary: number;
    totalExpenses: number;
    totalIncome: number;
    worksCount: number;
    responsibleCount: number;
  };
}
