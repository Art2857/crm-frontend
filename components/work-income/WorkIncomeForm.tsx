'use client';

import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
  WorkIncomeFormData,
  CURRENCY_OPTIONS,
  EMPTY_WORK_INCOME_FORM,
} from '../../types/work-income';

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
        receivedDate: new Date().toISOString().split('T')[0],
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
      } else if (date > new Date()) {
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

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Сумма */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Сумма поступления *
        </label>
        <div className="relative">
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            step="0.01"
            min="0"
            max="1000000000"
            placeholder="Введите сумму"
            className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.amount
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300'
            }`}
            disabled={isSubmitting}
          />
        </div>
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
      </div>

      {/* Валюта */}
      <div>
        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
          Валюта *
        </label>
        <select
          id="currency"
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value as 'RUB' | 'USD')}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            errors.currency
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.symbol})
            </option>
          ))}
        </select>
        {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency}</p>}
      </div>

      {/* Дата поступления */}
      <div>
        <label htmlFor="receivedDate" className="block text-sm font-medium text-gray-700 mb-2">
          Дата поступления *
        </label>
        <input
          type="date"
          id="receivedDate"
          value={formData.receivedDate}
          onChange={(e) => handleChange('receivedDate', e.target.value)}
          max={getCurrentDate()}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            errors.receivedDate
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.receivedDate && <p className="mt-1 text-sm text-red-600">{errors.receivedDate}</p>}
      </div>

      {/* Описание */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Описание
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Опишите поступление средств (необязательно)"
          className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            errors.description
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        <div className="mt-1 flex justify-between items-center">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <div />
          )}
          <p className="text-xs text-gray-500">{formData.description.length}/500 символов</p>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Отменить
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
          {isEditing ? 'Сохранить изменения' : 'Добавить запись'}
        </Button>
      </div>
    </form>
  );
};

export default WorkIncomeForm;
