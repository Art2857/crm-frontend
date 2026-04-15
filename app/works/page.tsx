'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import WorkAnalyticsView from '../../components/works/WorkAnalyticsView';
import { useWorksAnalytics } from '../../hooks/works/useWorksAnalytics';
import { useAppDispatch, useAppSelector } from '../../store';
import { getCurrentUser } from '../../store/slices/auth';
import { Role } from '../../types/user';

const WorksPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useAppSelector((s) => s.auth);
  const canCreateWork = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  React.useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      dispatch(getCurrentUser()).catch(() => {});
    }
  }, [authLoading, isAuthenticated, user, dispatch]);

  const {
    grouped,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useWorksAnalytics(showArchived);

  const handleCreateWork = useCallback(() => {
    router.push('/works/create');
  }, [router]);

  const handleViewWork = useCallback(
    (id: string) => {
      router.push(`/works/${id}`);
    },
    [router],
  );

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
          <span className="text-gray-600">Перенаправление на страницу входа...</span>
        </div>
      </Layout>
    );
  }

  const renderAnalyticsSection = () => (
    <>
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
            {showArchived ? 'Архивные работы отсутствуют' : 'Создайте новую работу для просмотра'}
          </p>
          {canCreateWork && !showArchived && (
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
          onCreateWork={canCreateWork ? handleCreateWork : undefined}
          onViewWork={handleViewWork}
          userRole={user?.role}
          showArchived={showArchived}
        />
      )}
    </>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-8 pt-2 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Работы</h1>
            <p className="text-gray-600 mt-1">Управляйте работами и аналитикой</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant={showArchived ? 'primary' : 'secondary'}
              onClick={() => setShowArchived(!showArchived)}
              className="rounded-lg px-4 py-2 shadow-sm"
              disabled={analyticsLoading}
            >
              {showArchived ? 'Показать активные' : 'Показать архив'}
            </Button>
            {canCreateWork && (
              <Button
                onClick={handleCreateWork}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-4 py-2 shadow-sm hover:from-primary-700 hover:to-primary-800"
              >
                Создать работу
              </Button>
            )}
          </div>
        </div>

        {renderAnalyticsSection()}
      </div>
    </Layout>
  );
};

export default WorksPage;
