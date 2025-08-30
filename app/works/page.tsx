'use client';

import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import WorkAnalyticsView from '../../components/works/WorkAnalyticsView';
import { useWorksList } from '../../hooks/works/useWorksList';
import { useWorksAnalytics } from '../../hooks/works/useWorksAnalytics';

const WorksPage = () => {
  const [showArchived, setShowArchived] = useState(false);

  const {
    isAuthenticated,
    authLoading,
    user,
    handleCreateWork,
    handleViewWork,
  } = useWorksList();

  const {
    grouped,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics,
  } = useWorksAnalytics(showArchived);

  // Показываем индикатор загрузки если аутентификация еще проверяется
  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
          <span className="ml-4 text-gray-600">Проверка аутентификации...</span>
        </div>
      </Layout>
    );
  }

  // Если не аутентифицирован, не рендерим основной контент (будет редирект)
  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-600">
            Перенаправление на страницу входа...
          </span>
        </div>
      </Layout>
    );
  }

  // Определяем, пустой ли список работ
  // isEmptyWorksList берём из хука useWorksList

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Работы</h1>
            <p className="text-gray-600 mt-1">
              Обзор доходности проектов по ответственным
            </p>
          </div>
          <div className="flex space-x-3">
            {user?.role === 'ADMIN' && (
              <>
                <Button
                  variant={showArchived ? 'primary' : 'secondary'}
                  onClick={() => setShowArchived(!showArchived)}
                  className="rounded-lg px-4 py-2 shadow-sm"
                  disabled={analyticsLoading}
                >
                  {showArchived ? 'Показать активные' : 'Показать архив'}
                </Button>
                <Button
                  onClick={handleCreateWork}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-4 py-2 shadow-sm hover:from-primary-700 hover:to-primary-800"
                >
                  Добавить работу
                </Button>
              </>
            )}
          </div>
        </div>

        {analyticsError && (
          <div className="mb-6">
            <Alert type="error">{analyticsError}</Alert>
          </div>
        )}

        {analyticsLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : grouped.length === 0 ? (
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {showArchived ? 'Нет архивных работ' : 'Нет доступных работ'}
            </h3>
            <p className="mt-2 text-gray-500 mb-6">
              {showArchived
                ? 'Архивные работы отсутствуют'
                : 'Создайте новую работу для просмотра аналитики'}
            </p>
            {user?.role === 'ADMIN' && !showArchived && (
              <Button
                onClick={handleCreateWork}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-6 py-2 shadow-md hover:from-primary-700 hover:to-primary-800"
              >
                Добавить работу
              </Button>
            )}
          </div>
        ) : (
          <WorkAnalyticsView
            grouped={grouped}
            onCreateWork={handleCreateWork}
            onViewWork={handleViewWork}
            userRole={user?.role}
            showArchived={showArchived}
          />
        )}
      </div>
    </Layout>
  );
};

export default WorksPage;
