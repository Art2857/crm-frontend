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
  isPaymentDue: boolean;
  lastClosureDate: string | null;
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
  remainingDebt: number;
  isPaymentDue: boolean;
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

export interface MyDebt {
  workId: string;
  workName: string;
  responsibleUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  duties: DutyDebt[];
  totalDebt: number;
  totalAccrued: number;
  totalPaid: number;
  isPaymentDue: boolean;
  lastClosureDate: string;
  payments: Array<{
    id: string;
    amount: number;
    paymentType: 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';
    description: string | null;
    paymentDate: string;
    createdAt: string;
  }>;
}

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
  days: number;
  monthDays: number;
  duties: Array<{
    dutyId: string;
    dutyName: string;
    monthlyAmount: number;
    calculatedAmount: number;
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
  isPaymentDue: boolean;
  lastClosureDate: string | null;
  duties: DutyDetail[];
  userPeriods?: any;
  paymentHistory?: PaymentHistoryItem[];
} 