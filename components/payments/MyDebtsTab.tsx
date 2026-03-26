'use client';

import React from 'react';
import Link from 'next/link';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import {
  CheckCircleIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { MyDebt } from '../../services/analytics';
import type { DutyDebt } from '../../types/payments';
import { useDateManager } from '../../hooks/useDateManager';

interface MyDebtsTabProps {
  myDebts: MyDebt[];
  currentUserId?: string;
  onShowCalculation: (
    userId: string,
    workId: string,
    dutyId?: string
  ) => Promise<void>;
}

export default function MyDebtsTab({
  myDebts,
  currentUserId,
  onShowCalculation,
}: MyDebtsTabProps) {
  const { formatRussian } = useDateManager();
  // Для отладки структуры данных
  // eslint-disable-next-line no-console

  if (myDebts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Долгов нет</h3>
        <p className="text-gray-600">У вас нет невыплаченных задолженностей</p>
      </Card>
    );
  }

  const handleShowCalculation = (workId: string, dutyId?: string) => {
    if (currentUserId) {
      onShowCalculation(currentUserId, workId, dutyId);
    }
  };

  return (
    <div className="space-y-6">
      {myDebts.map((debt) => (
        <Card
          key={debt.workId}
          className="overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div className="p-6">
            {/* Заголовок карточки */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-4 h-4 rounded-full ${debt.isPaymentDue
                    ? 'bg-red-400 animate-pulse'
                    : 'bg-green-400'
                    }`}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    <Link href={`/works/${debt.workId}`} className="hover:underline">
                      {debt.workName}
                    </Link>
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <UserIcon className="h-4 w-4" />
                    <span>
                      Ответственный: {debt.responsibleUser.firstName || ''}{' '}
                      {debt.responsibleUser.lastName || ''}
                    </span>
                  </div>
                </div>
              </div>

              {debt.isPaymentDue && (
                <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                  Просрочено
                </div>
              )}
            </div>

            {/* Информация о сроках */}
            {debt.lastClosureDate && (
              <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  Последнее закрытие:{' '}
                  {formatRussian(debt.lastClosureDate) || 'Неизвестная дата'}
                </span>
              </div>
            )}

            {/* Обязанности */}
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700">
                Мои обязанности:
              </h4>
              {debt.duties.map((duty: DutyDebt, index) => {
                const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                return (
                  <div
                    key={duty.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <div>
                        <p className="font-medium text-gray-900">{duty.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(duty.monthlyAmount, dutyCurrency)}/мес
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(duty.totalDebt, dutyCurrency)}
                        </p>
                        <p className="text-xs text-gray-500">мне должны</p>
                      </div>

                      <Button
                        onClick={() => handleShowCalculation(debt.workId, duty.id)}
                        size="sm"
                        className="bg-green-100 text-green-600 hover:bg-green-200 border border-green-200"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Общая информация */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Общая задолженность:
                </span>
                <Button
                  onClick={() => handleShowCalculation(debt.workId)}
                  size="sm"
                  className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Посмотреть детали
                </Button>
              </div>

              <div className="text-right">
                <p
                  className={`text-2xl font-bold ${debt.isPaymentDue ? 'text-red-600' : 'text-green-600'
                    }`}
                >
                  {formatCurrency(debt.totalDebt)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
