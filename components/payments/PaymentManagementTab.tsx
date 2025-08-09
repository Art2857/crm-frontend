'use client';

import React from 'react';
import Card from '../ui/Card';
import { UserIcon } from '@heroicons/react/24/outline';
import { WorkDetail } from '../../types/payments';
import UserCard from './UserCard';
import WorkCard from './WorkCard';
import DutyCard from './DutyCard';
import WorkPeriodSelector from './WorkPeriodSelector';

interface PaymentManagementTabProps {
  works: WorkDetail[];
  expandedUsers: Set<string>;
  expandedWorks: Set<string>;
  workPeriodDates: Record<string, string>;
  onToggleUserExpanded: (userId: string) => void;
  onToggleWorkExpanded: (workId: string) => void;
  onWorkPeriodDateChange: (workId: string, date: string) => void;
  onShowCalculation: (
    userId: string,
    workId: string,
    dutyId?: string
  ) => Promise<void>;
  onShowUserCalculation?: (userId: string) => Promise<void>;
  getWorkPeriodDate: (workId: string) => string;
}

export default function PaymentManagementTab({
  works,
  expandedUsers,
  expandedWorks,
  workPeriodDates,
  onToggleUserExpanded,
  onToggleWorkExpanded,
  onWorkPeriodDateChange,
  onShowCalculation,
  onShowUserCalculation,
  getWorkPeriodDate,
}: PaymentManagementTabProps) {
  if (works.length === 0) {
    return (
      <Card className="p-12 text-center">
        <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Нет пользователей
        </h3>
        <p className="text-gray-600">Пока нет сотрудников, требующих выплат</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {works.map((work) => (
        <WorkCard
          key={work.workId}
          work={work}
          isExpanded={expandedWorks.has(work.workId)}
          onToggleExpanded={onToggleWorkExpanded}
          onShowCalculation={(workId) => {
            const firstUser =
              work.users && work.users.length > 0 ? work.users[0] : null;
            if (firstUser) {
              onShowCalculation(firstUser.userId, workId);
            }
          }}
        >
          <div className="space-y-4">
            {/* Дата расчетного периода */}
            <WorkPeriodSelector
              workId={work.workId}
              selectedDate={getWorkPeriodDate(work.workId)}
              onDateChange={onWorkPeriodDateChange}
            />

            {/* Список пользователей */}
            <div className="space-y-4">
              {work.users?.map((user) => (
                <UserCard
                  key={user.userId}
                  user={
                    {
                      ...user,
                      works: [],
                      salaryDay: 15,
                      totalDebt: user.totalDebt,
                      totalAccrued: user.totalDebt,
                      totalPaid: 0,
                      remainingDebt: user.totalDebt,
                      isPaymentDue: user.isPaymentDue,
                      lastPaymentDate: null,
                      lastPaymentAmount: null,
                    } as any
                  }
                  isExpanded={expandedUsers.has(user.userId)}
                  onToggleExpanded={onToggleUserExpanded}
                  onShowCalculation={(userId) => {
                    if (onShowUserCalculation) {
                      onShowUserCalculation(userId);
                    } else {
                      onShowCalculation(userId, work.workId, undefined);
                    }
                  }}
                >
                  {/* Обязанности пользователя */}
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Обязанности:
                    </h5>
                    <div className="space-y-2">
                      {user.duties.map((duty, index) => (
                        <DutyCard
                          key={duty.dutyId}
                          duty={duty}
                          index={index}
                          onShowCalculation={(dutyId) =>
                            onShowCalculation(user.userId, work.workId, dutyId)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </UserCard>
              ))}
            </div>
          </div>
        </WorkCard>
      ))}
    </div>
  );
}
