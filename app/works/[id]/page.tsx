'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/layout/Layout';
import Button from '../../../components/ui/Button';
import Notification from '../../../components/ui/Notification';
import WorkDetails from '../../../components/works/WorkDetails';
import WorkForm from '../../../components/works/WorkForm';
import type { DocumentsDeferredHandlers } from '../../../contexts/DocumentsStagingContext';
import WorkDuties from '../../../components/works/WorkDuties';
import WorkDutiesForm from '../../../components/works/WorkDutiesForm';
import WorkDutiesHistory from '../../../components/works/WorkDutiesHistory';
import WorkIncomeManagement from '../../../components/work-income/WorkIncomeManagement';
import { formatAmountWithCurrency } from '../../../utils/currency';
import { formatDateForDisplay } from '../../../utils/date';
import { useWorkDetail } from '../../../hooks/works/useWorkDetail';

export default function WorkDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const {
    user,
    isLoading,
    error,
    workData,
    isEditing,
    formData,
    setIsEditing,
    handleChange,
    handleFormSubmit,
    duties,
    distributions,
    isEditingDuties,
    dutiesSuccessMessage,
    dutiesErrorMessage,
    setIsEditingDuties,
    handleDutiesSubmit,
    clearDutiesMessages,
    loadDutiesHistory,
    isLoadingHistory,
    workHistory,
    canEdit,
    canDistributeDuties,
    isResponsible,
    showOnlyCurrentUserDuties,
    responsibleName,
    users,
    handleArchiveWork,
    handleRestoreWork,
  } = useWorkDetail(id);
  const docsHandlersRef = React.useRef<DocumentsDeferredHandlers | null>(null);
  // Флаг для коммита документов после успешного сохранения формы
  const shouldCommitDocsRef = React.useRef(false);
  const handleWorkFormSubmit = async (e: React.FormEvent) => {
    // Помечаем, что после успешного сохранения формы нужно закоммитить документы
    shouldCommitDocsRef.current = true;
    await handleFormSubmit(e);
  };
  // Коммитим отложенные документы, когда isEditing меняется с true на false после сохранения
  React.useEffect(() => {
    if (!isEditing && shouldCommitDocsRef.current) {
      (async () => {
        try {
          await docsHandlersRef.current?.commit?.();
        } catch (e) {
          // Игнорируем ошибки коммита здесь; статус сохранения формы уже показан в UI
        } finally {
          shouldCommitDocsRef.current = false;
        }
      })();
    }
  }, [isEditing]);

  const salaryCurrency: 'RUB' | 'USD' =
    workData?.currency === 'USD' ? 'USD' : 'RUB';
  const displaySalary = Number(workData?.salary || 0);
  const isSalaryConfidential = (workData as any)?.isConfidential === true;
  const isWorkerNotResponsible = user?.role === 'WORKER' && !isResponsible;

  // Состояние для табов
  const [activeTab, setActiveTab] = React.useState<
    'duties' | 'dutiesHistory' | 'income'
  >('duties');

  // Отслеживаем, какие табы уже были посещены (для ленивой инициализации)
  const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(
    () => new Set(['duties'])
  );
  React.useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  // Загрузка истории обязанностей при первом переключении на таб
  React.useEffect(() => {
    if (activeTab === 'dutiesHistory' && !workHistory && !isLoadingHistory) {
      loadDutiesHistory();
    }
  }, [activeTab, workHistory, isLoadingHistory, loadDutiesHistory]);

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
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Ошибка при загрузке данных: {String(error)}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => router.push('/works')}>
            Вернуться к списку работ
          </Button>
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
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Рабочий проект
                  </p>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {workData.name}
                    </h1>
                    {workData.isArchived && (
                      <span className="px-3 py-1 text-sm rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                        Архив
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l6 6-6 6"
                  />
                </svg>
                ID: {workData.id}
                <span className="mx-2">•</span>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Дата выхода:{' '}
                {workData.releaseDate
                  ? formatDateForDisplay(workData.releaseDate)
                  : 'Не указана'}
              </div>
            </div>

            <div className="flex space-x-3">
              {canEdit && (
                <>
                  <Button
                    variant={isEditing ? 'secondary' : 'primary'}
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-6 py-3 rounded-lg shadow-sm font-medium transition-all duration-200 ${
                      isEditing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isEditing ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      )}
                    </svg>
                    {isEditing ? 'Отменить' : 'Редактировать'}
                  </Button>

                  {workData.isArchived ? (
                    <Button
                      onClick={handleRestoreWork}
                      className="px-6 py-3 rounded-lg shadow-sm font-medium transition-all duration-200 bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Восстановить
                    </Button>
                  ) : (
                    <Button
                      onClick={handleArchiveWork}
                      className="px-6 py-3 rounded-lg shadow-sm font-medium transition-all duration-200 bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 shadow-lg hover:shadow-xl"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14l-1 9H6L5 8zm0 0V6a2 2 0 012-2h10a2 2 0 012 2v2M9 12v4m6-4v4"
                        />
                      </svg>
                      Архивировать
                    </Button>
                  )}
                </>
              )}

              <Button
                onClick={() => router.push('/works')}
                variant="secondary"
                className="px-6 py-3 rounded-lg shadow-sm border border-gray-400 bg-gray-50 text-gray-800 hover:bg-gray-100 hover:border-gray-500 font-medium transition-all duration-200"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
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
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-primary-100 mb-1">
                        Проект
                      </h2>
                      <div className="flex items-center space-x-3">
                        <h1 className="text-3xl font-bold leading-tight">
                          {workData.name}
                        </h1>
                        {workData.isArchived && (
                          <span className="px-3 py-1 text-sm rounded-full bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                            Архив
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm text-primary-200 block">
                          Ответственный
                        </span>
                        <span className="text-lg font-semibold">
                          {responsibleName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l6 6-6 6"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm text-primary-200 block">
                          Дата выхода
                        </span>
                        <span className="text-lg font-semibold">
                          {formatDateForDisplay(workData.releaseDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white border-opacity-20">
                    <div className="text-sm text-primary-100 mb-2 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      Общий бюджет
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <span className="text-4xl font-bold">
                        {formatAmountWithCurrency(
                          displaySalary,
                          salaryCurrency,
                          isSalaryConfidential
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-primary-200">
                      {isSalaryConfidential
                        ? 'Информация скрыта'
                        : salaryCurrency === 'RUB'
                          ? 'Российские рубли'
                          : 'Доллары США'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="bg-white px-6 py-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Редактирование работы
                  </h3>
                  <p className="text-sm text-gray-600">
                    Измените основные параметры работы
                  </p>
                </div>
                <WorkForm
                  onRegisterDocsHandlers={(h) => (docsHandlersRef.current = h)}
                  workId={id}
                  formData={formData}
                  users={users}
                  onChange={handleChange}
                  onSubmit={handleWorkFormSubmit}
                  onCancel={() => {
                    try {
                      docsHandlersRef.current?.discard?.();
                    } catch (e) {}
                    setIsEditing(false);
                  }}
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

        {/* Главные табы для переключения между разделами */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {/* Заголовок секции */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary-100 rounded-lg p-2 mr-3">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Управление проектом
                    </h2>
                    <p className="text-sm text-gray-600">
                      Обязанности команды и история поступлений средств
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Табы */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('duties')}
                  className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                    activeTab === 'duties'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Обязанности команды
                  </div>
                </button>
                {!isWorkerNotResponsible && (
                  <button
                    onClick={() => setActiveTab('dutiesHistory')}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                      activeTab === 'dutiesHistory'
                        ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      История обязанностей
                    </div>
                  </button>
                )}
                {!isWorkerNotResponsible && (
                  <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                      activeTab === 'income'
                        ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      История поступлений
                    </div>
                  </button>
                )}
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
                      errorMessage={
                        typeof dutiesErrorMessage === 'string'
                          ? dutiesErrorMessage
                          : String(dutiesErrorMessage)
                      }
                      onClearSuccess={() => {}}
                      onClearError={clearDutiesMessages}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Контент табов */}
            <div className="p-6">
              <div
                style={{ display: activeTab === 'duties' ? 'block' : 'none' }}
              >
                {isEditingDuties ? (
                  <div>
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Распределение обязанностей
                      </h3>
                      <p className="text-sm text-gray-600">
                        Назначьте участников проекта и определите их роли
                      </p>
                    </div>
                    <WorkDutiesForm
                      workId={id}
                      duties={duties}
                      users={users}
                      onSubmit={handleDutiesSubmit}
                      onCancel={() => setIsEditingDuties(false)}
                      workSalary={workData.salary}
                      workCurrency={salaryCurrency}
                      releaseDate={workData.releaseDate}
                      currentDistribution={
                        distributions.length > 0 ? distributions[0] : null
                      }
                      distributions={distributions}
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
                    canEdit={canDistributeDuties && !isEditingDuties}
                    onEditDuties={() => setIsEditingDuties(true)}
                  />
                )}
              </div>

              <div
                style={{
                  display: activeTab === 'dutiesHistory' ? 'block' : 'none',
                }}
              >
                {!visitedTabs.has('dutiesHistory') ? null : isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-gray-500 text-sm">
                      Загрузка истории обязанностей...
                    </p>
                  </div>
                ) : (
                  <WorkDutiesHistory
                    distributions={distributions}
                    workHistory={workHistory}
                    users={users}
                    workSalary={workData.salary}
                    workCurrency={salaryCurrency}
                    releaseDate={workData.releaseDate}
                    currentUserId={user?.id}
                    showOnlyCurrentUser={showOnlyCurrentUserDuties}
                    onUpdate={() => loadDutiesHistory(true)}
                    canEdit={canDistributeDuties}
                    isConfidential={isSalaryConfidential}
                  />
                )}
              </div>

              <div
                style={{ display: activeTab === 'income' ? 'block' : 'none' }}
              >
                {!visitedTabs.has('income') ? null : (
                  <WorkIncomeManagement
                    workId={id}
                    canEdit={canEdit}
                    workCurrency={salaryCurrency}
                    workSalary={displaySalary}
                    distributions={distributions}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
