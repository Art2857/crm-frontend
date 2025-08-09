'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store';
import Layout from '../../../components/layout/Layout';
import Button from '../../../components/ui/Button';
import Notification from '../../../components/ui/Notification';
import DataLoader from '../../../components/ui/DataLoader';
import WorkDetails from '../../../components/works/WorkDetails';
import WorkForm from '../../../components/works/WorkForm';
import WorkDuties from '../../../components/works/WorkDuties';
import WorkDutiesForm from '../../../components/works/WorkDutiesForm';
import WorkDutiesHistory from '../../../components/works/WorkDutiesHistory';
import { fetchWorkById, updateWork } from '../../../store/slices/works';
import { fetchAllUsers } from '../../../store/slices/users';
import { fetchAllDuties } from '../../../store/slices/duties';
import { useWorkData } from '../../../hooks/useWorkData';
import { useWorkDuties } from '../../../hooks/useWorkDuties';
import { useDataLoader } from '../../../hooks/useDataLoader';
import { useBreadcrumbs } from '../../../hooks/useBreadcrumbs';
import { Breadcrumb } from '../../../types/breadcrumb';
import { useNotification } from '../../../contexts/NotificationContext';
import { WorkHistory } from '../../../types/work';
import { workService } from '../../../services/work';
import { formatCurrency } from '../../../utils/currency';
import { formatDateForDisplay } from '../../../utils/date';
import { privateApi } from '../../../services/ApiClient';
import { User } from '../../../types/user';

type DutiesTabType = 'current' | 'history';

export default function WorkDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Глобальные данные из Redux
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);
  const { duties } = useAppSelector((state) => state.duties);
  
  // Менеджер уведомлений
  const notification = useNotification();
  
  // Состояние интерфейса
  const [dutiesTab, setDutiesTab] = useState<DutiesTabType>('current');
  const [workHistory, setWorkHistory] = useState<WorkHistory[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  
  // Добавляем состояние для ответственного пользователя
  const [responsibleUserData, setResponsibleUserData] = useState<User | null>(null);

  // Функции загрузки данных
  const loadAllData = useCallback(async () => {
    try {
      const work = await dispatch(fetchWorkById(id)).unwrap();

      // Если пользователь админ - загружаем всех пользователей
      // Если нет - загружаем только ответственного пользователя и текущего пользователя
      if (user?.role === 'ADMIN') {
        await Promise.all([
          dispatch(fetchAllUsers()).unwrap(),
          dispatch(fetchAllDuties()).unwrap()
        ]);
      } else {
        // Для обычного пользователя загружаем только обязанности
        await dispatch(fetchAllDuties()).unwrap();
      }
      
      return work;
    } catch (error) {
      // Тихая ошибка, UI отрисует стандартный блок с ошибкой
      throw error;
    }
  }, [dispatch, id, user?.role]);

  // Загрузка данных работы и связанной информации
  const { 
    data: workData, 
    isLoading, 
    error, 
    reload: reloadWorkData 
  } = useDataLoader({
    loadData: loadAllData,
    dependencies: [id, isAuthenticated]
  });

  // Начальные данные для формы работы
  const initialWorkData = useMemo(() => {
    if (!workData) return undefined;
    
    return {
      name: workData.name,
      responsibleUserId: workData.responsibleUserId,
      salary: workData.salary,
      releaseDate: workData.releaseDate
    };
  }, [workData]);

  // Хлебные крошки для навигации
  const breadcrumbs = useMemo<Breadcrumb[]>(() => [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'works',
      title: 'Работы',
      path: '/works',
      isActive: false,
      isClickable: true,
      icon: '📋'
    },
    ...(workData ? [{
      id: `work-${id}`,
      title: workData.name || `Работа №${id}`,
      path: `/works/${id}`,
      isActive: true,
      isClickable: false,
      icon: '📄'
    }] : [])
  ], [id, workData]);

  // Установка хлебных крошек
  useBreadcrumbs(breadcrumbs);

  // Управление данными работы
  const { 
    isEditing,
    formData,
    setIsEditing,
    handleChange,
    handleSubmit
  } = useWorkData({
    id,
    initialData: initialWorkData,
    isAuthenticated
  });

  // Управление обязанностями работы
  const {
    distributions,
    isEditingDuties,
    successMessage: dutiesSuccessMessage,
    errorMessage: dutiesErrorMessage,
    setIsEditingDuties,
    createDistribution,
    clearMessages: clearDutiesMessages,
    forceReload: forceReloadDuties
  } = useWorkDuties({ 
    workId: id,
    workSalary: workData?.salary
  });
  
  // Находим ответственного пользователя
  const responsibleUser = useMemo(() => {
    if (!workData || !users.length) return null;
    return users.find(u => u.id === workData.responsibleUserId) || null;
  }, [users, workData]);
  
  // Запрашиваем данные об ответственном, если его нет в списке users
  useEffect(() => {
    if (!responsibleUser && workData && workData.responsibleUserId) {
      const fetchResponsibleUser = async () => {
        try {
          const response = await privateApi.get<User>(`/users/${workData.responsibleUserId}`);
          setResponsibleUserData(response.data);
        } catch (error) {
          // Тихая ошибка, не блокирует остальной контент
        }
      };
      
      fetchResponsibleUser();
    }
  }, [responsibleUser, workData]);

  // Обработчик сохранения обязанностей
  const handleDutiesSubmit = useCallback((duties: Array<{
    dutyId: string;
    userId: string;
    price: string | null;
    percentage: string | null;
  }>, effectiveDate?: string) => {
    if (!duties.length) {
      notification.showError('Необходимо добавить хотя бы одну обязанность');
      return;
    }
    createDistribution(duties, effectiveDate);
  }, [createDistribution, notification]);

  // Обработчик сохранения данных работы
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); // Предотвращаем стандартное поведение формы
    try {
      await handleSubmit(e);
      // После успешного обновления перезагружаем все данные
      setTimeout(() => {
        reloadWorkData();
        forceReloadDuties();
      }, 100); // Небольшая задержка для гарантии последовательности операций
    } catch (error) {
      // Ошибку покажет компонент/форма
    }
  }, [handleSubmit, reloadWorkData, forceReloadDuties]);

  // Проверка прав доступа
  const canEdit = useMemo(() => {
    if (!user || !workData) return false;
    return user.role === 'ADMIN';
  }, [user, workData]);

  // Проверка, является ли пользователь ответственным за работу
  const isResponsible = useMemo(() => {
    if (!user || !workData) return false;
    return workData.responsibleUserId === user.id;
  }, [user, workData]);
  
  // Определяем, нужно ли показывать только обязанности текущего пользователя
  const showOnlyCurrentUserDuties = useMemo(() => {
    if (!user || !workData) return true;
    // Администратор и ответственный видят все обязанности
    return user.role !== 'ADMIN' && !isResponsible;
  }, [user, workData, isResponsible]);

  // Загрузка истории обязанностей
  const loadDutiesHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const historyData = await workService.getHistory(id);
      setWorkHistory(historyData);
      // Также перезагружаем распределения
      forceReloadDuties();
    } catch (error) {
      // Ошибку отобразит UI через notification
      notification.showError('Ошибка при загрузке истории обязанностей');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [id, notification, forceReloadDuties]);

  // Загружаем историю при переключении на вкладку истории
  useEffect(() => {
    if (dutiesTab === 'history' && !workHistory && !isLoadingHistory) {
      loadDutiesHistory();
    }
  }, [dutiesTab, workHistory, isLoadingHistory, loadDutiesHistory]);
  
  // Определяем имя ответственного с учетом данных из запроса
  const responsibleName = useMemo(() => {
    if (responsibleUser) {
      const lastName = responsibleUser.lastName || '';
      const firstName = responsibleUser.firstName || '';
      return `${lastName} ${firstName}`.trim() || responsibleUser.email || 'Пользователь';
    } else if (responsibleUserData) {
      const lastName = responsibleUserData.lastName || '';
      const firstName = responsibleUserData.firstName || '';
      return `${lastName} ${firstName}`.trim() || responsibleUserData.email || 'Пользователь';
    } else {
      return 'Не назначен';
    }
  }, [responsibleUser, responsibleUserData]);

  // Если данные еще не загружены, показываем индикатор загрузки
  if (isLoading || !workData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  // Если произошла ошибка при загрузке данных
  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Ошибка при загрузке данных: {String(error)}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push('/works')}>Вернуться к списку работ</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Заголовок и кнопки управления */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <div className="bg-primary-100 rounded-lg p-2 mr-3">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Рабочий проект</p>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{workData.name}</h1>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l6 6-6 6" />
                </svg>
                ID: {workData.id}
                <span className="mx-2">•</span>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Дата выхода: {workData.releaseDate ? formatDateForDisplay(workData.releaseDate) : 'Не указана'}
              </div>
            </div>
            
            <div className="flex space-x-3">
              {canEdit && (
                <Button 
                  variant={isEditing ? "secondary" : "primary"}
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-6 py-3 rounded-lg shadow-sm font-medium transition-all duration-200 ${
                    isEditing 
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300" 
                      : "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl"
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isEditing ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    )}
                  </svg>
                  {isEditing ? 'Отменить' : 'Редактировать'}
                </Button>
              )}
              
              <Button 
                onClick={() => router.push('/works')}
                variant="secondary"
                className="px-6 py-3 rounded-lg shadow-sm border border-gray-400 bg-gray-50 text-gray-800 hover:bg-gray-100 hover:border-gray-500 font-medium transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Назад к списку
              </Button>
            </div>
          </div>
        </div>
        
        {/* Карточка с информацией о работе */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-6 lg:mb-0 flex-grow">
                  <div className="flex items-center mb-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-primary-100 mb-1">Проект</h2>
                      <h1 className="text-3xl font-bold leading-tight">{workData.name}</h1>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm text-primary-200 block">Ответственный</span>
                        <span className="text-lg font-semibold">{responsibleName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l6 6-6 6" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm text-primary-200 block">Дата выхода</span>
                        <span className="text-lg font-semibold">{formatDateForDisplay(workData.releaseDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white border-opacity-20">
                    <div className="text-sm text-primary-100 mb-2 flex items-center justify-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Общий бюджет
                    </div>
                    <div className="text-4xl font-bold mb-1">{formatCurrency(workData.salary)}</div>
                    <div className="text-xs text-primary-200">Российские рубли</div>
                  </div>
                </div>
              </div>
            </div>
            
            {isEditing ? (
              <div className="bg-white px-6 py-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактирование работы
                  </h3>
                  <p className="text-sm text-gray-600">Измените основные параметры работы</p>
                </div>
                <WorkForm 
                  formData={formData}
                  users={users}
                  onChange={handleChange}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsEditing(false)}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="bg-white">
                <WorkDetails work={workData} users={users} />
              </div>
            )}
          </div>
        </div>
        

        
        {/* Секция обязанностей */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {/* Заголовок секции */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary-100 rounded-lg p-2 mr-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Управление обязанностями</h2>
                    <p className="text-sm text-gray-600">Распределение ролей и ответственности в проекте</p>
                  </div>
                </div>
                
                {canEdit && !isEditingDuties && dutiesTab === 'current' && (
                  <Button
                    onClick={() => setIsEditingDuties(true)}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm hover:from-green-700 hover:to-green-800 font-medium transition-all duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Распределить обязанности
                  </Button>
                )}
              </div>
            </div>
            
            {/* Табы для переключения между текущими обязанностями и историей */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setDutiesTab('current')}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                    dutiesTab === 'current'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Текущие обязанности
                  </div>
                </button>
                <button
                  onClick={() => setDutiesTab('history')}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                    dutiesTab === 'history'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    История изменений
                  </div>
                </button>
              </div>
            </div>
            
            {/* Отображаем уведомления для обязанностей */}
            {(dutiesSuccessMessage || dutiesErrorMessage) && (
              <div className="px-6 pt-4">
                {dutiesSuccessMessage && (
                  <div className="mb-4">
                    <Notification 
                      successMessage={dutiesSuccessMessage}
                      errorMessage=""
                      onClearSuccess={clearDutiesMessages}
                      onClearError={() => {}}
                    />
                  </div>
                )}
                
                {dutiesErrorMessage && (
                  <div className="mb-4">
                    <Notification 
                      successMessage=""
                      errorMessage={dutiesErrorMessage}
                      onClearSuccess={() => {}}
                      onClearError={clearDutiesMessages}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Контент табов */}
            <div className="p-6">
              {dutiesTab === 'current' ? (
                <div>
                  {isEditingDuties ? (
                    <div>
                      <div className="mb-6 pb-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Распределение обязанностей
                        </h3>
                        <p className="text-sm text-gray-600">Назначьте участников проекта и определите их роли</p>
                      </div>
                      <WorkDutiesForm
                        workId={id}
                        duties={duties}
                        users={users}
                        onSubmit={handleDutiesSubmit}
                        onCancel={() => setIsEditingDuties(false)}
                        workSalary={workData.salary}
                        currentDistribution={distributions.length > 0 ? distributions[0] : null}
                        isLoading={false}
                      />
                    </div>
                  ) : (
                    <WorkDuties
                      distributions={distributions}
                      users={users}
                      workSalary={workData.salary}
                      currentUserId={user?.id}
                      showOnlyCurrentUser={showOnlyCurrentUserDuties}
                    />
                  )}
                </div>
              ) : (
                <div>
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                      <p className="text-gray-500 text-sm">Загрузка истории изменений...</p>
                    </div>
                  ) : (
                    <WorkDutiesHistory
                      distributions={distributions}
                      workHistory={workHistory}
                      users={users}
                      workSalary={workData.salary}
                      currentUserId={user?.id}
                      showOnlyCurrentUser={showOnlyCurrentUserDuties}
                      onUpdate={loadDutiesHistory}
                      canEdit={canEdit}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}