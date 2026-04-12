'use client';

import React, { useState, useEffect } from 'react';
import { BanknotesIcon, CalendarDaysIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
  WorkIncomeFormData,
  CURRENCY_OPTIONS,
  EMPTY_WORK_INCOME_FORM,
} from '../../types/work-income';
import { getCurrentDateISO } from '../../utils/date';

interface WorkIncomeFormProps {
  workId: string;
  income?: WorkIncome; // Для редактирования
  isSubmitting?: boolean;
  onSubmit: (data: CreateWorkIncomeRequest | UpdateWorkIncomeRequest) => Promise<void>;
  onCancel: () => void;
}

const WorkIncomeForm: React.FC<WorkIncomeFormProps> = ({
  workId,
  income,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<WorkIncomeFormData>(EMPTY_WORK_INCOME_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!income;
  const selectedCurrency = CURRENCY_OPTIONS.find((option) => option.value === formData.currency);

  // Инициализация формы при редактировании
  useEffect(() => {
    if (income) {
      setFormData({
        amount: income.amount.toString(),
        currency: income.currency,
        receivedDate: income.receivedDate,
        description: income.description || '',
      });
    } else {
      // Устанавливаем текущую дату по умолчанию при создании
      setFormData({
        ...EMPTY_WORK_INCOME_FORM,
        receivedDate: getCurrentDateISO(),
      });
    }
  }, [income]);

  const handleChange = (field: keyof WorkIncomeFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Валидация суммы
    const amount = parseFloat(formData.amount);
    if (!formData.amount.trim()) {
      newErrors.amount = 'Сумма обязательна';
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Сумма должна быть положительным числом';
    } else if (amount > 1000000000) {
      newErrors.amount = 'Сумма слишком велика';
    }

    // Валидация валюты
    if (!formData.currency) {
      newErrors.currency = 'Валюта обязательна';
    } else if (!['RUB', 'USD'].includes(formData.currency)) {
      newErrors.currency = 'Недопустимая валюта';
    }

    // Валидация даты
    if (!formData.receivedDate.trim()) {
      newErrors.receivedDate = 'Дата поступления обязательна';
    } else {
      const date = new Date(formData.receivedDate);
      if (isNaN(date.getTime())) {
        newErrors.receivedDate = 'Некорректная дата';
      } else if (formData.receivedDate > getCurrentDateISO()) {
        newErrors.receivedDate = 'Дата не может быть в будущем';
      }
    }

    // Валидация описания
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Описание не должно превышать 500 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = {
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      receivedDate: formData.receivedDate,
      description: formData.description.trim() || undefined,
    };

    if (isEditing) {
      await onSubmit(data as UpdateWorkIncomeRequest);
    } else {
      await onSubmit({
        ...data,
        workId,
      } as CreateWorkIncomeRequest);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid items-start gap-2 md:grid-cols-[110px_minmax(0,1fr)] md:gap-3">
        <label
          htmlFor="amount"
          className="flex items-center pt-2.5 text-sm font-semibold text-gray-700"
        >
          <BanknotesIcon className="mr-2 h-4 w-4 text-emerald-500" />
          Сумма
        </label>
        <div className="min-w-0">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <span className="text-lg text-gray-500">{selectedCurrency?.symbol || '₽'}</span>
            </div>
            <input
              type="number"
              id="amount"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              step="0.01"
              min="0"
              max="1000000000"
              placeholder="Введите сумму"
              className={`w-full rounded-xl border-2 bg-gray-50 py-3 pl-8 pr-24 text-lg text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                errors.amount || errors.currency
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-200 focus:border-emerald-500'
              }`}
              disabled={isSubmitting}
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <div className="inline-flex select-none items-stretch overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  className={`flex items-center justify-center px-2 text-[11px] transition-colors ${
                    formData.currency === 'RUB'
                      ? 'bg-primary-200 text-black'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleChange('currency', 'RUB')}
                  disabled={isSubmitting}
                >
                  RUB
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center px-2 text-[11px] transition-colors ${
                    formData.currency === 'USD'
                      ? 'bg-primary-200 text-black'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleChange('currency', 'USD')}
                  disabled={isSubmitting}
                >
                  USD
                </button>
              </div>
            </div>
          </div>
          {(errors.amount || errors.currency) && (
            <p className="mt-1 text-sm text-red-600">{errors.amount || errors.currency}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="receivedDate"
          className="flex items-center text-sm font-semibold text-gray-700"
        >
          <CalendarDaysIcon className="mr-2 h-4 w-4 text-indigo-500" />
          Дата поступления
        </label>
        <input
          type="date"
          id="receivedDate"
          value={formData.receivedDate}
          onChange={(e) => handleChange('receivedDate', e.target.value)}
          max={getCurrentDateISO()}
          className={`w-full rounded-lg border-2 bg-white px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
            errors.receivedDate
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 focus:border-indigo-500'
          }`}
          disabled={isSubmitting}
        />
        {errors.receivedDate && <p className="text-sm text-red-600">{errors.receivedDate}</p>}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="flex items-center text-sm font-semibold text-gray-700"
        >
          <DocumentTextIcon className="mr-2 h-4 w-4 text-sky-500" />
          Описание
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Опишите поступление средств (необязательно)"
          className={`w-full resize-none rounded-lg border-2 bg-white px-3 py-2.5 text-sm placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-sky-200 ${
            errors.description
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 focus:border-sky-500'
          }`}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <div />
          )}
          <p className="text-xs text-gray-500">{formData.description.length}/500 символов</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 border-t border-gray-100 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-600 transition-all hover:bg-gray-200"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-2 font-semibold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-blue-700 hover:shadow-xl"
        >
          <BanknotesIcon className="mr-2 h-4 w-4" />
          {isEditing ? 'Сохранить изменения' : 'Добавить поступление'}
        </Button>
      </div>
    </form>
  );
};

export default WorkIncomeForm;
