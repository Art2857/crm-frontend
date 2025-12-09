'use client';

import React from 'react';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/payments';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { MyDebt } from '../../services/analytics';
import { ResponsibleUser } from '../../types/payments';
import { DisplayCurrency } from '../../hooks/useCurrencyConversion';
import { usePaymentStats } from '../../hooks/payments/usePaymentStats';

interface PaymentStatisticsProps {
  responsibleUsers: ResponsibleUser[];
  myDebts: MyDebt[];
  displayCurrency: DisplayCurrency;
  onCurrencyChange: (currency: DisplayCurrency) => void;
}

export default function PaymentStatistics({
  responsibleUsers,
  myDebts,
  displayCurrency,
}: PaymentStatisticsProps) {
  const { totalResponsibleDebt, totalMyDebt, overdueCount, isLoadingRate } = usePaymentStats(
    responsibleUsers,
    myDebts,
    displayCurrency
  );

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">
                К выплате (ответственный)
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {isLoadingRate ? '...' : formatCurrency(totalResponsibleDebt, displayCurrency)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center">
            <div className="bg-green-600 p-3 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Мне должны</p>
              <p className="text-2xl font-bold text-green-900">
                {isLoadingRate ? '...' : formatCurrency(totalMyDebt, displayCurrency)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center">
            <div className="bg-orange-600 p-3 rounded-full">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-600">Просроченные</p>
              <p className="text-2xl font-bold text-orange-900">{overdueCount}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
