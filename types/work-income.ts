export interface WorkIncome {
  id: string;
  workId: string;
  amount: number;
  currency: 'RUB' | 'USD';
  receivedDate: string; // YYYY-MM-DD format
  description?: string;
  exchangeRate?: number;
  convertedAmount?: number;
  convertedCurrency?: 'RUB' | 'USD';
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkIncomeRequest {
  workId: string;
  amount: number;
  currency: 'RUB' | 'USD';
  receivedDate: string; // YYYY-MM-DD format
  description?: string;
}

export interface UpdateWorkIncomeRequest {
  amount?: number;
  currency?: 'RUB' | 'USD';
  receivedDate?: string; // YYYY-MM-DD format
  description?: string;
}

export interface WorkIncomeFilters {
  workId?: string;
  currency?: 'RUB' | 'USD';
  fromDate?: string; // YYYY-MM-DD format
  toDate?: string; // YYYY-MM-DD format
  page?: number;
  limit?: number;
  sortBy?: 'receivedDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkIncomeListResponse {
  data: WorkIncome[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkIncomeStats {
  totalRub: number;
  totalUsd: number;
  avgSalaryRub: number; // Средняя ЗП в рублях с учетом коэффициентов рабочих дней
  avgSalaryUsd: number; // Средняя ЗП в долларах с учетом коэффициентов рабочих дней
  lastIncomeDate?: string; // YYYY-MM-DD format
  workingDaysTotal: number; // Общее количество рабочих дней в периоде
  totalDays: number; // Общее количество дней в периоде (включая выходные)
  releaseDate?: string; // Дата выхода на работу YYYY-MM-DD format
}

export interface CurrencyOption {
  value: 'RUB' | 'USD';
  label: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    value: 'RUB',
    label: 'Российские рубли',
    symbol: '₽',
  },
  {
    value: 'USD',
    label: 'Доллары США',
    symbol: '$',
  },
];

export const DEFAULT_WORK_INCOME_FILTERS: WorkIncomeFilters = {
  page: 1,
  limit: 20,
  sortBy: 'receivedDate',
  sortOrder: 'desc',
};

// Форматтеры для отображения

export interface FormattedWorkIncome extends WorkIncome {
  formattedAmount: string;
  formattedConvertedAmount?: string;
  formattedReceivedDate: string;
  currencySymbol: string;
  convertedCurrencySymbol?: string;
}

// Хелперы для валидации

export interface WorkIncomeValidationError {
  field: keyof CreateWorkIncomeRequest | keyof UpdateWorkIncomeRequest;
  message: string;
}

export interface WorkIncomeFormData {
  amount: string;
  currency: 'RUB' | 'USD';
  receivedDate: string;
  description: string;
}

export const EMPTY_WORK_INCOME_FORM: WorkIncomeFormData = {
  amount: '',
  currency: 'RUB',
  receivedDate: '',
  description: '',
};

// Типы для состояния компонентов

export interface WorkIncomeState {
  incomes: WorkIncome[];
  selectedIncome: WorkIncome | null;
  filters: WorkIncomeFilters;
  stats: WorkIncomeStats | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
}

export const INITIAL_WORK_INCOME_STATE: WorkIncomeState = {
  incomes: [],
  selectedIncome: null,
  filters: DEFAULT_WORK_INCOME_FILTERS,
  stats: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  successMessage: null,
};

// Типы для модальных окон

export interface WorkIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  income?: WorkIncome; // Для редактирования
  onSuccess?: (income: WorkIncome) => void;
}

export interface DeleteWorkIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  income: WorkIncome;
  onSuccess?: () => void;
}

// Утилитарные типы

export type WorkIncomeSortField = WorkIncomeFilters['sortBy'];
export type WorkIncomeSortOrder = WorkIncomeFilters['sortOrder'];
export type WorkIncomeCurrency = WorkIncome['currency'];

// API Response типы

export interface WorkIncomeApiResponse {
  success: boolean;
  data?: WorkIncome;
  message?: string;
  errors?: WorkIncomeValidationError[];
}

export interface WorkIncomeListApiResponse {
  success: boolean;
  data?: WorkIncomeListResponse;
  message?: string;
  errors?: string[];
}

export interface WorkIncomeStatsApiResponse {
  success: boolean;
  data?: WorkIncomeStats;
  message?: string;
}

// Типы для аналитики

export interface WorkIncomeAnalytics {
  monthlyTotals: {
    month: string; // YYYY-MM
    totalRub: number;
    totalUsd: number;
    recordsCount: number;
  }[];
  currencyDistribution: {
    currency: WorkIncomeCurrency;
    total: number;
    percentage: number;
  }[];
  averageIncomeByMonth: number;
  totalIncomeThisYear: {
    rub: number;
    usd: number;
  };
  growthRate: number; // Процент роста по сравнению с предыдущим периодом
}
