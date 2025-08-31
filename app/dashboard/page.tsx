'use client';

import React from 'react';
import Layout from '../../components/layout/Layout';
import { useDashboard } from '../../hooks/dashboard/useDashboard';
import UserSummaryCard from '../../components/dashboard/UserSummaryCard';
import WorkDutiesTable from '../../components/dashboard/WorkDutiesTable';

export default function DashboardPage() {
  const {
    user,
    data,
    isLoading,
    fullName,
    age,
    formatSalaryDay,
    formatReleaseDate,
  } = useDashboard();

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
            Ваша панель
          </h1>
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
            <p className="mt-4 text-gray-500">
              Загрузка данных...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const safeFullName = fullName;
  const safeAge = age;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
          Ваша панель
        </h1>

        <div className="mb-10">
          <UserSummaryCard
            fullName={safeFullName}
            email={user.email}
            salary={data.salary}
            salaryDayText={formatSalaryDay(user.salaryDay)}
            birthdayText={user.birthday || undefined}
            ageText={age ? `${age} лет` : undefined}
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="inline-block w-2 h-6 bg-primary-600 mr-3 rounded"></span>
          Ваши работы и обязанности
        </h2>

        {data.works.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {data.works.map((workData, idx) => (
              <WorkDutiesTable
                key={`work-${idx}`}
                name={workData.name}
                responsibleName={
                  workData.responsibleUser
                    ? `${workData.responsibleUser.lastName} ${workData.responsibleUser.firstName}`
                    : 'Не назначен'
                }
                releaseDateText={formatReleaseDate(workData.releaseDate)}
                isResponsible={workData.isResponsible}
                salary={workData.salary}
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
            <p className="mt-4 text-gray-500">
              У вас пока нет работ или распределений
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
