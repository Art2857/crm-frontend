'use client';

import React from 'react';
import Button from '../ui/Button';
import { formatCurrency, getPaymentTypeColor } from '../../utils/payments';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Payment } from '../../types/payment';
import { useDateManager } from '../../hooks/useDateManager';

interface PaymentHistoryItemProps {
  payment: Payment;
  currentUserId?: string;
  onDelete: (paymentId: string) => Promise<void>;
  isDeleting: boolean;
}

export default function PaymentHistoryItem({
  payment,
  currentUserId,
  onDelete,
  isDeleting,
}: PaymentHistoryItemProps) {
  const { formatRussian } = useDateManager();
  // Определяем направление выплаты для текущего пользователя
  const isReceived = payment.toUserId === currentUserId;
  const isSent = payment.fromUserId === currentUserId;

  // Функция для получения названия типа выплаты
  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'SALARY':
        return 'Зарплата';
      case 'BONUS':
        return 'Премия';
      case 'ADVANCE':
        return 'Аванс';
      case 'EXTRA':
        return 'Доплата';
      default:
        return type;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
      <div className="flex items-center space-x-4 flex-1">
        {/* Индикатор направления */}
        <div
          className={`w-4 h-4 rounded-full ${
            isReceived ? 'bg-green-400' : isSent ? 'bg-blue-400' : 'bg-gray-400'
          }`}
        />

        {/* Основная информация */}
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.paymentType)}`}
            >
              {getPaymentTypeLabel(payment.paymentType)}
            </span>
            <span className="text-sm text-gray-700 font-semibold">
              Закрытие:{' '}
              {formatRussian(payment.paymentDate) || 'Неизвестная дата'}
            </span>
            {payment.createdAt && (
              <span className="text-xs text-gray-500 ml-2">
                (создано:{' '}
                {formatRussian(payment.createdAt) || 'Неизвестная дата'})
              </span>
            )}
          </div>

          <p className="font-medium text-gray-900 mb-1">
            {payment.description ||
              `${getPaymentTypeLabel(payment.paymentType)} по работе "${payment.work.name}"`}
          </p>

          <div className="text-sm text-gray-600">
            <span className="font-medium">
              {isReceived ? 'От' : isSent ? 'Для' : 'Между'}:
            </span>
            <span className="ml-1">
              {isReceived
                ? `${payment.fromUser.firstName} ${payment.fromUser.lastName}`
                : isSent
                  ? `${payment.toUser.firstName} ${payment.toUser.lastName}`
                  : `${payment.fromUser.firstName} ${payment.fromUser.lastName} → ${payment.toUser.firstName} ${payment.toUser.lastName}`}
            </span>
            <span className="mx-2">•</span>
            <span className="text-blue-600">{payment.work.name}</span>
            {payment.duty && (
              <>
                <span className="mx-2">•</span>
                <span className="text-gray-500">{payment.duty.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              isReceived
                ? 'text-green-600'
                : isSent
                  ? 'text-blue-600'
                  : 'text-gray-600'
            }`}
          >
            {isReceived ? '+' : isSent ? '-' : ''}
            {formatCurrency(payment.amount)}
          </p>
          {payment.periodStart && payment.periodEnd && (
            <p className="text-xs text-gray-500">
              {formatRussian(payment.periodStart) || 'Неизвестная дата'} -{' '}
              {formatRussian(payment.periodEnd) || 'Неизвестная дата'}
            </p>
          )}
        </div>
        {isSent && (
          <Button
            variant="secondary"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(payment.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <TrashIcon className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
