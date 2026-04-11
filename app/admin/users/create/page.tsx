'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '../../../../hooks/useForm';
import { useAppSelector, useAppDispatch } from '../../../../store';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Tooltip from '../../../../components/ui/Tooltip';
import { Role } from '../../../../types/user';
import { createUser } from '../../../../store/slices/users';
import {
  generateStrongPassword,
  PASSWORD_REQUIREMENTS,
  validatePasswordStrength,
} from '../../../../utils/password';

// Опции для выбора дней зарплаты (1..28 — чтобы одинаково работать для всех месяцев)
const salaryDayOptions = [
  { value: '', label: 'Не указано' },
  ...Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} число`,
  })),
];

// Все доступные роли
const allRoleOptions = [
  { value: Role.WORKER, label: 'Работник' },
  { value: Role.ADMIN, label: 'Администратор' },
  { value: Role.MANAGER, label: 'Менеджер' },
];

type CreateUserFormData = {
  login: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthday?: string;
  salaryDay1?: string;
  salaryDay2?: string;
  role?: string;
};

export default function CreateUserPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | ReactNode>('');
  const [success, setSuccess] = useState('');
  const canManageUsers = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  // Менеджер может создавать только работников
  const roleOptions =
    user?.role === Role.ADMIN
      ? allRoleOptions
      : allRoleOptions.filter((o) => o.value === Role.WORKER);

  // Используем наш кастомный хук с улучшенной валидацией
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    setValue,
    resetForm,
    handleSubmit,
    validateForm,
  } = useForm<CreateUserFormData>(
    {
      login: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleName: '',
      birthday: '',
      salaryDay1: '',
      salaryDay2: '',
      role: Role.WORKER,
    },
    {
      login: {
        required: true,
        pattern: /^[a-zA-Z0-9_.-]+$/,
        validate: (value) =>
          /^[a-zA-Z0-9_.-]+$/.test(value) ||
          'Логин может содержать только латинские буквы, цифры и символы _.-',
      },
      email: {
        required: false,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        validate: (value) =>
          !value ||
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value) ||
          'Введите корректный email',
      },
      password: {
        required: true,
        minLength: 8,
        validate: (value) => validatePasswordStrength(value),
      },
      firstName: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
      lastName: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
      middleName: {
        maxLength: 50,
      },
      birthday: {
        required: false,
        isDate: true,
      },
      salaryDay1: {
        required: true,
        pattern: /^([1-9]|1[0-9]|2[0-8])$/,
        validate: (value) =>
          (/^([1-9]|1[0-9]|2[0-8])$/.test(value) &&
            parseInt(value) >= 1 &&
            parseInt(value) <= 28) ||
          'День зарплаты должен быть числом от 1 до 28',
      },
      salaryDay2: {
        required: false,
        validate: (value) =>
          !value ||
          (/^([1-9]|1[0-9]|2[0-8])$/.test(value) &&
            parseInt(value) >= 1 &&
            parseInt(value) <= 28) ||
          'День зарплаты должен быть числом от 1 до 28',
      },
      role: {
        required: true,
      },
    },
  );

  // Генерация случайного пароля
  const generateRandomPassword = () => {
    setValue('password', generateStrongPassword());
  };

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!canManageUsers) {
      router.push('/dashboard');
      return;
    }
  }, [canManageUsers, isAuthenticated, router]);

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      setServerError('');
      setSuccess('');

      // Проверяем валидность формы перед отправкой
      if (!validateForm()) {
        const errorMessages = Object.values(errors).filter(Boolean);
        if (errorMessages.length > 0) {
          setServerError(`Пожалуйста, исправьте ошибки: ${errorMessages.join(', ')}`);
          return;
        }
      }

      // Создаем объект для отправки на сервер
      const userData = { ...data } as any;

      // Преобразуем дату рождения в формат ISO-8601 DateTime, если она указана
      if (userData.birthday) {
        try {
          userData.birthday = new Date(`${userData.birthday}T00:00:00Z`).toISOString();
        } catch (e) {
          console.error('Ошибка при форматировании даты:', e);
          setServerError('Некорректный формат даты. Используйте формат ГГГГ-ММ-ДД.');
          return;
        }
      } else {
        // Если поле даты пустое, отправляем null
        userData.birthday = null;
      }

      // Собираем salaryDays из двух полей
      const salaryDays: number[] = [];
      if (userData.salaryDay1 && userData.salaryDay1.trim() !== '') {
        salaryDays.push(parseInt(userData.salaryDay1, 10));
      }
      if (userData.salaryDay2 && userData.salaryDay2.trim() !== '') {
        salaryDays.push(parseInt(userData.salaryDay2, 10));
      }
      delete userData.salaryDay1;
      delete userData.salaryDay2;
      userData.salaryDays = salaryDays.length > 0 ? salaryDays : undefined;

      // Отправляем запрос на создание пользователя
      const resultAction = await dispatch(createUser(userData));

      if (createUser.fulfilled.match(resultAction)) {
        setSuccess('Пользователь успешно создан');
        resetForm(); // Сбрасываем форму после успешного создания
      } else if (createUser.rejected.match(resultAction) && resultAction.payload) {
        // Обработка ошибок валидации и других ошибок
        const errorMessage = resultAction.payload as string;

        // Проверяем, содержит ли сообщение информацию о валидации
        if (errorMessage.includes('Ошибки валидации:')) {
          // Разбиваем сообщение на отдельные строки с ошибками
          const validationLines = errorMessage
            .split('\n')
            .filter((line) => line.trim() !== '')
            .filter((line) => !line.startsWith('Ошибки валидации:'));

          // Группируем ошибки по категориям
          const fieldErrors: Record<string, string[]> = {};
          const generalErrors: string[] = [];

          validationLines.forEach((line) => {
            // Проверяем, является ли строка ошибкой поля (формат "поле: сообщение")
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
              const [, field, message] = match;
              if (!fieldErrors[field]) {
                fieldErrors[field] = [];
              }
              fieldErrors[field].push(message.trim());
            } else {
              // Если не удалось разобрать как ошибку поля, считаем общей ошибкой
              generalErrors.push(line.trim());
            }
          });

          // Создаем структурированное отображение ошибок
          setServerError(
            <div className="text-sm text-red-600">
              {generalErrors.length > 0 && (
                <>
                  <p className="font-medium mb-2">Общие ошибки:</p>
                  <ul className="list-disc pl-4 mb-3">
                    {generalErrors.map((error, index) => (
                      <li key={index} className="mt-1">
                        {error}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {Object.keys(fieldErrors).length > 0 && (
                <>
                  <p className="font-medium mb-2">Ошибки в полях формы:</p>
                  <ul className="list-disc pl-4">
                    {Object.entries(fieldErrors).map(([field, errors], index) => {
                      // Удаляем дубликаты сообщений
                      const uniqueErrors = Array.from(new Set(errors));
                      return (
                        <li key={index} className="mt-1">
                          <span className="font-medium">{field}:</span> {uniqueErrors.join(', ')}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>,
          );
        } else {
          // Обычная строковая ошибка
          setServerError(errorMessage);
        }
      } else {
        setServerError('Произошла ошибка при создании пользователя');
      }
    } catch (err) {
      console.error('Ошибка при создании пользователя:', err);
      setServerError('Произошла ошибка при создании пользователя');
    }
  };

  if (!user || ![Role.ADMIN, Role.MANAGER].includes(user.role)) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto pt-2 pb-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-0 pb-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Создание пользователя</h1>

          <Button variant="secondary" onClick={() => router.push('/admin/users')}>
            Назад к списку
          </Button>
        </div>

        <Card>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="pt-2 pb-4 px-4 md:pt-3 md:pb-6 md:px-6 space-y-4"
            autoComplete="off"
          >
            {/* Раздел 1: Данные аккаунта */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-gray-900 pb-1 border-b border-gray-200 flex items-center">
                <span className="w-1 h-3.5 bg-primary-600 mr-2 rounded-full"></span>
                Данные аккаунта
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  id="login"
                  name="login"
                  label="Логин"
                  required
                  type="text"
                  fullWidth
                  placeholder="login_example"
                  autoComplete="off"
                  value={values.login}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.login}
                  className="mb-0"
                />

                <Input
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  placeholder="email@example.com"
                  value={values.email}
                  onChange={handleChange}
                  error={errors.email}
                  className="mb-0"
                />

                <Select
                  id="role"
                  name="role"
                  label="Роль"
                  required
                  options={roleOptions}
                  fullWidth
                  value={values.role}
                  onChange={handleChange}
                  error={errors.role as string}
                  className="mb-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  id="salaryDay1"
                  name="salaryDay1"
                  label="День выплаты зарплаты (1-й)"
                  required
                  options={salaryDayOptions}
                  fullWidth
                  value={values.salaryDay1}
                  onChange={handleChange}
                  error={errors.salaryDay1}
                  className="mb-0"
                />

                <Select
                  id="salaryDay2"
                  name="salaryDay2"
                  label="День выплаты зарплаты (2-й, необязательно)"
                  options={salaryDayOptions}
                  fullWidth
                  value={values.salaryDay2}
                  onChange={handleChange}
                  error={errors.salaryDay2}
                  className="mb-0"
                />
              </div>

              <div className="text-sm">
                <div className="flex items-center mb-1">
                  <Tooltip
                    delay={1000}
                    className="bg-gray-700 !max-w-md w-max"
                    content={
                      <div className="p-1.5 space-y-1">
                        <p className="font-bold border-b border-gray-600 pb-1 mb-1 text-[11px]">
                          Требования к паролю:
                        </p>
                        <ul className="list-disc list-inside text-[10px] space-y-0.5 text-gray-200">
                          {PASSWORD_REQUIREMENTS.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      </div>
                    }
                  >
                    <div className="flex items-center cursor-help">
                      <label htmlFor="password" className="font-medium text-gray-700">
                        Пароль
                        <span aria-hidden="true" className="text-red-500 ml-1">
                          *
                        </span>
                      </label>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 ml-1.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </Tooltip>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                  <div className="relative flex-grow w-full">
                    <Input
                      id="password"
                      name="password"
                      required
                      type="password"
                      fullWidth
                      autoComplete="new-password"
                      placeholder="Минимум 8 знаков"
                      value={values.password}
                      onChange={handleChange}
                      error={errors.password}
                      className="mb-0"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={generateRandomPassword}
                      className="whitespace-nowrap h-[38px] px-3 text-xs"
                    >
                      Генерация
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Раздел 2: Персональные данные */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-gray-900 pb-1 border-b border-gray-200 flex items-center">
                <span className="w-1 h-3.5 bg-blue-500 mr-2 rounded-full"></span>
                Персональные данные
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  id="lastName"
                  name="lastName"
                  label="Фамилия"
                  required
                  fullWidth
                  placeholder="Иванов"
                  value={values.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.lastName}
                  className="mb-0"
                />

                <Input
                  id="firstName"
                  name="firstName"
                  label="Имя"
                  required
                  fullWidth
                  placeholder="Иван"
                  value={values.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.firstName}
                  className="mb-0"
                />

                <Input
                  id="middleName"
                  name="middleName"
                  label="Отчество"
                  fullWidth
                  placeholder="Иванович"
                  value={values.middleName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.middleName}
                  className="mb-0"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  id="birthday"
                  name="birthday"
                  label="Дата рождения"
                  type="date"
                  fullWidth
                  value={values.birthday}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.birthday}
                  className="mb-0"
                />
              </div>
            </div>

            {/* Блок ошибок и успеха */}
            <div className="pt-0 space-y-1">
              {serverError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-r">
                  <p className="text-xs text-red-800">{serverError}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded-r">
                  <p className="text-xs text-green-800">{success}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading} className="px-6 py-2 text-sm shadow-sm">
                  Создать пользователя
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
