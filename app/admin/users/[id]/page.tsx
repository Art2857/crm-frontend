'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '../../../../hooks/useForm';
import { useAppSelector, useAppDispatch } from '../../../../store';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import TimezoneSelector from '../../../../components/ui/TimezoneSelector';
import { Role, UserStatus } from '../../../../types/user';
import {
  fetchUserById,
  updateUserProfile,
  updateUserSensitiveData,
  clearCurrentUser,
} from '../../../../store/slices/users';

// Опции для выбора дня зарплаты (1..28)
const salaryDayOptions = [
  { value: '', label: 'Выберите день зарплаты' },
  ...Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} число`,
  })),
];

type UpdateProfileFormData = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthday?: string;
  timezone?: string;
  workStart?: string;
  workEnd?: string;
  status?: UserStatus;
  preferences?: string;
};

type UpdateSensitiveFormData = {
  email?: string;
  role?: string;
  salaryDay?: string;
  characteristics?: string;
};

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser, isLoading, error } = useAppSelector(
    (state) => state.users
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'sensitive'>(
    'profile'
  );

  const userId = params.id;

  const {
    values: profileValues,
    errors: profileErrors,
    handleChange: handleProfileChange,
    handleBlur: handleProfileBlur,
    setValue: setProfileValue,
    handleSubmit: handleSubmitProfile,
    validateForm: validateProfileForm,
  } = useForm<UpdateProfileFormData>(
    {
      firstName: '',
      lastName: '',
      middleName: '',
      birthday: '',
      timezone: '',
      workStart: '',
      workEnd: '',
      status: UserStatus.WORKING,
      preferences: '',
    },
    {
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
      workStart: {
        pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
      },
      workEnd: {
        pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
      },
    }
  );

  const {
    values: sensitiveValues,
    errors: sensitiveErrors,
    handleChange: handleSensitiveChange,
    setValue: setSensitiveValue,
    handleSubmit: handleSubmitSensitive,
    validateForm: validateSensitiveForm,
  } = useForm<UpdateSensitiveFormData>(
    {
      email: '',
      role: '',
      salaryDay: '',
      characteristics: '',
    },
    {
      email: {
        required: true,
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        validate: (value) =>
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value) ||
          'Введите корректный email',
      },
      role: {
        required: true,
      },
      salaryDay: {
        pattern: /^([1-9]|1[0-9]|2[0-8])$/,
        validate: (value) =>
          value === '' ||
          (/^([1-9]|1[0-9]|2[0-8])$/.test(value) &&
            parseInt(value) >= 1 &&
            parseInt(value) <= 28) ||
          'День зарплаты должен быть числом от 1 до 28',
      },
    }
  );

  useEffect(() => {
    // Проверка аутентификации и прав администратора/менеджера
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== Role.ADMIN && user?.role !== Role.MANAGER) {
      router.push('/dashboard');
      return;
    }

    // Обработка ошибок в ID пользователя
    if (!userId || typeof userId !== 'string') {
      setServerError('Некорректный ID пользователя');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('Fetching user with ID:', userId);

    // Загрузка данных пользователя
    dispatch(fetchUserById({ role: user.role, id: userId }));

    // Очистка данных при размонтировании компонента
    return () => {
      dispatch(clearCurrentUser());
    };
  }, [dispatch, isAuthenticated, router, user, userId]);

  // Заполнение формы данными пользователя
  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line no-console
      console.log('Заполняем форму данными пользователя:', currentUser);

      // Заполнение формы профиля
      setProfileValue('firstName', currentUser.firstName || '');
      setProfileValue('lastName', currentUser.lastName || '');
      setProfileValue('middleName', currentUser.middleName || '');

      // Преобразование даты в формат для поля ввода
      // eslint-disable-next-line no-console
      console.log(
        'Дата рождения из данных пользователя:',
        currentUser.birthday,
        typeof currentUser.birthday
      );

      if (currentUser.birthday) {
        try {
          const date = new Date(currentUser.birthday);
          // Check if date is valid before using toISOString()
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0];
            // eslint-disable-next-line no-console
            console.log('Форматированная дата для формы:', formattedDate);
            setProfileValue('birthday', formattedDate);
          } else {
            console.warn(
              'Invalid birthday date detected:',
              currentUser.birthday
            );
            setProfileValue('birthday', '');
          }
        } catch (e) {
          console.error('Error formatting birthday date:', e);
          setProfileValue('birthday', '');
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('Дата рождения отсутствует (null или undefined)');
        setProfileValue('birthday', '');
      }

      setProfileValue('timezone', currentUser.timezone || '');
      setProfileValue('workStart', currentUser.workStart || '');
      setProfileValue('workEnd', currentUser.workEnd || '');
      setProfileValue(
        'status',
        (currentUser.status as any) || (UserStatus.WORKING as any)
      );
      setProfileValue(
        'preferences',
        currentUser.preferences ? JSON.stringify(currentUser.preferences) : ''
      );

      // Заполнение формы чувствительных данных
      setSensitiveValue('email', currentUser.email);
      setSensitiveValue('role', currentUser.role);
      setSensitiveValue(
        'salaryDay',
        currentUser.salaryDay !== null ? String(currentUser.salaryDay) : ''
      );
      setSensitiveValue('characteristics', currentUser.characteristics || '');
    }
  }, [currentUser, setProfileValue, setSensitiveValue]);

  // Переключение между вкладками без переноса данных
  const handleTabChange = (tab: 'profile' | 'sensitive') => {
    setActiveTab(tab);
    setSuccess('');
    setServerError('');

    // Сбрасываем формы к исходным значениям при переключении вкладок
    if (currentUser) {
      if (tab === 'profile') {
        // Перезаполняем форму профиля исходными данными
        setProfileValue('firstName', currentUser.firstName || '');
        setProfileValue('lastName', currentUser.lastName || '');
        setProfileValue('middleName', currentUser.middleName || '');

        if (currentUser.birthday) {
          try {
            const date = new Date(currentUser.birthday);
            // Check if date is valid before using toISOString()
            if (!isNaN(date.getTime())) {
              const formattedDate = date.toISOString().split('T')[0];
              setProfileValue('birthday', formattedDate);
            } else {
              console.warn(
                'Invalid birthday date detected:',
                currentUser.birthday
              );
              setProfileValue('birthday', '');
            }
          } catch (e) {
            console.error('Error formatting birthday date:', e);
            setProfileValue('birthday', '');
          }
        }
      } else {
        // Перезаполняем форму конфиденциальных данных исходными данными
        setSensitiveValue('email', currentUser.email);
        setSensitiveValue('role', currentUser.role);
        setSensitiveValue(
          'salaryDay',
          currentUser.salaryDay !== null ? String(currentUser.salaryDay) : ''
        );
        setSensitiveValue('characteristics', currentUser.characteristics || '');
      }
    }
  };

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    try {
      setServerError('');
      setSuccess('');

      // Логируем данные формы для отладки
      // eslint-disable-next-line no-console
      console.log('Данные формы перед отправкой:', data);

      // Валидация перед отправкой
      if (!validateProfileForm()) {
        const errorMessages = Object.values(profileErrors).filter(Boolean);
        if (errorMessages.length > 0) {
          setServerError(
            `Пожалуйста, исправьте ошибки: ${errorMessages.join(', ')}`
          );
          return;
        }
      }

      // Создаем новый объект только с нужными полями
      const updatedData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        birthday: data.birthday,
        timezone: data.timezone,
        workStart: data.workStart,
        workEnd: data.workEnd,
        status: data.status,
      };
      // Предпочтения сохраняем как простой текст
      if (data.preferences !== undefined) {
        updatedData.preferences = data.preferences;
      }

      // Преобразуем дату рождения в формат ISO-8601 DateTime, если она указана
      if (updatedData.birthday) {
        try {
          // eslint-disable-next-line no-console
          console.log(
            'Преобразуем дату рождения в ISO формат:',
            updatedData.birthday
          );
          const birthday = new Date(`${updatedData.birthday}T00:00:00Z`);
          if (!isNaN(birthday.getTime())) {
            updatedData.birthday = birthday.toISOString();
          } else {
            console.warn(
              'Invalid birthday date, sending as is:',
              updatedData.birthday
            );
          }
        } catch (error) {
          console.error('Ошибка при форматировании даты рождения:', error);
          // Продолжаем с исходной датой в случае ошибки
        }
      }

      // Отправляем запрос на обновление профиля
      // eslint-disable-next-line no-console
      console.log('Отправляем данные на сервер:', updatedData);
      const resultAction = await dispatch(
        updateUserProfile({ userId, role: user.role, data: updatedData })
      );

      if (updateUserProfile.fulfilled.match(resultAction)) {
        setSuccess('Профиль успешно обновлен');

        // Обновляем данные пользователя и историю после успешного обновления
        // eslint-disable-next-line no-console
        console.log('Обновляем данные пользователя после успешного сохранения');
        await dispatch(fetchUserById({ role: user.role, id: userId }));

        // После успешного обновления базовой информации сбрасываем форму конфиденциальных данных
        if (currentUser) {
          setSensitiveValue('email', currentUser.email);
          setSensitiveValue('role', currentUser.role);
          setSensitiveValue(
            'salaryDay',
            currentUser.salaryDay !== null ? String(currentUser.salaryDay) : ''
          );
          setSensitiveValue(
            'characteristics',
            currentUser.characteristics || ''
          );
        }
      } else if (
        updateUserProfile.rejected.match(resultAction) &&
        resultAction.payload
      ) {
        setServerError(resultAction.payload as string);
      }
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      setServerError('Произошла ошибка при обновлении профиля');
    }
  };

  const onSensitiveSubmit = async (data: UpdateSensitiveFormData) => {
    try {
      setServerError('');
      setSuccess('');

      // Валидация перед отправкой
      if (!validateSensitiveForm()) {
        const errorMessages = Object.values(sensitiveErrors).filter(Boolean);
        if (errorMessages.length > 0) {
          setServerError(
            `Пожалуйста, исправьте ошибки: ${errorMessages.join(', ')}`
          );
          return;
        }
      }

      // Создаем объект с обновленными данными
      const updatedData = { ...data } as any;

      // Преобразуем salaryDay из строки в число, если оно указано
      if (
        updatedData.salaryDay !== undefined &&
        updatedData.salaryDay.trim() !== ''
      ) {
        updatedData.salaryDay = parseInt(updatedData.salaryDay, 10);
      } else {
        updatedData.salaryDay = null;
      }

      // Отправляем запрос на обновление чувствительных данных
      const resultAction = await dispatch(
        updateUserSensitiveData({ userId, role: user.role, data: updatedData })
      );

      if (updateUserSensitiveData.fulfilled.match(resultAction)) {
        setSuccess('Данные успешно обновлены');

        // Обновляем данные пользователя и историю после успешного обновления
        await dispatch(fetchUserById({ role: user.role, id: userId }));

        // После успешного обновления конфиденциальных данных сбрасываем форму базовой информации
        if (currentUser) {
          setProfileValue('firstName', currentUser.firstName || '');
          setProfileValue('lastName', currentUser.lastName || '');
          setProfileValue('middleName', currentUser.middleName || '');

          if (currentUser.birthday) {
            try {
              const date = new Date(currentUser.birthday);
              // Check if date is valid before using toISOString()
              if (!isNaN(date.getTime())) {
                const formattedDate = date.toISOString().split('T')[0];
                setProfileValue('birthday', formattedDate);
              } else {
                console.warn(
                  'Invalid birthday date detected:',
                  currentUser.birthday
                );
                setProfileValue('birthday', '');
              }
            } catch (e) {
              console.error('Error formatting birthday date:', e);
              setProfileValue('birthday', '');
            }
          }
        }
      } else if (
        updateUserSensitiveData.rejected.match(resultAction) &&
        resultAction.payload
      ) {
        setServerError(resultAction.payload as string);
      }
    } catch (err) {
      console.error('Ошибка при обновлении данных:', err);
      setServerError('Произошла ошибка при обновлении данных');
    }
  };

  if (
    !user ||
    (user.role !== Role.ADMIN && user.role !== Role.MANAGER) ||
    !currentUser
  ) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Редактирование пользователя: {currentUser.firstName}{' '}
            {currentUser.lastName}
          </h1>

          <div className="flex space-x-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/users')}
            >
              Назад к списку
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/admin/users/${userId}/history`)}
            >
              История изменений
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTabChange('profile')}
              >
                Основная информация
              </button>
              <button
                className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'sensitive'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTabChange('sensitive')}
              >
                Конфиденциальные данные
              </button>
            </nav>
          </div>
        </div>

        <Card>
          {activeTab === 'profile' ? (
            <form
              key="profile-form"
              onSubmit={handleSubmitProfile(onProfileSubmit)}
              className="space-y-6"
            >
              <Input
                id="firstName"
                name="firstName"
                label="Имя"
                fullWidth
                value={profileValues.firstName}
                onChange={handleProfileChange}
                onBlur={handleProfileBlur}
                error={profileErrors.firstName}
              />

              <Input
                id="lastName"
                name="lastName"
                label="Фамилия"
                fullWidth
                value={profileValues.lastName}
                onChange={handleProfileChange}
                onBlur={handleProfileBlur}
                error={profileErrors.lastName}
              />

              <Input
                id="middleName"
                name="middleName"
                label="Отчество"
                fullWidth
                value={profileValues.middleName}
                onChange={handleProfileChange}
                onBlur={handleProfileBlur}
                error={profileErrors.middleName}
              />

              <Input
                id="birthday"
                name="birthday"
                label="Дата рождения (необязательно)"
                type="date"
                fullWidth
                value={profileValues.birthday}
                onChange={handleProfileChange}
                onBlur={handleProfileBlur}
                error={profileErrors.birthday}
              />

              <div className="mb-4">
                <TimezoneSelector
                  label="Часовой пояс"
                  value={profileValues.timezone || ''}
                  onChange={(tz) => setProfileValue('timezone', tz)}
                  selectClassName="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  id="workStart"
                  name="workStart"
                  label="Начало рабочего дня"
                  type="time"
                  fullWidth
                  value={profileValues.workStart || ''}
                  onChange={handleProfileChange}
                  onBlur={handleProfileBlur}
                  error={profileErrors.workStart}
                />
                <Input
                  id="workEnd"
                  name="workEnd"
                  label="Окончание рабочего дня"
                  type="time"
                  fullWidth
                  value={profileValues.workEnd || ''}
                  onChange={handleProfileChange}
                  onBlur={handleProfileBlur}
                  error={profileErrors.workEnd}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Статус
                </label>
                <select
                  name="status"
                  value={profileValues.status as any}
                  onChange={handleProfileChange}
                  className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value={UserStatus.WORKING}>На рабочем месте</option>
                  <option value={UserStatus.AWAY}>Отсутствую</option>
                  <option value={UserStatus.LUNCH}>Обедаю</option>
                  <option value={UserStatus.SLEEP}>Сплю</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Предпочтения (JSON)
                </label>
                <textarea
                  id="preferences"
                  name="preferences"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  value={profileValues.preferences || ''}
                  onChange={handleProfileChange}
                />
              </div>

              {((error && error !== 'REQUEST_CANCELLED') || serverError) && (
                <div className="text-red-500 text-sm mt-4">
                  {error !== 'REQUEST_CANCELLED' ? error : ''}
                  {serverError}
                </div>
              )}
              {success && (
                <div className="text-green-500 text-sm mt-4">{success}</div>
              )}

              <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Сохранить изменения
                </Button>
              </div>
            </form>
          ) : (
            <form
              key="sensitive-form"
              onSubmit={handleSubmitSensitive(onSensitiveSubmit)}
              className="space-y-6"
            >
              <Input
                id="email"
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={sensitiveValues.email}
                onChange={handleSensitiveChange}
                error={sensitiveErrors.email}
              />

              <div className="mb-4">
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Роль
                </label>
                <select
                  id="role"
                  name="role"
                  className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={sensitiveValues.role}
                  onChange={handleSensitiveChange}
                >
                  <option value={Role.WORKER}>Работник</option>
                  <option value={Role.ADMIN}>Администратор</option>
                  <option value={Role.MANAGER}>Менеджер</option>
                </select>
              </div>

              <Select
                id="salaryDay"
                name="salaryDay"
                label="День выплаты зарплаты"
                options={salaryDayOptions}
                fullWidth
                value={sensitiveValues.salaryDay}
                onChange={handleSensitiveChange}
                error={sensitiveErrors.salaryDay}
              />

              {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Характеристика (видно только ADMIN/MANAGER/HR)
                  </label>
                  <textarea
                    name="characteristics"
                    value={sensitiveValues.characteristics || ''}
                    onChange={handleSensitiveChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={4}
                    placeholder="Краткая характеристика сотрудника"
                  />
                </div>
              )}

              {((error && error !== 'REQUEST_CANCELLED') || serverError) && (
                <div className="text-red-500 text-sm mt-4">
                  {error !== 'REQUEST_CANCELLED' ? error : ''}
                  {serverError}
                </div>
              )}
              {success && (
                <div className="text-green-500 text-sm mt-4">{success}</div>
              )}

              <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Сохранить изменения
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
