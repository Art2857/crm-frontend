'use client';

import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  UserIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { ResponsibleUser } from '../../types/payments';
import { useDateManager } from '../../hooks/useDateManager';
import FinancialSummary from './FinancialSummary';

interface UserCardProps {
  user: ResponsibleUser;
  isExpanded: boolean;
  onToggleExpanded: (userId: string) => void;
  onShowCalculation?: (userId: string) => void;
  children?: React.ReactNode;
  accruedOverride?: number;
  currency?: 'RUB' | 'USD';
}

export default function UserCard({
  user,
  isExpanded,
  onToggleExpanded,
  onShowCalculation,
  children,
  accruedOverride,
  currency = 'RUB',
}: UserCardProps) {
  const { formatRussian } = useDateManager();
  return (
    <div className="relative">
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white via-gray-50 to-white">
        <div
          className="p-6 cursor-pointer relative"
          onClick={() => onToggleExpanded(user.userId)}
        >
          {/* Декоративная линия сверху */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              user.requiresAttention
                ? 'from-red-400 via-orange-400 to-red-400'
                : 'from-blue-400 via-indigo-400 to-purple-400'
            }`}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Аватар пользователя */}
              <div
                className={`relative p-4 rounded-2xl shadow-lg ${
                  user.requiresAttention
                    ? 'bg-gradient-to-br from-red-100 to-orange-100'
                    : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                }`}
              >
                <UserIcon
                  className={`h-7 w-7 ${
                    user.requiresAttention ? 'text-red-600' : 'text-blue-600'
                  }`}
                />
                {user.requiresAttention && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Информация о пользователе */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  {user.requiresAttention && (
                    <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Требует внимания</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 font-medium">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Зарплата: {user.salaryDays.length > 0 ? user.salaryDays.map((d) => `${d}`).join(', ') + ' число' : 'Не указан'}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>Работ: {user.works.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Финансовая информация и управление */}
            <div className="flex items-center space-x-4">
              <FinancialSummary
                totalAccrued={typeof accruedOverride === 'number' ? accruedOverride : user.totalAccrued}
                totalPaid={user.totalPaid}
                remainingDebt={user.remainingDebt}
                overpaidAmount={user.overpaidAmount}
                isPaymentDue={user.isPaymentDue}
                currency={currency}
              />

              <div className="flex items-center space-x-2">
                {onShowCalculation && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowCalculation(user.userId);
                    }}
                    size="sm"
                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                )}

                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {user.lastPaymentDate && (
            <div className="mt-2 text-xs text-gray-400 text-center">
              Последняя выплата:{' '}
              {formatRussian(user.lastPaymentDate) || 'Неизвестная дата'}
            </div>
          )}
        </div>

        {/* Раскрываемый контент */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="p-6 space-y-4">
              {children}
              {user.works && user.works.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">
                    На выбранную дату у пользователя нет работ, требующих выплат
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
