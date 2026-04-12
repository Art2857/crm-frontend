import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CurrencySwitch from '../ui/CurrencySwitch';
import { UpdateWorkDto } from '../../types/work';
import { User } from '../../types/user';

interface WorkFormProps {
  formData: UpdateWorkDto;
  users: User[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
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
      (typeof formData.salary === 'string' && !isNaN(parseFloat(formData.salary))));

  const selectedCurrency = formData.currency || 'RUB';

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                  Название работы
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={onChange}
                  required
                  className="w-full focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="Введите название работы"
                />
              </div>

              <div>
                <label
                  htmlFor="responsibleUserId"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Ответственный
                </label>
                <Select
                  id="responsibleUserId"
                  name="responsibleUserId"
                  value={formData.responsibleUserId || ''}
                  onChange={onChange}
                  required
                  className="w-full focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  options={userOptions}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Пользователь, оформленный на этой работе
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                    Бюджет
                  </label>
                  <CurrencySwitch
                    value={selectedCurrency as 'RUB' | 'USD'}
                    onChange={(val) => {
                      const fakeEvent = {
                        target: { name: 'currency', value: val, type: 'text' },
                      } as unknown as React.ChangeEvent<HTMLInputElement>;
                      onChange(fakeEvent);
                    }}
                    size="sm"
                  />
                </div>
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
                    className="w-full pl-8 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-sm text-gray-500">
                      {selectedCurrency === 'USD' ? '$' : '₽'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="releaseDate"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Дата выхода
                </label>
                <Input
                  id="releaseDate"
                  name="releaseDate"
                  type="date"
                  value={formData.releaseDate || ''}
                  onChange={onChange}
                  className="w-full focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  placeholder="Выберите дату выхода"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onArchiveAction && archiveActionLabel && (
            <Button
              type="button"
              variant={archiveActionVariant === 'restore' ? 'primary' : 'danger'}
              onClick={onArchiveAction}
              disabled={isLoading}
              className={`px-6 py-2 flex items-center ${
                archiveActionVariant === 'restore'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
