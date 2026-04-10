import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CurrencySwitch from '../ui/CurrencySwitch';
import { UpdateWorkDto } from '../../types/work';
import { User } from '../../types/user';
import { formatCurrency, formatAmountWithCurrency } from '../../utils/currency';
import { exchangeRateFacade } from '../../services/exchangeRateFacade';
import { exchangeRateCacheService } from '../../services/exchangeRateCache';
import DocumentsManager from '../documents/DocumentsManager';
import {
  DocumentsStagingContext,
  DocumentsDeferredHandlers,
} from '../../contexts/DocumentsStagingContext';

interface WorkFormProps {
  // Регистрация обработчиков коммита/отмены для документов (отложенный режим)
  onRegisterDocsHandlers?: (handlers: DocumentsDeferredHandlers) => void;
  workId: string;
  formData: UpdateWorkDto;
  users: User[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  onArchiveAction?: () => void;
  archiveActionLabel?: string;
  archiveActionVariant?: 'archive' | 'restore';
  isLoading: boolean;
}

/**
 * Компонент формы для редактирования данных работы
 */
const WorkForm: React.FC<WorkFormProps> = ({
  onRegisterDocsHandlers,
  workId,
  formData,
  users,
  onChange,
  onSubmit,
  onCancel,
  onArchiveAction,
  archiveActionLabel,
  archiveActionVariant = 'archive',
  isLoading,
}) => {
  // Для отслеживания первого рендера
  const isFirstRender = useRef(true);

  // Создаем список опций для выбора ответственного
  const userOptions = users.map((user) => {
    const lastName = user.lastName || '';
    const firstName = user.firstName || '';
    const middleName = user.middleName || '';

    const fullName = `${lastName} ${firstName} ${middleName}`.trim();
    const displayName = fullName || user.email || 'Пользователь';

    return {
      value: user.id,
      label: `${displayName} (${user.email})`,
    };
  });

  // Проверяем валидность данных формы
  const isFormValid =
    formData.name &&
    formData.name.trim().length > 0 &&
    formData.responsibleUserId &&
    (typeof formData.salary === 'number' ||
      (typeof formData.salary === 'string' &&
        !isNaN(parseFloat(formData.salary))));

  // Получаем числовое значение зарплаты для предварительного просмотра
  const salaryValue =
    typeof formData.salary === 'string'
      ? parseFloat(formData.salary) || 0
      : formData.salary || 0;

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    () => formData.currency || 'RUB'
  );
  const [convertedBudget, setConvertedBudget] = useState<number>(
    salaryValue || 0
  );
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCurrency(formData.currency || 'RUB');
  }, [formData.currency]);

  // Currency formatting is centralized in utils/currency
  useEffect(() => {
    setIsConverting(false);
    setConvertError(null);
    const value = !salaryValue || isNaN(salaryValue) ? 0 : salaryValue;
    setConvertedBudget(value);
  }, [salaryValue, selectedCurrency]);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - основная информация */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-gray-600"
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
                Основная информация
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <svg
                      className="w-4 h-4 inline mr-1 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    Название работы
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name || ''}
                    onChange={onChange}
                    required
                    className="w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Введите название работы"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Краткое и понятное название проекта
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="responsibleUserId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <svg
                      className="w-4 h-4 inline mr-1 text-gray-500"
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
                    Ответственный
                  </label>
                  <Select
                    id="responsibleUserId"
                    name="responsibleUserId"
                    value={formData.responsibleUserId || ''}
                    onChange={onChange}
                    required
                    className="w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    options={userOptions}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Пользователь, отвечающий за выполнение работы
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="releaseDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    <svg
                      className="w-4 h-4 inline mr-1 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Дата выхода
                  </label>
                  <Input
                    id="releaseDate"
                    name="releaseDate"
                    type="date"
                    value={formData.releaseDate || ''}
                    onChange={onChange}
                    className="w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Выберите дату выхода"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка - финансовая информация */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6 border border-primary-200">
              <h3 className="text-lg font-semibold text-primary-800 mb-4 flex items-center justify-between">
                <span className="flex items-center">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  Финансы проекта
                </span>
                <CurrencySwitch
                  value={selectedCurrency as 'RUB' | 'USD'}
                  onChange={(val) => {
                    setSelectedCurrency(val);
                    // Пробрасываем изменение валюты в форму
                    const fakeEvent = {
                      target: { name: 'currency', value: val, type: 'text' },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    onChange(fakeEvent);
                  }}
                  size="sm"
                />
              </h3>

              <div>
                <label
                  htmlFor="salary"
                  className="block text-sm font-medium text-primary-700 mb-2"
                >
                  Общий бюджет
                </label>
                <div className="relative">
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.salary ?? ''}
                    onChange={onChange}
                    required
                    className="w-full pl-8 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-primary-500 text-sm">
                      {selectedCurrency === 'USD' ? '$' : '₽'}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-primary-600">
                  Общая сумма, выделенная на проект
                </p>

                {salaryValue > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border border-primary-200">
                    <div className="text-xs text-primary-600 mb-1">
                      Форматированная сумма:
                    </div>
                    <div className="text-xs text-primary-600 mb-1 flex items-center justify-between">
                      <span>({selectedCurrency})</span>
                      {isConverting && (
                        <span className="text-[11px] text-primary-500">
                          Конвертация
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-primary-800">
                      {formatAmountWithCurrency(
                        convertedBudget,
                        selectedCurrency as 'RUB' | 'USD'
                      )}
                    </div>
                    {convertError && (
                      <div className="mt-2 text-[11px] text-red-600">
                        {convertError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Информационная панель */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center mb-2">
                <svg
                  className="w-4 h-4 text-blue-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-blue-800">
                  Информация
                </span>
              </div>
              <p className="text-xs text-blue-700">
                После сохранения изменений все участники проекта получат
                уведомление об обновлении. Распределение обязанностей можно
                настроить в соответствующем разделе.
              </p>
            </div>
          </div>
        </div>

        {/* Документы */}
        <DocumentsStagingContext.Provider
          value={{
            isDeferred: true,
            mode: 'work',
            entityId: workId,
            registerHandlers: onRegisterDocsHandlers,
          }}
        >
          <DocumentsManager mode="work" entityId={workId} />
        </DocumentsStagingContext.Provider>

        {/* Кнопки управления */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onArchiveAction && archiveActionLabel && (
            <Button
              type="button"
              variant={
                archiveActionVariant === 'restore' ? 'primary' : 'danger'
              }
              onClick={onArchiveAction}
              disabled={isLoading}
              className={`px-6 py-2 flex items-center ${
                archiveActionVariant === 'restore'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {archiveActionVariant === 'restore' ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14l-1 9H6L5 8zm0 0V6a2 2 0 012-2h10a2 2 0 012 2v2M9 12v4m6-4v4"
                  />
                )}
              </svg>
              {archiveActionLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 flex items-center"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Отмена
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || !isFormValid}
            className="px-6 py-2 flex items-center bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            Сохранить изменения
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WorkForm;
