'use client';

import React from 'react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay } from '../../utils/date';
import { logger } from '../../utils/logger';
import { useWorksList } from '../../hooks/works/useWorksList';

const WorksPage = () => {
  const {
    isAuthenticated,
    authLoading,
    user,
    isLoading,
    error,
    users,
    viewType,
    displayedWorks,
    isEmptyWorksList,
    handleCreateWork,
    handleViewWork,
    handleToggleView,
    getResponsibleName,
  } = useWorksList();

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
          <h1 className="text-3xl font-bold text-gray-900">
            {viewType === 'all' ? 'Все работы' : 'Мои работы'}
          </h1>
          <div className="flex space-x-3">
            {user?.role === 'ADMIN' && (
              <Button
                variant="secondary"
                onClick={handleToggleView}
                className="rounded-lg px-4 py-2 shadow-sm"
                disabled={isLoading}
              >
                {viewType === 'all'
                  ? 'Показать мои работы'
                  : 'Показать все работы'}
              </Button>
            )}
            {user?.role === 'ADMIN' && (
              <Button
                onClick={handleCreateWork}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-4 py-2 shadow-sm hover:from-primary-700 hover:to-primary-800"
              >
                Добавить работу
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : isEmptyWorksList ? (
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
              {viewType === 'all'
                ? 'Нет доступных работ'
                : user?.role === 'ADMIN'
                  ? 'У вас нет назначенных работ как ответственного'
                  : 'У вас нет назначенных работ'}
            </h3>
            <p className="mt-2 text-gray-500 mb-6">
              {viewType === 'all'
                ? 'Создайте новую работу, нажав на кнопку "Добавить работу"'
                : user?.role === 'ADMIN'
                  ? 'Вы пока не назначены ответственным ни за одну работу, но можете создавать новые работы'
                  : 'Вы пока не назначены ответственным ни за одну работу'}
            </p>
            {user?.role === 'ADMIN' && (
              <Button
                onClick={handleCreateWork}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-6 py-2 shadow-md hover:from-primary-700 hover:to-primary-800"
              >
                Добавить работу
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayedWorks.map((work) => (
              <div
                key={work.id}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="border-b border-gray-100">
                  <div className="px-6 py-4">
                    <h3 className="text-xl font-bold text-gray-900 truncate">
                      {work.name}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Зарплата:
                      </span>
                      <span className="text-lg font-semibold text-primary-600">
                        {formatCurrency(work.salary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Дата выхода:
                      </span>
                      <span className="text-sm text-gray-700">
                        {work.releaseDate
                          ? formatDateForDisplay(work.releaseDate)
                          : 'Не указана'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">
                        Ответственный:
                      </span>
                      <span className="text-sm text-gray-700 font-medium">
                        {getResponsibleName(work)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleViewWork(work.id)}
                    className="w-full mt-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 py-2"
                  >
                    Просмотр
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WorksPage;
