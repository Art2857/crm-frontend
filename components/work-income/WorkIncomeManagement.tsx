'use client';

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Notification from '../ui/Notification';
import { useWorkIncome } from '../../hooks/useWorkIncome';
import {
  WorkIncomeList,
  WorkIncomeModal,
  DeleteWorkIncomeModal,
  WorkIncomeStats,
} from './index';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
} from '../../types/work-income';
import FinancialHistoryChart from './financial-chart';
import { fetchPaymentHistory } from '../../services/payment';
import { Payment } from '../../types/payment';
import { useWorkDetail } from '../../hooks/works/useWorkDetail';
import { useWorkDuties } from '../../hooks/useWorkDuties';
import { useAppSelector } from '../../store';

interface WorkIncomeManagementProps {
  workId: string;
  canEdit?: boolean;
}

const WorkIncomeManagement: React.FC<WorkIncomeManagementProps> = ({
  workId,
  canEdit = true,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  // Используем хуки для получения данных о работе и обязанностях
  const { workData } = useWorkDetail(workId);
  const { distributions } = useWorkDuties({
    workId,
    role: user?.role as any,
  });

  const {
    incomes,
    stats,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    selectedIncome,
    loadWorkIncomes,
    loadStats,
    createIncome,
    updateIncome,
    deleteIncome,
    selectIncome,
    refreshCurrencyConversions,
    clearMessages,
  } = useWorkIncome({
    workId,
    autoLoad: true,
    autoLoadStats: true,
  });

  const [viewMode, setViewMode] = useState<'analysis' | 'chart'>('analysis');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Загрузка платежей для графика всегда при входе в режим чарта
  useEffect(() => {
    if (viewMode === 'chart') {
      const loadPayments = async () => {
        setIsLoadingPayments(true);
        try {
          // Бэкенд имеет ограничение limit=100. Если нужно больше, потребуется пагинация.
          // Пока ставим 100.
          const history = await fetchPaymentHistory({ workId, limit: 100 });
          setPayments(history.payments);
        } catch (e) {
          console.error('Failed to load payments for chart', e);
        } finally {
          setIsLoadingPayments(false);
        }
      };
      loadPayments();
    }
  }, [viewMode, workId]);

  // Состояние модальных окон
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<WorkIncome | null>(null);

  // Очистка сообщений при размонтировании
  useEffect(() => {
    return () => {
      clearMessages();
    };
  }, [clearMessages]);

  // Обработчики модальных окон
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (income: WorkIncome) => {
    selectIncome(income);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (income: WorkIncome) => {
    setIncomeToDelete(income);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIncomeToDelete(null);
    selectIncome(null);
    // Очищаем сообщения при закрытии модальных окон
    clearMessages();
  };

  // Обработчики CRUD операций
  const handleCreateSubmit = async (data: CreateWorkIncomeRequest) => {
    const success = await createIncome(data);
    if (success) {
      setIsCreateModalOpen(false);
      // Через небольшую задержку очищаем сообщения, чтобы пользователь успел их увидеть
      setTimeout(() => {
        clearMessages();
      }, 3000);
    }
  };

  const handleEditSubmit = async (data: UpdateWorkIncomeRequest) => {
    if (!selectedIncome) return;

    const success = await updateIncome(selectedIncome.id, data);
    if (success) {
      setIsEditModalOpen(false);
      selectIncome(null);
      // Через небольшую задержку очищаем сообщения
      setTimeout(() => {
        clearMessages();
      }, 3000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!incomeToDelete) return;

    const success = await deleteIncome(incomeToDelete.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setIncomeToDelete(null);
      // Через небольшую задержку очищаем сообщения
      setTimeout(() => {
        clearMessages();
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Уведомления - показываем только если нет открытых модальных окон */}
      {(error || successMessage) &&
        !isCreateModalOpen &&
        !isEditModalOpen &&
        !isDeleteModalOpen && (
          <Notification
            successMessage={successMessage || ''}
            errorMessage={error || ''}
            onClearSuccess={clearMessages}
            onClearError={clearMessages}
          />
        )}

      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            История поступлений средств
          </h3>
          <p className="text-sm text-gray-600">
            Учет реальных доходов по работе с автоматической конвертацией валют
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-start sm:items-center gap-2">
          {/* Переключатель Вида */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                viewMode === 'analysis'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Анализ
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${
                viewMode === 'chart'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
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
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              График
            </button>
          </div>

          {canEdit && viewMode === 'analysis' && (
            <>
              <Button
                onClick={handleCreateClick}
                variant="primary"
                size="sm"
                disabled={isLoading || isSubmitting}
              >
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Добавить поступление
              </Button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'analysis' ? (
        <>
          {/* Статистика */}
          <WorkIncomeStats stats={stats} isLoading={isLoading} />

          {/* Список доходов */}
          <WorkIncomeList
            incomes={incomes}
            isLoading={isLoading}
            onEdit={canEdit ? handleEditClick : undefined}
            onDelete={canEdit ? handleDeleteClick : undefined}
            showActions={canEdit}
          />
        </>
      ) : (
        /* График */
        <div className="animate-fade-in">
          {isLoadingPayments ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <FinancialHistoryChart
                incomes={incomes}
                payments={payments}
                workCurrency={'RUB'} // По дефолту или TODO: Получить из workData
                workReleaseDate={stats?.releaseDate}
                totalWorkBudget={workData?.salary ? Number(workData.salary) : 0}
                distributions={distributions}
              />
              {/* Список доходов под графиком */}
              <WorkIncomeList
                incomes={incomes}
                isLoading={isLoading}
                onEdit={canEdit ? handleEditClick : undefined}
                onDelete={canEdit ? handleDeleteClick : undefined}
                showActions={canEdit}
              />
            </div>
          )}
        </div>
      )}

      {/* Модальные окна */}
      <WorkIncomeModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        workId={workId}
        isSubmitting={isSubmitting}
        error={error}
        successMessage={successMessage}
        onClearMessages={clearMessages}
        onSubmit={handleCreateSubmit}
      />

      <WorkIncomeModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        workId={workId}
        income={selectedIncome || undefined}
        isSubmitting={isSubmitting}
        error={error}
        successMessage={successMessage}
        onClearMessages={clearMessages}
        onSubmit={handleEditSubmit}
      />

      {incomeToDelete && (
        <DeleteWorkIncomeModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseModals}
          income={incomeToDelete}
          isDeleting={isSubmitting}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default WorkIncomeManagement;
