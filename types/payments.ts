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
  overpaidAmount?: number; // сверхурочные (переплата)
  isPaymentDue: boolean;
  lastClosureDate: string | null;
  requiresAttention?: boolean; // индикатор «требует внимания» по правилам ЗП
  users?: UserWorkDebt[];
  salary: number;
}

export interface ResponsibleUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  salaryDay: number;
  works: WorkDetail[];
  totalDebt: number;
  totalAccrued: number;
  totalPaid: number;
  overpaidAmount?: number; // переплата по пользователю (сумма сверхурочных по работам)
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
    periods?: DutyPeriod[];
  }>;
}

export interface PeriodCalculation {
  startDate: string;
  endDate: string;
  days: number; // Количество рабочих дней в периоде
  monthDays: number; // Количество рабочих дней в месяце
  duties: Array<{
    dutyId: string;
    dutyName: string;
    monthlyAmount: number;
    calculatedAmount: number;
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
    amount: number;
    type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';
    description: string;
    date: string;
  }>;
}

export interface PaymentFormData {
  userId: string;
  workId: string;
  dutyId?: string;
  amount: number;
  userName: string;
  workName: string;
  calculationDate?: string; // Дата расчета (дата закрытия)
}

export interface PaymentModalData {
  amount: number;
  type: string;
  description: string;
  date: string;
}

export interface CustomPaymentFormData {
  userId: string;
  workId: string;
  amount: number;
  type: string;
  description: string;
  userName: string;
  workName: string;
  paymentDate: string; // Новое поле для даты выплаты
}

export interface UserWorkDebt {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
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
