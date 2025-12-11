export enum PaymentType {
  SALARY = 'SALARY',
  BONUS = 'BONUS',
  ADVANCE = 'ADVANCE',
  EXTRA = 'EXTRA',
}

export interface PaymentPeriodDetail {
  startDate: string;
  endDate: string;
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
  periodStart: string;
  periodEnd: string;
  periodDetails: PaymentPeriodDetail[];
}

// Core payment entity used in history and responses
export interface Payment {
  id: string;
  workId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentType: PaymentType;
  description?: string | null;
  paymentDate: string; // YYYY-MM-DD
  createdAt?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  work: {
    id: string;
    name: string;
  };
  duty?: {
    id: string;
    name: string;
  } | null;
  fromUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  toUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
  currency?: 'RUB' | 'USD';
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
    lastClosureDate: string | null;
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
    lastClosureDate: string | null;
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

// DTOs
export interface GetPaymentDebtsDto {
  workId?: string;
  periodEnd?: string;
}

export interface CalculatePaymentDto {
  workId: string;
  userId: string;
  periodStart?: string;
  periodEnd?: string;
  dutyId?: string;
}

// Create a one-off payment
export interface MakePaymentDto {
  workId: string;
  userId: string;
  amount: number;
  paymentType: PaymentType;
  description?: string;
  paymentDate: string; // YYYY-MM-DD
  currency?: 'RUB' | 'USD';
}

export interface PaymentHistoryDto {
  workId?: string;
  userId?: string;
  paymentType?: PaymentType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// create-payment-and-close
export interface CreatePaymentAndCloseDto {
  workId: string;
  userId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  description?: string;
  currency?: 'RUB' | 'USD';
}

export interface PaymentClosureResponseDto {
  id: string;
  workId: string;
  userId: string;
  closureDate: string;
}

export interface CreatePaymentAndCloseResponseDto {
  payment: Payment;
  updatedClosure: PaymentClosureResponseDto;
}
