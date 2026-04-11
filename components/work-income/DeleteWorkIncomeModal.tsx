'use client';

import React from 'react';
import Button from '../ui/Button';
import { WorkIncome, CURRENCY_OPTIONS } from '../../types/work-income';

interface DeleteWorkIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  income: WorkIncome;
  isDeleting?: boolean;
  onConfirm: () => Promise<void>;
}

const DeleteWorkIncomeModal: React.FC<DeleteWorkIncomeModalProps> = ({
  isOpen,
  onClose,
  income,
  isDeleting = false,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const formatAmount = (amount: number, currency: 'RUB' | 'USD') => {
    const symbol = currency === 'RUB' ? '₽' : '$';
    return (
      new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: currency === 'RUB' ? 0 : 2,
        maximumFractionDigits: currency === 'RUB' ? 0 : 2,
      }).format(amount) + ` ${symbol}`
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const getCurrencyLabel = (currency: 'RUB' | 'USD') => {
    return CURRENCY_OPTIONS.find((option) => option.value === currency)?.label || currency;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center">
              <div className="bg-red-100 rounded-lg p-2 mr-3">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Удалить запись о доходе</h3>
                <p className="text-sm text-gray-600">Это действие нельзя будет отменить</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4">
                Вы уверены, что хотите удалить эту запись о поступлении средств?
              </p>

              {/* Информация о записи */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Дата поступления:</span>
                  <span className="text-sm text-gray-900">{formatDate(income.receivedDate)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Сумма:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatAmount(income.amount, income.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Валюта:</span>
                  <span className="text-sm text-gray-900">{getCurrencyLabel(income.currency)}</span>
                </div>

                {income.convertedAmount && income.convertedCurrency && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Конвертировано:</span>
                    <span className="text-sm text-gray-900">
                      {formatAmount(income.convertedAmount, income.convertedCurrency)}
                    </span>
                  </div>
                )}

                {income.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">Описание:</span>
                    <span className="text-sm text-gray-900">{income.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
                Отменить
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onConfirm}
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                Удалить запись
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteWorkIncomeModal;
