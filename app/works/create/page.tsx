'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/layout/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { createWork } from '../../../store/slices/works';
import { fetchAllUsers } from '../../../store/slices/users';
import { getCurrentUser } from '../../../store/slices/auth';
import { CreateWorkDto } from '../../../types/work';
import { Role } from '../../../types/user';
import Alert from '../../../components/ui/Alert';

export default function CreateWorkPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error } = useAppSelector((state) => state.works);
  const { users } = useAppSelector((state) => state.users);
  const [formData, setFormData] = useState<CreateWorkDto>({
    name: '',
    responsibleUserId: '',
    salary: '0',
    releaseDate: '',
    currency: 'RUB',
  });
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const canCreateWork = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      dispatch(getCurrentUser()).catch(() => {});
    }
  }, [authLoading, isAuthenticated, user, dispatch]);

  useEffect(() => {
    if (!user?.role) {
      return;
    }
    if (!canCreateWork) {
      router.replace('/works');
    }
  }, [user?.role, canCreateWork, router]);

  // Загружаем список пользователей при монтировании компонента
  useEffect(() => {
    if (!canCreateWork || !user?.role) {
      return;
    }

    dispatch(fetchAllUsers({}));
  }, [dispatch, canCreateWork, user?.role]);

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Очищаем ошибку для измененного поля
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название работы обязательно';
    }

    if (!formData.responsibleUserId) {
      errors.responsibleUserId = 'Необходимо выбрать ответственного';
    }

    if (!formData.salary || Number(formData.salary) < 0) {
      errors.salary = 'Зарплата не может быть отрицательной';
    }

    if (!formData.releaseDate || formData.releaseDate.trim() === '') {
      errors.releaseDate = 'Дата выхода обязательна';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!canCreateWork) {
      return;
    }

    try {
      setSuccess('');
      const resultAction = await dispatch(createWork({ data: formData }));

      if (createWork.fulfilled.match(resultAction)) {
        setSuccess('Работа успешно создана');
        // После создания работы перенаправляем на список работ через 1.5 секунды
        setTimeout(() => {
          router.push('/works');
        }, 1500);
      }
    } catch (err) {
      console.error('Ошибка при создании работы:', err);
    }
  };

  // Создаем список опций для выбора ответственного
  const userOptions = users.map((user) => {
    const fullName =
      `${user.lastName || ''} ${user.firstName || ''} ${user.middleName || ''}`.trim();
    return {
      value: user.id,
      label: fullName !== '' ? `${fullName} (${user.email})` : user.email,
    };
  });

  const getFieldClasses = (hasError: boolean, extraClasses = '') =>
    `w-full rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
    } ${extraClasses}`;

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
          <span className="ml-4 text-gray-600">Проверка аутентификации...</span>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-600">Перенаправление на страницу входа...</span>
        </div>
      </Layout>
    );
  }

  if (!canCreateWork) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64 px-4 text-center">
          <span className="text-gray-600">
            Создание работ доступно только администраторам и менеджерам. Перенаправление…
          </span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-semibold text-gray-900">Создание новой работы</h1>

          <Card className="border border-gray-100 shadow-sm" bodyClassName="px-6 py-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                    Название работы
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Введите название работы"
                    className={getFieldClasses(Boolean(formErrors.name))}
                  />
                  {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="releaseDate"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Дата выхода
                  </label>
                  <input
                    id="releaseDate"
                    name="releaseDate"
                    type="date"
                    value={formData.releaseDate || ''}
                    onChange={handleChange}
                    className={getFieldClasses(Boolean(formErrors.releaseDate))}
                  />
                  {formErrors.releaseDate && (
                    <p className="text-sm text-red-600">{formErrors.releaseDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="responsibleUserId"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Ответственный
                  </label>
                  <div className="relative">
                    <select
                      id="responsibleUserId"
                      name="responsibleUserId"
                      value={formData.responsibleUserId}
                      onChange={handleChange}
                      disabled={users.length === 0}
                      className={getFieldClasses(
                        Boolean(formErrors.responsibleUserId),
                        'appearance-none pr-11',
                      )}
                    >
                      <option value="">
                        {users.length > 0
                          ? 'Выберите ответственного'
                          : 'Загрузка списка ответственных...'}
                      </option>
                      {userOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  {formErrors.responsibleUserId && (
                    <p className="text-sm text-red-600">{formErrors.responsibleUserId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="salary" className="block text-sm font-semibold text-gray-700">
                    Стартовый бюджет работы
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <span className="text-base text-gray-500">
                        {formData.currency === 'USD' ? '$' : '₽'}
                      </span>
                    </div>
                    <input
                      id="salary"
                      name="salary"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.salary || ''}
                      onChange={handleChange}
                      placeholder="Введите бюджет"
                      className={getFieldClasses(
                        Boolean(formErrors.salary),
                        'pl-9 pr-28 text-base',
                      )}
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        {(['RUB', 'USD'] as const).map((currency) => (
                          <button
                            key={currency}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, currency }))}
                            className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                              formData.currency === currency
                                ? 'bg-primary-200 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            aria-pressed={formData.currency === currency}
                          >
                            {currency}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    После создания сумма будет обновляться через фиксацию поступлений, а не через
                    редактирование работы.
                  </p>
                  {formErrors.salary && <p className="text-sm text-red-600">{formErrors.salary}</p>}
                </div>
              </div>

              {error && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/works')}
                  disabled={isLoading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Создать работу
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
