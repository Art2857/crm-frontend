'use client';

import React from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
} from '../../types/work-income';
import WorkIncomeForm from './WorkIncomeForm';
import Notification from '../ui/Notification';
import Modal from '../ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      unstyled
      className="overflow-hidden rounded-2xl bg-transparent shadow-none"
    >
      <div className="w-[min(600px,92vw)] overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 shadow-2xl">
        <div className="p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-white/20 p-2">
                <ArrowTrendingUpIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {isEditing ? 'Редактирование поступления' : 'Добавление поступления'}
                </h3>
                <p className="text-xs text-emerald-100">
                  {isEditing
                    ? 'Обновите данные о поступивших средствах'
                    : 'Зафиксируйте новое поступление по работе'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        <div className="modal-scrollbar max-h-[calc(88vh-84px)] overflow-y-auto bg-white p-4 pr-4">
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
    </Modal>
  );
};

export default WorkIncomeModal;
