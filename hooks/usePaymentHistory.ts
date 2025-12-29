'use client';
import { useCallback, useState } from 'react';
import { PaymentHistory, PaymentHistoryDto } from '../types/payment';
import { useGetPaymentHistoryQuery } from '../store/services/api';

interface UsePaymentHistoryResult {
  payments: PaymentHistory['payments'];
  total: number;
  totalAmountRub: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: PaymentHistoryDto;
  setFilters: (filters: Partial<PaymentHistoryDto>) => void;
  refetch: () => void;
}

export function usePaymentHistory(userId?: string): UsePaymentHistoryResult {
  const [filters, setFiltersState] = useState<PaymentHistoryDto>({
    page: 1,
    limit: 20,
    viewerId: userId,
  });

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useGetPaymentHistoryQuery(filters, {
    refetchOnMountOrArgChange: true,
  });

  const setFilters = useCallback((newFilters: Partial<PaymentHistoryDto>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      // При изменении фильтров сбрасываем страницу на первую, кроме случая когда явно указана страница
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const errorString = queryError
    ? 'message' in queryError
      ? (queryError as any).message
      : 'Ошибка загрузки истории выплат'
    : null;

  return {
    payments: data?.payments || [],
    total: data?.total || 0,
    totalAmountRub: data?.totalAmountRub || 0,
    page: data?.page || filters.page || 1,
    limit: data?.limit || filters.limit || 20,
    totalPages: data?.totalPages || 0,
    loading: isLoading || isFetching,
    error: errorString,
    filters,
    setFilters,
    refetch,
  };
}
