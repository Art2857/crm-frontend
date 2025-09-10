export enum PaymentType {
  SALARY = 'SALARY',
  BONUS = 'BONUS',
  ADVANCE = 'ADVANCE',
  EXTRA = 'EXTRA',
}

export interface PaymentPeriodDetail {
  startDate: Date;
  endDate: Date;
  workingDays: number;
  monthDays: number;
  duties: Array<{
    id: string;
    name: string;
    calculatedValue: number;
    prorated: number;
  }>;
  totalForPeriod: number;
}

export interface PaymentCalculation {
  totalDebt: number;
  paidAmount: number;
  remainingDebt: number;
  periodStart: Date;
  periodEnd: Date;
  periodDetails: PaymentPeriodDetail[];
}

export interface Payment {
  id: string;
  fromUserId: string;
  toUserId: string;
  workId: string;
  dutyId: string | null;
  amount: number;
  paymentType: PaymentType;
  description: string | null;
  paymentDate: Date;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  fromUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  toUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
  work: {
    name: string;
  };
  duty?: {
    name: string;
  };
}

export interface PaymentResponse {
  payment: Payment;
  closureUpdated: boolean;
  overpayment?: number;
  additionalPayment?: Payment;
}

export interface WorkDebt {
  workId: string;
  workName: string;
  users: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    totalDebt: number;
    isPaymentDue: boolean;
    lastClosureDate: Date | null;
    duties: Array<{
      dutyId: string;
      dutyName: string;
      debt: number;
    }>;
  }>;
}

export interface PaymentDebts {
  works: WorkDebt[];
  totalDebt: number;
}

export interface PaymentHistory {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MyDebts {
  debts: Array<{
    workId: string;
    workName: string;
    responsibleUser: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    totalDebt: number;
    isPaymentDue: boolean;
    lastClosureDate: Date | null;
    duties: Array<{
      dutyId: string;
      dutyName: string;
      debt: number;
      monthlyAmount: number;
      dailyAmount: number;
    }>;
  }>;
}

export interface MyPayments {
  statistics: {
    totalSent: number;
    totalReceived: number;
    currentMonthSent: number;
    currentMonthReceived: number;
  };
  recentPayments: Payment[];
}

// DTO для запросов
export interface GetPaymentDebtsDto {
  workId?: string;
  periodEnd?: Date;
}

export interface CalculatePaymentDto {
  workId: string;
  userId: string;
  periodStart?: Date;
  periodEnd?: Date;
  dutyId?: string;
}

export interface MakePaymentDto {
  workId: string;
  userId: string;
  amount: number;
  paymentType: PaymentType;
  description?: string;
  periodEnd?: Date;
  dutyId?: string;
  paymentDate?: Date; // Добавлено поле для даты выплаты
}

export interface PaymentHistoryDto {
  workId?: string;
  userId?: string;
  paymentType?: PaymentType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// Новые типы для create-payment-and-close
export interface CreatePaymentAndCloseDto {
  workId: string;
  userId: string;
  amount: number;
  paymentDate: Date;
  description: string;
}

export interface PaymentClosureResponseDto {
  id: string;
  workId: string;
  userId: string;
  closureDate: Date;
}

export interface CreatePaymentAndCloseResponseDto {
  payment: Payment;
  updatedClosure: PaymentClosureResponseDto;
}
