export enum PaymentType {
  SALARY = 'SALARY',
  BONUS = 'BONUS',
  ADVANCE = 'ADVANCE',
  EXTRA = 'EXTRA',
}

// Core payment entity used in history and responses
export interface Payment {
  id: string;
  workId: string | null;
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentType: PaymentType;
  description?: string | null;
  paymentDate: string; // YYYY-MM-DD
  createdAt?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  work?: {
    name: string;
  } | null;
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
  exchangeRate?: number;
}

export interface PaymentResponse {
  payment: Payment;
  closureUpdated: boolean;
  additionalPayment?: Payment;
}

export interface PaymentHistory {
  payments: Payment[];
  total: number;
  totalAmountRub: number;
  page: number;
  limit: number;
  totalPages: number;
}

// DTOs
// Create a one-off payment
export interface MakePaymentDto {
  workId?: string;
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
  recipientId?: string;
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
