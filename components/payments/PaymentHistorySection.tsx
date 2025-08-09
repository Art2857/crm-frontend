'use client';

import React from 'react';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../utils/payments';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';
  description: string;
  date: string; // paymentDate
  createdAt?: string;
}

interface PaymentHistorySectionProps {
  paymentHistory: PaymentHistoryItem[];
  isDebtsView: boolean;
}

export default function PaymentHistorySection({
  paymentHistory,
  isDebtsView,
}: PaymentHistorySectionProps) {
  const totalPaid = paymentHistory.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900">История выплат:</h4>
      <p className="text-sm text-gray-600">(все типы выплат)</p>

      {paymentHistory.length > 0 ? (
        <div className="space-y-3">
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
            {paymentHistory.map((payment) => {
              console.log('Payment in component:', payment);
              console.log('Payment type:', payment.type);

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-full ${
                        payment.type === 'SALARY'
                          ? 'bg-green-100'
                          : payment.type === 'BONUS'
                            ? 'bg-blue-100'
                            : payment.type === 'EXTRA'
                              ? 'bg-purple-100'
                              : 'bg-yellow-100'
                      }`}
                    >
                      {payment.type === 'SALARY' ? (
                        <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      ) : payment.type === 'BONUS' ? (
                        <BanknotesIcon className="h-5 w-5 text-blue-600" />
                      ) : payment.type === 'EXTRA' ? (
                        <BanknotesIcon className="h-5 w-5 text-purple-600" />
                      ) : (
                        <BanknotesIcon className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge
                          className={
                            payment.type === 'SALARY'
                              ? 'bg-green-100 text-green-800'
                              : payment.type === 'BONUS'
                                ? 'bg-blue-100 text-blue-800'
                                : payment.type === 'EXTRA'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {payment.type === 'SALARY'
                            ? 'Зарплата'
                            : payment.type === 'BONUS'
                              ? 'Премия'
                              : payment.type === 'EXTRA'
                                ? 'Доплата'
                                : 'Аванс'}
                        </Badge>
                        <span className="text-sm text-gray-700 font-semibold">
                          Закрытие: {new Date(payment.date).toLocaleDateString('ru-RU')}
                        </span>
                        {payment.createdAt && (
                          <span className="text-xs text-gray-500">
                            (создано: {new Date(payment.createdAt).toLocaleString('ru-RU')})
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">
                        {payment.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(payment.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Итого по выплатам */}
          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mt-4">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold text-green-800">
                Итого {isDebtsView ? 'получено' : 'выплачено'}:
              </h5>
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            История пуста
          </h3>
          <p className="text-gray-600">Выплат по этой работе пока не было</p>
        </div>
      )}
    </div>
  );
}
