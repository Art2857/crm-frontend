import { privateApi } from './ApiClient';
import { PAYMENTS_ENDPOINTS } from './endpoints';
import {
  PaymentResponse,
  PaymentHistory,
  MakePaymentDto,
  PaymentHistoryDto,
  CreatePaymentAndCloseDto,
  CreatePaymentAndCloseResponseDto,
} from '../types/payment';
import { logger } from '../utils/logger';

/**
 * Производит выплату сотруднику
 */
export const makePayment = async (paymentData: MakePaymentDto): Promise<PaymentResponse> => {
  try {
    const response = await privateApi.post<PaymentResponse>(PAYMENTS_ENDPOINTS.base, paymentData);
    return response.data;
  } catch (error) {
    logger.error('Error making payment:', error);
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
      ? `${PAYMENTS_ENDPOINTS.history}?${searchParams.toString()}`
      : PAYMENTS_ENDPOINTS.history;

    const response = await privateApi.get<PaymentHistory>(url);
    return response.data;
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Удаляет выплату (отменяет ошибочную выплату)
 */
export const deletePayment = async (paymentId: string): Promise<void> => {
  try {
    await privateApi.delete(PAYMENTS_ENDPOINTS.byId(paymentId));
  } catch (error) {
    logger.error('Error deleting payment:', error);
    if (error instanceof Error) {
      throw new Error(`Не удалось удалить выплату: ${error.message}`);
    }
    throw new Error('Не удалось удалить выплату');
  }
};

/**
 * Создает выплату и закрывает период
 */
export const createPaymentAndClose = async (
  paymentData: CreatePaymentAndCloseDto,
): Promise<CreatePaymentAndCloseResponseDto> => {
  try {
    const response = await privateApi.post<CreatePaymentAndCloseResponseDto>(
      PAYMENTS_ENDPOINTS.createAndClose,
      paymentData,
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating payment and closing period:', error);
    throw error;
  }
};

/**
 * Получает текущую дату закрытия периода для пары работа+пользователь
 */
export const getClosureDate = async (workId: string, userId: string): Promise<string | null> => {
  try {
    const response = await privateApi.get<{ closureDate: string | null }>(
      `${PAYMENTS_ENDPOINTS.closureDate}?workId=${workId}&userId=${userId}`,
    );
    return response.data.closureDate;
  } catch (error) {
    logger.error('Error fetching closure date:', error);
    return null;
  }
};

export const closePeriod = async (params: {
  workId: string;
  userId: string;
  closureDate: string; // YYYY-MM-DD — дата «расчёт до», сама дата не входит в оплачиваемый интервал
}) => {
  const { data } = await privateApi.post(`${PAYMENTS_ENDPOINTS.base}/close-period`, {
    workId: params.workId,
    targetUserId: params.userId,
    closureDate: params.closureDate,
  });
  return data;
};

export const bulkCreateAndClose = async (
  items: Array<{
    workId: string;
    userId: string;
    amount: number; // 0 — только закрытие
    calculationDate: string; // YYYY-MM-DD
    description?: string;
  }>,
) => {
  const { data } = await privateApi.post(PAYMENTS_ENDPOINTS.bulkCreateAndClose, { items });
  return data;
};
