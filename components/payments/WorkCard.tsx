'use client';

import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { WorkDetail } from '../../types/payments';
import FinancialSummary from './FinancialSummary';

interface WorkCardProps {
  work: WorkDetail;
  isExpanded: boolean;
  onToggleExpanded: (workId: string) => void;
  onShowCalculation: (workId: string) => void;
  children?: React.ReactNode;
}

export default function WorkCard({
  work,
  isExpanded,
  onToggleExpanded,
  onShowCalculation,
  children,
}: WorkCardProps) {
  const accrued = work.totalAccrued ?? 0;
  const paidForDisplay = Math.min(work.paidAmount || 0, accrued);
  return (
    <div className="group">
      <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md">
        <div
          className="p-4 cursor-pointer"
          onClick={() => onToggleExpanded(work.workId)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  work.requiresAttention ? 'bg-red-400' : 'bg-green-400'
                }`}
              />
              <div>
                <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {work.workName}
                </h4>
                {work.lastClosureDate && (
                  <p className="text-sm text-gray-500">
                    Последнее закрытие:{' '}
                    {new Date(work.lastClosureDate).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <FinancialSummary
                totalAccrued={accrued}
                totalPaid={paidForDisplay}
                remainingDebt={work.totalDebt}
                overpaidAmount={work.overpaidAmount}
                isPaymentDue={work.isPaymentDue}
              />

              <div className="flex items-center space-x-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowCalculation(work.workId);
                  }}
                  size="sm"
                  className="bg-blue-100 text-blue-600 hover:bg-blue-200 border border-blue-200"
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>

                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Детали работы */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-4">
            {children}
          </div>
        )}
      </Card>
    </div>
  );
}
