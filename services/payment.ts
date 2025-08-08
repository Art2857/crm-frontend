import { privateApi } from './ApiClient';
import {
  PaymentDebts,
  PaymentCalculation,
  PaymentResponse,
  PaymentHistory,
  MyDebts,
  MyPayments,
  GetPaymentDebtsDto,
  CalculatePaymentDto,
  MakePaymentDto,
  PaymentHistoryDto,
  CreatePaymentAndCloseDto,
  CreatePaymentAndCloseResponseDto
} from '../types/payment';

/**
 * Получает задолженности по выплатам (для ответственных)
 */
export async function fetchPaymentDebts(periodEnd?: string): Promise<PaymentDebts> {
  const params = new URLSearchParams();
  if (periodEnd) {
    params.append('periodEnd', periodEnd);
  }
  
  const url = `/payments/debts${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await privateApi.get<PaymentDebts>(url);
  
  return response.data;
}

/**
 * Рассчитывает выплату для конкретного сотрудника
 */
export const calculatePayment = async (params: CalculatePaymentDto): Promise<PaymentCalculation> => {
  try {
    const searchParams = new URLSearchParams({
      workId: params.workId,
      userId: params.userId,
    });

    if (params.periodStart) {
      searchParams.append('periodStart', params.periodStart);
    }
    if (params.periodEnd) {
      searchParams.append('periodEnd', params.periodEnd);
    }
    if (params.dutyId) {
      searchParams.append('dutyId', params.dutyId);
    }

    const response = await privateApi.get<PaymentCalculation>(`/payments/calculate?${searchParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error calculating payment:', error);
    throw error;
  }
};

/**
 * Производит выплату сотруднику
 */
export const makePayment = async (paymentData: MakePaymentDto): Promise<PaymentResponse> => {
  try {
    const response = await privateApi.post<PaymentResponse>('/payments', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error making payment:', error);
    throw error;
  }
};

/**
 * Получает историю выплат
 */
export const fetchPaymentHistory = async (params?: PaymentHistoryDto): Promise<PaymentHistory> => {
  try {
    const searchParams = new URLSearchParams();
    
    if (params?.workId) searchParams.append('workId', params.workId);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.paymentType) searchParams.append('paymentType', params.paymentType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString() 
      ? `/payments/history?${searchParams.toString()}`
      : `/payments/history`;

    const response = await privateApi.get<PaymentHistory>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Получает задолженности текущего пользователя (что ему должны)
 */
export const fetchMyDebts = async (): Promise<MyDebts> => {
  try {
    const response = await privateApi.get<MyDebts>('/analytics/user/my-debts');
    return response.data;
  } catch (error) {
    console.error('Error fetching my debts:', error);
    throw error;
  }
};

/**
 * Получает статистику выплат пользователя
 */
export const fetchMyPayments = async (): Promise<MyPayments> => {
  try {
    const response = await privateApi.get<MyPayments>('/payments/my-payments');
    return response.data;
  } catch (error) {
    console.error('Error fetching my payments:', error);
    throw error;
  }
};

/**
 * Удаляет выплату (отменяет ошибочную выплату)
 */
export const deletePayment = async (paymentId: string): Promise<void> => {
  try {
    await privateApi.delete(`/payments/${paymentId}`);
  } catch (error) {
    console.error('Error deleting payment:', error);
    if (error instanceof Error) {
      throw new Error(`Не удалось удалить выплату: ${error.message}`);
    }
    throw new Error('Не удалось удалить выплату');
  }
};

/**
 * Создает выплату и закрывает период
 */
export const createPaymentAndClose = async (paymentData: CreatePaymentAndCloseDto): Promise<CreatePaymentAndCloseResponseDto> => {
  try {
    const response = await privateApi.post<CreatePaymentAndCloseResponseDto>('/payments/create-payment-and-close', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error creating payment and closing period:', error);
    throw error;
  }
}; 