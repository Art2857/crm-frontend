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
  currency?: 'RUB' | 'USD';
  salary: number;
  releaseDate: string | null;
  expenses: number; // Расходы - сумма всех DistributionDetail.calculatedValue
  income: number; // Доходы - salary - expenses
  createdAt: string;
  updatedAt: string;
  // USD значения (предвычисленные на бэкенде)
  salaryUsd?: number;
  expensesUsd?: number;
  incomeUsd?: number;
  // Оригинальные значения в валюте работы
  originalSalary?: number;
  originalExpenses?: number;
  originalIncome?: number;
  isConfidential?: boolean;
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
  totalsUsd?: {
    totalSalary: number;
    totalExpenses: number;
    totalIncome: number;
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
  grandTotalsUsd?: {
    totalSalary: number;
    totalExpenses: number;
    totalIncome: number;
  };
}
