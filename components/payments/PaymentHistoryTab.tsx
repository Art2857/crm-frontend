'use client';

import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import { DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { usePaymentHistory } from '../../hooks/usePaymentHistory';
import PaymentHistoryFilters from './PaymentHistoryFilters';
import PaymentHistoryItem from './PaymentHistoryItem';
import { PaymentHistoryDto } from '../../types/payment';
import { deletePayment } from '../../services/payment';
import { useState } from 'react';
import { useAppSelector } from '../../store';
import { formatCurrency } from '../../utils/payments';

interface PaymentHistoryTabProps {
  currentUserId?: string;
  title?: string;
}

export default function PaymentHistoryTab({
  currentUserId,
  title = 'История выплат',
}: PaymentHistoryTabProps) {
  const { user } = useAppSelector((state) => state.auth);
  const {
    payments,
    total,
    totalAmountRub,
    page,
    limit,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = usePaymentHistory(currentUserId);

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleFiltersChange = (newFilters: Partial<PaymentHistoryDto>) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      workId: undefined,
      userId: undefined,
      paymentType: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту выплату?')) {
      try {
        setDeletingPaymentId(paymentId);
        await deletePayment(paymentId);
        await refetch(); // Перезагружаем данные после удаления
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert(
          error instanceof Error ? error.message : 'Ошибка при удалении выплаты'
        );
      } finally {
        setDeletingPaymentId(null);
      }
    }
  };

  // Force refetch on mount to ensure data is fresh, especially after mutations
  // that might have occurred while this tab was inactive/unmounted
  React.useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Показываем ошибку только если она действительно есть и не связана с загрузкой
  if (error && !loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="primary">
            Попробовать снова
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      {filtersOpen && (
        <PaymentHistoryFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      <Card className="overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex">
              <h2 className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
              {totalAmountRub > 0 && (
                <div className="flex items-center space-x-2 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 ml-6">
                  <span className="font-medium">Всего получено:</span>
                  <span className="font-bold">
                    {formatCurrency(totalAmountRub, 'RUB')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                  <span className="text-sm">Загрузка...</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen((v) => !v)}
                icon={<FunnelIcon className="h-4 w-4" />}
              >
                {filtersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
              </Button>
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="px-6 pb-6">
          {loading && payments.length === 0 ? (
            // Показываем индикатор загрузки только при первой загрузке
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-300 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка истории выплат...</p>
            </div>
          ) : payments.length > 0 ? (
            // Есть данные - показываем список
            <div className="space-y-3">
              {payments.map((payment) => (
                <PaymentHistoryItem
                  key={payment.id}
                  payment={payment}
                  currentUserId={currentUserId}
                  onDelete={handleDeletePayment}
                  isDeleting={deletingPaymentId === payment.id}
                />
              ))}
            </div>
          ) : (
            // Нет данных - показываем пустое состояние
            <div className="text-center py-8">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filters.paymentType || filters.startDate || filters.endDate
                  ? 'Выплаты не найдены'
                  : 'История пуста'}
              </h3>
              <p className="text-gray-600">
                {filters.paymentType || filters.startDate || filters.endDate
                  ? 'По заданным фильтрам выплат не найдено. Попробуйте изменить критерии поиска.'
                  : 'Пока не было совершено ни одной выплаты.'}
              </p>
              {(filters.paymentType ||
                filters.startDate ||
                filters.endDate) && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="mt-4"
                >
                  Очистить фильтры
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Пагинация - показываем только если есть данные или если загружаем не первую страницу */}
        {(payments.length > 0 || (loading && page > 1)) && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            total={total}
            limit={limit}
            className="border-t border-gray-200"
          />
        )}
      </Card>
    </div>
  );
}
