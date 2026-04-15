'use client';

import React from 'react';
import Badge from '../ui/Badge';
import { BuildingOfficeIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { MyDebt } from '../../services/analytics';
import { ResponsibleUser } from '../../types/payments';

interface PaymentTabsProps {
  activeTab: 'management' | 'debts' | 'history';
  setActiveTab: (tab: 'management' | 'debts' | 'history') => void;
  responsibleUsers: ResponsibleUser[];
  myDebts: MyDebt[];
  /** Показывать вкладку «Управление выплатами» (есть работы, где пользователь ответственный) */
  showManagementTab: boolean;
}

export default function PaymentTabs({
  activeTab,
  setActiveTab,
  responsibleUsers,
  myDebts,
  showManagementTab,
}: PaymentTabsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border mb-8">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {showManagementTab && (
            <button
              onClick={() => setActiveTab('management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center space-x-2`}
            >
              <BuildingOfficeIcon className="h-5 w-5" />
              <span>Управление выплатами</span>
              <Badge className="bg-red-100 text-red-800 ml-2">
                {responsibleUsers.filter((u) => u.isPaymentDue).length}
              </Badge>
            </button>
          )}

          <button
            onClick={() => setActiveTab('debts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'debts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center space-x-2`}
          >
            <UserIcon className="h-5 w-5" />
            <span>Предстоящая выручка</span>
            {myDebts.some((d) => d.isPaymentDue) && (
              <Badge className="bg-red-100 text-red-800 ml-2">!</Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center space-x-2`}
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>История выплат</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
