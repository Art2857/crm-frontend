'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PaymentHistory, PaymentHistoryDto, Payment } from '../types/payment';
import { fetchPaymentHistory } from '../services/payment';
import { on } from '../utils/eventBus';
import { useAppSelector } from '../store';

interface UsePaymentHistoryResult {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: PaymentHistoryDto;
  setFilters: (filters: Partial<PaymentHistoryDto>) => void;
  refetch: () => Promise<void>;
}

// Простое кэширование истории выплат в памяти сессии
type CacheKey = string;
const paymentHistoryCache: Record<CacheKey, PaymentHistory> = {};

const buildCacheKey = (filters: PaymentHistoryDto) => JSON.stringify(filters);

export function usePaymentHistory(): UsePaymentHistoryResult {
  const { user } = useAppSelector((state) => state.auth);
  const [data, setData] = useState<PaymentHistory>({
    payments: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PaymentHistoryDto>({
    page: 1,
    limit: 20,
  });

  // Используем ref для отслеживания активного запроса
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Проверяем кэш перед выполнением запроса
      const cacheKey = buildCacheKey(filters);
      if (paymentHistoryCache[cacheKey]) {
        setData(paymentHistoryCache[cacheKey]);
        return; // данные уже есть, пропускаем сетевой запрос
      }

      // Отменяем предыдущий запрос если он есть
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Создаем новый AbortController для текущего запроса
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const result = await fetchPaymentHistory(filters);

      // Проверяем, что запрос не был отменен
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
      }

      // Кладём в кэш
      paymentHistoryCache[cacheKey] = result;
    } catch (err) {
      // Проверяем, что ошибка не связана с отменой запроса
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error fetching payment history:', err);

        // Проверяем тип ошибки
        if (err instanceof Error) {
          if (
            err.name === 'AbortError' ||
            err.message.includes('REQUEST_CANCELLED')
          ) {
            // Игнорируем ошибки отмены запроса
            return;
          }
          setError(err.message);
        } else {
          setError('Ошибка загрузки истории выплат');
        }
      }
    } finally {
      // Сбрасываем loading только если запрос не был отменен
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Обработчик события создания новой выплаты
  useEffect(() => {
    const unsubscribe = on('paymentCreated', (event: CustomEvent<Payment>) => {
      const createdPaymentRaw: any = event.detail;
      const createdPayment: Payment =
        (createdPaymentRaw as any).payment ?? (createdPaymentRaw as any);

      // Проверяем, удовлетворяет ли новая выплата текущим фильтрам
      const matchesFilters = () => {
        if (filters.workId && createdPayment.workId !== filters.workId)
          return false;
        if (
          filters.userId &&
          createdPayment.toUserId !== filters.userId &&
          createdPayment.fromUserId !== filters.userId
        )
          return false;
        if (
          filters.paymentType &&
          createdPayment.paymentType !== filters.paymentType
        )
          return false;
        if (
          filters.startDate &&
          new Date(createdPayment.paymentDate) < new Date(filters.startDate)
        )
          return false;
        if (
          filters.endDate &&
          new Date(createdPayment.paymentDate) > new Date(filters.endDate)
        )
          return false;
        return true;
      };

      if (!matchesFilters()) {
        // Даже если не удовлетворяет, сбрасываем кэш – при смене фильтров получим свежие данные
        const cacheKey = buildCacheKey(filters);
        delete paymentHistoryCache[cacheKey];
        return;
      }

      setData((prev) => {
        const newPayments = [createdPayment, ...prev.payments];
        const limitedPayments = newPayments.slice(0, prev.limit);
        const updatedTotal = prev.total + 1;
        const updatedTotalPages = Math.ceil(updatedTotal / prev.limit);

        const updated: PaymentHistory = {
          ...prev,
          payments: limitedPayments,
          total: updatedTotal,
          totalPages: updatedTotalPages,
        };

        // Обновляем кэш
        const cacheKey = buildCacheKey(filters);
        paymentHistoryCache[cacheKey] = updated;

        return updated;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [filters]);

  useEffect(() => {
    fetchData();

    // Cleanup function для отмены запроса при размонтировании
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const setFilters = useCallback((newFilters: Partial<PaymentHistoryDto>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      // При изменении фильтров сбрасываем страницу на первую, кроме случая когда явно указана страница
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const refetch = useCallback(async () => {
    // При принудительном обновлении игнорируем кэш
    const cacheKey = buildCacheKey(filters);
    delete paymentHistoryCache[cacheKey];
    await fetchData();
  }, [fetchData, filters]);

  return {
    payments: data.payments,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  };
}
