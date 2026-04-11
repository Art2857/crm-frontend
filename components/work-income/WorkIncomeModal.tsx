'use client';

import React from 'react';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
} from '../../types/work-income';
import WorkIncomeForm from './WorkIncomeForm';
import Notification from '../ui/Notification';

interface WorkIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  income?: WorkIncome; // Для редактирования
  isSubmitting?: boolean;
  error?: string | null;
  successMessage?: string | null;
  onClearMessages?: () => void;
  onSubmit: (data: CreateWorkIncomeRequest | UpdateWorkIncomeRequest) => Promise<void>;
}

const WorkIncomeModal: React.FC<WorkIncomeModalProps> = ({
  isOpen,
  onClose,
  workId,
  income,
  isSubmitting = false,
  error,
  successMessage,
  onClearMessages,
  onSubmit,
}) => {
  const isEditing = !!income;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditing ? 'Редактировать запись о доходе' : 'Добавить запись о доходе'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isEditing
                      ? 'Измените данные о поступлении средств'
                      : 'Добавьте информацию о поступлении средств по работе'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            {/* Уведомления внутри модального окна */}
            {(error || successMessage) && (
              <div className="mb-4">
                <Notification
                  successMessage={successMessage || ''}
                  errorMessage={error || ''}
                  onClearSuccess={onClearMessages || (() => {})}
                  onClearError={onClearMessages || (() => {})}
                />
              </div>
            )}

            <WorkIncomeForm
              workId={workId}
              income={income}
              isSubmitting={isSubmitting}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkIncomeModal;
