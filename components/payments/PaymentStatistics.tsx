'use client';

import React from 'react';
import Card from '../ui/Card';
import { formatCurrency } from '../../utils/payments';
import { 
  CurrencyDollarIcon, 
  BanknotesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ResponsibleUser, MyDebt } from '../../types/payments';

interface PaymentStatisticsProps {
  responsibleUsers: ResponsibleUser[];
  myDebts: MyDebt[];
}

export default function PaymentStatistics({ responsibleUsers, myDebts }: PaymentStatisticsProps) {
  const totalResponsibleDebt = responsibleUsers.reduce((sum, user) => sum + user.totalDebt, 0);
  const totalMyDebt = myDebts.reduce((sum, debt) => sum + debt.totalDebt, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center">
          <div className="bg-blue-600 p-3 rounded-full">
            <BanknotesIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-blue-600">К выплате (ответственный)</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalResponsibleDebt)}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <div className="flex items-center">
          <div className="bg-green-600 p-3 rounded-full">
            <CurrencyDollarIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-green-600">Мои долги</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalMyDebt)}</p>
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
            <p className="text-2xl font-bold text-orange-900">
              {responsibleUsers.filter(u => u.isPaymentDue).length + myDebts.filter(d => d.isPaymentDue).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 