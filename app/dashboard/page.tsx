'use client';

import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useDashboard } from '../../hooks/dashboard/useDashboard';
import UserSummaryCard from '../../components/dashboard/UserSummaryCard';
import { formatDateToISO } from '../../utils/date';
import { normalizeBirthday } from '../../utils/birthday';
import WorkDutiesTable from '../../components/dashboard/WorkDutiesTable';
import PaymentHistoryTab from '../../components/payments/PaymentHistoryTab';
import { BriefcaseIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'works' | 'history'>('works');
  const { user, data, isLoading, fullName, age, formatSalaryDay, formatReleaseDate } =
    useDashboard();
  const birthday = normalizeBirthday(user?.birthday);

  // Показываем загрузку, если нет пользователя или данные загружаются
  if (!user || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  // Если нет данных, но пользователь есть и загрузка завершена, показываем пустое состояние
  if (!data) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden p-10 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-4 text-gray-500">Загрузка данных...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <UserSummaryCard
            fullName={fullName}
            login={user.login}
            salary={data.salary}
            salaryDayText={formatSalaryDay(user.salaryDays)}
            birthdayText={birthday ? formatDateToISO(birthday) || undefined : undefined}
            ageText={age ? `${age} лет` : undefined}
          />
        </div>

        {/* Вкладки */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('works')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 'works'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BriefcaseIcon className="h-5 w-5" />
                <span>Ваши работы и обязанности</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BanknotesIcon className="h-5 w-5" />
                <span>История поступлений</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Содержимое вкладок */}
        {activeTab === 'works' && (
          <>
            {data.works.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                {data.works.map((workData) => (
                  <WorkDutiesTable
                    key={workData.workId}
                    workId={workData.workId}
                    name={workData.name}
                    responsibleName={
                      workData.responsibleUser
                        ? `${workData.responsibleUser.lastName} ${workData.responsibleUser.firstName}`
                        : 'Не назначен'
                    }
                    releaseDateText={formatReleaseDate(workData.releaseDate)}
                    isResponsible={workData.isResponsible}
                    userSalaryRub={workData.userSalaryRub}
                    userSalaryUsd={workData.userSalaryUsd}
                    duties={workData.duties}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden p-10 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="mt-4 text-gray-500">У вас пока нет работ или распределений</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <PaymentHistoryTab
            currentUserId={user.id}
            recipientId={user.id}
            title="История поступлений"
          />
        )}
      </div>
    </Layout>
  );
}
