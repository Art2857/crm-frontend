'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchAllWorks, fetchUserWorks } from '../../store/slices/works';
import { fetchAllUsers } from '../../store/slices/users';
import { getCurrentUser } from '../../store/slices/auth';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Work } from '../../types/work';
import { User } from '../../types/user';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay } from '../../utils/date';
import { logger } from '../../utils/logger';

const WorksPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const { works, userWorks, isLoading, error } = useAppSelector((state) => state.works);
  const { users } = useAppSelector((state) => state.users);
  const [displayedWorks, setDisplayedWorks] = useState<Work[]>([]);
  const [viewType, setViewType] = useState<'all' | 'user'>('all');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Создаем карту пользователей для быстрого поиска
  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  // Первоначальная проверка аутентификации
  useEffect(() => {
    const initializeAuth = async () => {
      // Если еще загружается аутентификация, ждем
      if (authLoading) {
        return;
      }

      // Если не аутентифицирован, перенаправляем на логин
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Если пользователь не загружен, загружаем его
      if (!user) {
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
          logger.error('Ошибка при получении пользователя:', error);
          router.push('/login');
          return;
        }
      }
    };

    initializeAuth();
  }, [isAuthenticated, user, authLoading, router, dispatch]);

  // Загрузка данных только после успешной аутентификации
  useEffect(() => {
    // Проверяем что пользователь аутентифицирован и данные пользователя загружены
    if (!isAuthenticated || !user || authLoading || dataLoaded) {
      return;
    }

    const loadData = async () => {
        try {
          logger.debug('Loading data for authenticated user:', { userId: user.id, userRole: user.role });
        
        // Загружаем пользователей и работы параллельно
        const promises = [];
        
        // Загружаем пользователей (нужно для отображения ответственных)
        promises.push(dispatch(fetchAllUsers()));
        
        // Загружаем работы в зависимости от роли пользователя
        if (user.role === 'ADMIN') {
          promises.push(dispatch(fetchAllWorks()));
          setViewType('all');
        } else {
          logger.debug('Fetching user works for userId:', user.id);
          promises.push(dispatch(fetchUserWorks(user.id)));
          setViewType('user');
        }

        // Ждем завершения всех запросов
        await Promise.all(promises);
        setDataLoaded(true);
        } catch (error) {
          logger.error('Ошибка при загрузке данных:', error);
      }
    };

    loadData();
  }, [isAuthenticated, user, authLoading, dispatch, dataLoaded]);

  useEffect(() => {
    // Обновляем отображаемые работы при изменении viewType или загрузке данных
    logger.debug('Updating displayed works:', { viewType, works: works.length, userWorks: userWorks.length });
    setDisplayedWorks(viewType === 'all' ? works : userWorks);
  }, [viewType, works, userWorks]);

  const handleCreateWork = () => {
    router.push('/works/create');
  };

  const handleViewWork = (id: string) => {
    router.push(`/works/${id}`);
  };

  const handleToggleView = async () => {
    if (user?.role === 'ADMIN') {
      const newViewType = viewType === 'all' ? 'user' : 'all';
      
      // Если переключаемся на пользовательские работы и они еще не загружены
      if (newViewType === 'user' && userWorks.length === 0) {
        logger.debug('Loading user works for admin:', user.id);
        try {
          await dispatch(fetchUserWorks(user.id));
        } catch (error) {
          logger.error('Ошибка при загрузке пользовательских работ:', error);
        }
      }
      
      setViewType(newViewType);
    }
  };

  // Функция для получения имени ответственного
  const getResponsibleName = (work: Work): string => {
    const responsibleUser = usersMap[work.responsibleUserId];
    if (responsibleUser) {
      const lastName = responsibleUser.lastName?.trim() || '';
      const firstName = responsibleUser.firstName?.trim() || '';
      const fullName = `${lastName} ${firstName}`.trim();
      return fullName || 'Не указано имя';
    }
    return 'Не назначен';
  };

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

  // Определяем, пустой ли список работ
  const isEmptyWorksList = displayedWorks.length === 0 && !isLoading;

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
                {viewType === 'all' ? 'Показать мои работы' : 'Показать все работы'}
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
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {viewType === 'all' ? 'Нет доступных работ' : 
               user?.role === 'ADMIN' ? 'У вас нет назначенных работ как ответственного' : 
               'У вас нет назначенных работ'}
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
                    <h3 className="text-xl font-bold text-gray-900 truncate">{work.name}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">Зарплата:</span>
                      <span className="text-lg font-semibold text-primary-600">{formatCurrency(work.salary)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">Дата выхода:</span>
                      <span className="text-sm text-gray-700">
                        {work.releaseDate ? formatDateForDisplay(work.releaseDate) : 'Не указана'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Ответственный:</span>
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