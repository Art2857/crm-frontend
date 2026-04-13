'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/layout/Layout';
import Button from '../../../components/ui/Button';
import Notification from '../../../components/ui/Notification';
import WorkDetails from '../../../components/works/WorkDetails';
import WorkForm from '../../../components/works/WorkForm';
import WorkDuties from '../../../components/works/WorkDuties';
import WorkDutiesForm from '../../../components/works/WorkDutiesForm';
import WorkDutiesHistory from '../../../components/works/WorkDutiesHistory';
import WorkIncomeManagement from '../../../components/work-income/WorkIncomeManagement';
import DocumentsManager from '../../../components/documents/DocumentsManager';
import { formatAmountWithCurrency } from '../../../utils/currency';
import { formatDateForDisplay } from '../../../utils/date';
import { getDistributionByWorkHistoryId } from '../../../utils/distributions';
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
    canManageArchive,
    archiveStatus,
    isLoadingArchiveStatus,
  } = useWorkDetail(id);

  const salaryCurrency: 'RUB' | 'USD' = workData?.currency === 'USD' ? 'USD' : 'RUB';
  const displaySalary = Number(workData?.salary || 0);
  const isSalaryConfidential = (workData as any)?.isConfidential === true;
  const isWorkerNotResponsible = user?.role === 'WORKER' && !isResponsible;
  const canAccessDocuments = user?.role === 'ADMIN' || isResponsible;
  const currentWorkHistoryId = workData?.history?.[0]?.id;
  const defaultTab: 'duties' | 'dutiesHistory' | 'income' | 'documents' = isWorkerNotResponsible
    ? 'duties'
    : 'income';

  // Состояние для табов
  const [activeTab, setActiveTab] = React.useState<
    'duties' | 'dutiesHistory' | 'income' | 'documents'
  >(defaultTab);

  // Отслеживаем, какие табы уже были посещены (для ленивой инициализации)
  const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(() => new Set([defaultTab]));
  React.useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  React.useEffect(() => {
    if (isWorkerNotResponsible && (activeTab === 'income' || activeTab === 'dutiesHistory')) {
      setActiveTab('duties');
    }
  }, [activeTab, isWorkerNotResponsible]);

  React.useEffect(() => {
    if (!canAccessDocuments && activeTab === 'documents') {
      setActiveTab(defaultTab);
    }
  }, [activeTab, canAccessDocuments, defaultTab]);

  // Загрузка истории обязанностей при первом переключении на таб
  React.useEffect(() => {
    if (activeTab === 'dutiesHistory' && !workHistory && !isLoadingHistory) {
      loadDutiesHistory();
    }
  }, [activeTab, workHistory, isLoadingHistory, loadDutiesHistory]);

  React.useEffect(() => {
    if (
      error &&
      typeof window !== 'undefined' &&
      localStorage.getItem('redirectAfterLogin') === window.location.pathname
    ) {
      localStorage.removeItem('redirectAfterLogin');
    }
  }, [error]);

  // При ошибке показываем явное состояние вместо бесконечного спиннера
  if (error) {
    const isNotFoundError = error.toLowerCase().includes('не найдена') || error.includes('404');

    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 space-y-3">
                <p className="text-sm text-red-700">
                  {isNotFoundError
                    ? 'Работа не найдена. Вероятно, ссылка устарела после пересоздания базы.'
                    : `Ошибка при загрузке данных: ${String(error)}`}
                </p>
                <Button onClick={() => router.push('/works')}>Вернуться к списку работ</Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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

  const workMetaItems = [
    !isSalaryConfidential
      ? {
          key: 'budget',
          label: 'Общий бюджет',
          value: formatAmountWithCurrency(displaySalary, salaryCurrency),
        }
      : null,
    {
      key: 'releaseDate',
      label: 'Дата выхода',
      value: workData.releaseDate ? formatDateForDisplay(workData.releaseDate) : 'Не указана',
    },
    {
      key: 'responsible',
      label: 'Ответственный',
      value: responsibleName,
    },
  ].filter((item): item is { key: string; label: string; value: string } => item !== null);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Заголовок и кнопки управления */}
        <div className="mb-8">
          <div className="flex flex-col gap-16 bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4 lg:items-center">
              <button
                type="button"
                onClick={() => router.push('/works')}
                aria-label="Назад к списку"
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
                <div className="flex min-w-0 items-center">
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
                    <p className="text-sm text-gray-500 font-medium">Рабочий проект</p>
                    <div className="flex items-center space-x-3">
                      <h1 className="truncate text-2xl md:text-3xl font-bold text-gray-900">
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

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 lg:ml-auto">
                  {workMetaItems.map((item, index) => (
                    <React.Fragment key={item.key}>
                      {index > 0 && <span className="text-gray-300">|</span>}
                      <span>
                        {item.label}: <span className="text-gray-900">{item.value}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {canEdit && (
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
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-6">
              <div className="mb-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h3 className="flex items-center text-lg font-semibold text-gray-900">
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
                  <span className="inline-flex items-center text-sm text-gray-500">
                    <span className="mr-2 text-gray-300">|</span>
                    ID: {workData.id}
                  </span>
                </div>
              </div>
              <WorkForm
                formData={formData}
                users={users}
                onChange={handleChange}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsEditing(false);
                }}
                onArchiveAction={
                  canManageArchive
                    ? workData.isArchived
                      ? handleRestoreWork
                      : handleArchiveWork
                    : undefined
                }
                archiveActionLabel={
                  canManageArchive
                    ? workData.isArchived
                      ? 'Восстановить'
                      : 'Архивировать'
                    : undefined
                }
                archiveActionVariant={workData.isArchived ? 'restore' : 'archive'}
                archiveActionDisabled={
                  !workData.isArchived &&
                  (isLoadingArchiveStatus || archiveStatus?.canArchive === false)
                }
                archiveActionReasons={
                  !workData.isArchived
                    ? isLoadingArchiveStatus
                      ? ['Проверяем условия архивирования...']
                      : archiveStatus?.reasons || []
                    : []
                }
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          <WorkDetails work={workData} users={users} />
        )}

        {/* Главные табы для переключения между разделами */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {/* Табы */}
            <div className="border-b border-gray-200">
              <div className="flex">
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
                {canAccessDocuments && (
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                      activeTab === 'documents'
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
                          d="M7 7V3m10 4V3m-9 8h8m-8 4h5m5 4H6a2 2 0 01-2-2V7a2 2 0 012-2h2l1 1h6l1-1h2a2 2 0 012 2v10a2 2 0 01-2 2z"
                        />
                      </svg>
                      Документы
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
              <div style={{ display: activeTab === 'duties' ? 'block' : 'none' }}>
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
                      currentDistribution={getDistributionByWorkHistoryId(
                        distributions,
                        currentWorkHistoryId,
                      )}
                      distributions={distributions}
                      isLoading={false}
                    />
                  </div>
                ) : (
                  <WorkDuties
                    distributions={distributions}
                    users={users}
                    workSalary={workData.salary}
                    currentWorkHistoryId={currentWorkHistoryId}
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
                    <p className="text-gray-500 text-sm">Загрузка истории обязанностей...</p>
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

              <div style={{ display: activeTab === 'income' ? 'block' : 'none' }}>
                {!visitedTabs.has('income') ? null : (
                  <WorkIncomeManagement workId={id} canEdit={canEdit} />
                )}
              </div>

              <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
                {!canAccessDocuments || !visitedTabs.has('documents') ? null : (
                  <DocumentsManager
                    mode="work"
                    entityId={id}
                    canManage={canAccessDocuments}
                    title="Документы работы"
                    description="Храните договоры, ТЗ, акты и другие файлы проекта в одном месте."
                    emptyTitle="Документы пока не добавлены"
                    emptyDescription="Загрузите первый документ, чтобы он появился в списке и был доступен команде."
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
