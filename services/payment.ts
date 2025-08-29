import { privateApi } from './ApiClient';
import { PAYMENTS_ENDPOINTS, ANALYTICS_ENDPOINTS } from './endpoints';
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
  CreatePaymentAndCloseResponseDto,
} from '../types/payment';
import { logger } from '../utils/logger';
import { Role } from '../types/user';

/**
 * Получает задолженности по выплатам (для ответственных)
 */
// Прежний fetchPaymentDebts был завязан на отсутствующий /payments/debts —
// при необходимости следует использовать аналитику; удалено из экспорта.

/**
 * Рассчитывает выплату для конкретного сотрудника
 */
// Прежний calculatePayment был завязан на отсутствующий /payments/calculate —
// при необходимости перенести на аналитику и реализовать на бэке; удалено из экспорта.

/**
 * Производит выплату сотруднику
 */
export const makePayment = async (
  role: Role,
  paymentData: MakePaymentDto
): Promise<PaymentResponse> => {
  try {
    const response = await privateApi.post<PaymentResponse>(
      PAYMENTS_ENDPOINTS.base(role),
      paymentData
    );
    return response.data;
  } catch (error) {
    logger.error('Error making payment:', error);
    throw error;
  }
};

/**
 * Получает историю выплат
 */
export const fetchPaymentHistory = async (
  role: Role,
  params?: PaymentHistoryDto
): Promise<PaymentHistory> => {
  try {
    const searchParams = new URLSearchParams();

    if (params?.workId) searchParams.append('workId', params.workId);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.paymentType)
      searchParams.append('paymentType', params.paymentType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${PAYMENTS_ENDPOINTS.history(role)}?${searchParams.toString()}`
      : PAYMENTS_ENDPOINTS.history(role);

    const response = await privateApi.get<PaymentHistory>(url);
    return response.data;
  } catch (error) {
    logger.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Получает задолженности текущего пользователя (что ему должны)
 */
export const fetchMyDebts = async (role: Role): Promise<MyDebts> => {
  try {
    const response = await privateApi.get<MyDebts>(
      ANALYTICS_ENDPOINTS.myDebts(role)
    );
    return response.data;
  } catch (error) {
    logger.error('Error fetching my debts:', error);
    throw error;
  }
};

/**
 * Получает статистику выплат пользователя
 */
export const fetchMyPayments = async (role: Role): Promise<MyPayments> => {
  try {
    // Бэкенд не предоставляет /payments/my-payments. Используем /payments/history и агрегируем на клиенте
    const response = await privateApi.get<PaymentHistory>(
      PAYMENTS_ENDPOINTS.history(role)
    );
    const history = response.data;

    // Статистика: суммарно отправлено/получено и текущий месяц
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalSent = 0;
    let totalReceived = 0;
    let currentMonthSent = 0;
    let currentMonthReceived = 0;

    for (const p of history.payments) {
      const paymentDate = new Date(p.paymentDate);
      const isCurrentMonth =
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear;

      // Если текущий пользователь является отправителем/получателем — сервер уже отфильтровал релевантные записи
      // Определим направление по наличию from/to относительно userId недоступно здесь → считаем все платежи как «актуальные»
      // Разделить «отправлено/получено» корректно без userId нельзя — поэтому считаем суммарно в totalReceived
      // и используем totalSent = 0. При необходимости можно передать роль через отдельную ручку
      totalReceived += p.amount;
      if (isCurrentMonth) currentMonthReceived += p.amount;
    }

    return {
      statistics: {
        totalSent,
        totalReceived,
        currentMonthSent,
        currentMonthReceived,
      },
      recentPayments: history.payments.slice(0, 10),
    };
  } catch (error) {
    logger.error('Error fetching my payments:', error);
    throw error;
  }
};

/**
 * Удаляет выплату (отменяет ошибочную выплату)
 */
export const deletePayment = async (
  role: Role,
  paymentId: string
): Promise<void> => {
  try {
    await privateApi.delete(PAYMENTS_ENDPOINTS.byId(role, paymentId));
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
  role: Role,
  paymentData: CreatePaymentAndCloseDto
): Promise<CreatePaymentAndCloseResponseDto> => {
  try {
    const response = await privateApi.post<CreatePaymentAndCloseResponseDto>(
      PAYMENTS_ENDPOINTS.createAndClose(role),
      paymentData
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating payment and closing period:', error);
    throw error;
  }
};

export const closePeriod = async (
  role: Role,
  params: {
    workId: string;
    userId: string;
    closureDate: string; // YYYY-MM-DD — дата «расчёт до»
  }
) => {
  const { data } = await privateApi.post(
    `${PAYMENTS_ENDPOINTS.base(role)}/close-period`,
    {
      workId: params.workId,
      targetUserId: params.userId,
      closureDate: params.closureDate,
    }
  );
  return data;
};

export const bulkCreateAndClose = async (
  role: Role,
  items: Array<{
    workId: string;
    userId: string;
    amount: number; // 0 — только закрытие
    paymentDate: string; // YYYY-MM-DD
    description?: string;
  }>
) => {
  const { data } = await privateApi.post(
    PAYMENTS_ENDPOINTS.bulkCreateAndClose(role),
    { items }
  );
  return data;
};
