// Типы данных для системы выплат

export interface DutyPeriod {
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  debt: number;
  accrued?: number;
}

export interface DutyDetail {
  dutyId: string;
  dutyName: string;
  monthlyAmount: number;
  debt: number;
  currency?: string;
  accrued?: number;
  paid?: number;
  periods?: DutyPeriod[];
}

export interface WorkDetail {
  workId: string;
  workName: string;
  duties: DutyDetail[];
  totalDebt: number;
  paidAmount: number;
  totalAccrued?: number;
  isPaymentDue: boolean;
  lastClosureDate: string | null;
  requiresAttention?: boolean; // индикатор «требует внимания» по правилам зарплаты
  users?: UserWorkDebt[];
  salary: number;
}

export interface ResponsibleUser {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  salaryDays: number[];
  works: WorkDetail[];
  totalDebt: number;
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  isPaymentDue: boolean;
  requiresAttention?: boolean; // есть хотя бы одна работа, требующая внимания
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface DutyDebt {
  id: string;
  name: string;
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

// MyDebt перенесен в services/analytics.ts для избежания дублирования
// Импортируйте из: import { MyDebt } from '../services/analytics';

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  type: 'SALARY' | 'BONUS' | 'ADVANCE' | 'EXTRA';
  description: string;
  date: string;
  fromUser: { firstName: string; lastName: string };
  toUser: { firstName: string; lastName: string };
  workName: string;
  direction: 'SENT' | 'RECEIVED';
}

// Новый тип для группировки обязанностей по работам
export interface WorkDutiesGroup {
  workId: string;
  workName: string;
  duties: Array<{
    dutyId: string;
    dutyName: string;
    monthlyAmount: number;
    calculatedAmount: number;
    currency?: string;
    periods?: DutyPeriod[];
  }>;
}

export interface PeriodCalculation {
  startDate: string; // ISO Date
  endDate: string; // ISO Date, верхняя граница периода (дата не включается)
  days: number; // Количество рабочих дней в периоде
  monthDays: number; // Количество рабочих дней в месяце
  duties: Array<{
    dutyId: string;
    dutyName: string;
    monthlyAmount: number;
    calculatedAmount: number;
    currency?: string;
    // Для общего расчёта пользователя отображаем источник обязанности
    workId?: string;
    workName?: string;
    periods?: DutyPeriod[];
  }>;
  // Новое поле для группировки по работам
  workGroups?: WorkDutiesGroup[];
  totalAmount: number;
}

export interface DetailedCalculation {
  userId: string;
  workId: string;
  userName?: string; // Добавляем имя пользователя
  workName?: string; // Добавляем название работы
  periods: PeriodCalculation[];
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number; // Добавляем оставшийся долг
  lastClosureDate: string | null;
  paymentHistory: Array<{
    id: string;
    workId?: string | null;
    workName?: string | null;
    amount: number;
    type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';
    description: string;
    date: string;
    createdAt: string;
    currency?: 'RUB' | 'USD';
  }>;
}

export interface PaymentFormData {
  userId: string;
  workId: string;
  dutyId?: string;
  amount: number;
  userName: string;
  workName: string;
  avatarUrl?: string | null;
  calculationDate?: string; // Верхняя граница расчета; сама дата не входит в оплачиваемый интервал
}

export interface PaymentModalData {
  amount: number;
  type: string;
  description: string;
}

export interface CustomPaymentFormData {
  userId: string;
  workId: string;
  amount: number;
  type: string;
  description: string;
  userName: string;
  workName: string;
  paymentDate: string; // ���� ������� � ������� �����
  currency: 'RUB' | 'USD';
}

export interface UserWorkDebt {
  userId: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  totalDebt: number;
  totalAccrued?: number;
  totalPaid?: number;
  isPaymentDue: boolean;
  lastClosureDate: string | null;
  duties: DutyDetail[];
  userPeriods?: any;
  paymentHistory?: PaymentHistoryItem[];
}

export interface PaymentPeriodDetail {
  startDate: string;
  endDate: string;
  workingDays: number; // Количество рабочих дней в периоде
  monthDays: number; // Количество рабочих дней в месяце
  duties: Array<{
    id: string;
    name: string;
    calculatedValue: number;
    prorated: number;
  }>;
  totalForPeriod: number;
}
