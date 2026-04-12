'use client';

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Notification from '../ui/Notification';
import { useWorkIncome } from '../../hooks/useWorkIncome';
import { WorkIncomeList, WorkIncomeModal, DeleteWorkIncomeModal } from './index';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
} from '../../types/work-income';

interface WorkIncomeManagementProps {
  workId: string;
  canEdit?: boolean;
}

const WorkIncomeManagement: React.FC<WorkIncomeManagementProps> = ({ workId, canEdit = true }) => {
  const {
    incomes,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    selectedIncome,
    createIncome,
    updateIncome,
    deleteIncome,
    selectIncome,
    clearMessages,
  } = useWorkIncome({
    workId,
    autoLoad: true,
  });

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
  const handleCreateSubmit = async (data: CreateWorkIncomeRequest | UpdateWorkIncomeRequest) => {
    if (!('workId' in data)) {
      return;
    }

    const success = await createIncome(data);
    if (success) {
      setIsCreateModalOpen(false);
      // Через небольшую задержку очищаем сообщения, чтобы пользователь успел их увидеть
      setTimeout(() => {
        clearMessages();
      }, 3000);
    }
  };

  const handleEditSubmit = async (data: CreateWorkIncomeRequest | UpdateWorkIncomeRequest) => {
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">История поступлений средств</h3>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          {canEdit && (
            <Button
              onClick={handleCreateClick}
              variant="primary"
              disabled={isLoading || isSubmitting}
              className="flex items-center justify-center gap-2 border bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Добавить поступление
            </Button>
          )}
        </div>
      </div>

      <WorkIncomeList
        incomes={incomes}
        isLoading={isLoading}
        onEdit={canEdit ? handleEditClick : undefined}
        onDelete={canEdit ? handleDeleteClick : undefined}
        showActions={canEdit}
      />

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
