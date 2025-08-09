'use client';

import React from 'react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PaymentType, PaymentHistoryDto } from '../../types/payment';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PaymentHistoryFiltersProps {
  filters: PaymentHistoryDto;
  onFiltersChange: (filters: Partial<PaymentHistoryDto>) => void;
  onClearFilters: () => void;
}

export default function PaymentHistoryFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: PaymentHistoryFiltersProps) {
  const hasActiveFilters =
    filters.paymentType || filters.startDate || filters.endDate;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Очистить
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Тип выплаты */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип выплаты
          </label>
          <Select
            value={filters.paymentType || ''}
            onChange={(e) =>
              onFiltersChange({
                paymentType: e.target.value
                  ? (e.target.value as PaymentType)
                  : undefined,
              })
            }
            options={[
              { value: '', label: 'Все типы' },
              { value: PaymentType.SALARY, label: 'Зарплата' },
              { value: PaymentType.BONUS, label: 'Премия' },
              { value: PaymentType.ADVANCE, label: 'Аванс' },
              { value: PaymentType.EXTRA, label: 'Доплата' },
            ]}
            className="w-full"
          />
        </div>

        {/* Начальная дата */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата с
          </label>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) =>
              onFiltersChange({
                startDate: e.target.value || undefined,
              })
            }
            className="w-full"
          />
        </div>

        {/* Конечная дата */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата до
          </label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) =>
              onFiltersChange({
                endDate: e.target.value || undefined,
              })
            }
            className="w-full"
          />
        </div>
      </div>

      {/* Размер страницы */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Записей на странице:
          </label>
          <Select
            value={filters.limit?.toString() || '20'}
            onChange={(e) =>
              onFiltersChange({
                limit: parseInt(e.target.value),
                page: 1, // Сбрасываем на первую страницу при изменении размера
              })
            }
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
