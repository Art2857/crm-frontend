'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { useRouter } from 'next/navigation';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import TimezoneSelector from '../../components/ui/TimezoneSelector';
import { UpdateProfileDto, UserStatus } from '../../types/user';
import { updateUserProfile } from '../../store/slices/users';
import { useDateManager } from '../../hooks/useDateManager';
import { useForm } from '../../hooks/useForm';
import { useNotification } from '../../contexts/NotificationContext';
import { getCurrentUser } from '../../store/slices/auth';
import { useTimezone } from '../../contexts/TimezoneContext';
import Avatar from '../../components/profile/Avatar';

export default function ProfilePage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const notification = useNotification();
  const { timezone: currentTimezone } = useTimezone();
  const { formatISO, formatRussian, dateManager } = useDateManager();

  const initializedRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<UserStatus>(UserStatus.WORKING);
  const [preferencesText, setPreferencesText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Состояние для смены пароля
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Используем наш кастомный хук с валидацией
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    setValue,
    handleSubmit,
    validateForm,
  } = useForm<UpdateProfileDto>(
    {
      login: '',
      email: '',
      firstName: '',
      lastName: '',
      middleName: '',
      birthday: '',
      timezone: '',
      workStart: '',
      workEnd: '',
    },
    {
      login: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_.-]+$/,
      },
      email: {
        required: false,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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
      workStart: {
        pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
      },
      workEnd: {
        pattern: /^([01]\d|2[0-3]):[0-5]\d$/,
      },
    }
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user) {
      setValue('login', user.login || '');
      setValue('email', user.email || '');
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('middleName', user.middleName || '');

      try {
        if (user.birthday) {
          const dateObj = dateManager.parseDate(user.birthday);
          if (dateObj) {
            setValue('birthday', formatISO(dateObj));
          } else {
            setValue('birthday', '');
          }
        } else {
          setValue('birthday', '');
        }
      } catch (e) {
        console.error('Ошибка при обработке даты рождения:', e);
        setValue('birthday', '');
      }

      setValue('timezone', user.timezone || '');
      setValue('workStart', user.workStart || '');
      setValue('workEnd', user.workEnd || '');

      setStatus((user.status as UserStatus) || UserStatus.WORKING);
      try {
        setPreferencesText(
          typeof user.preferences === 'string' ? user.preferences : ''
        );
      } catch {
        setPreferencesText('');
      }
    }

    initializedRef.current = true;
  }, [user, isAuthenticated, router, setValue]);

  const onSubmit = async (data: UpdateProfileDto) => {
    setIsSaving(true);
    try {
      if (!validateForm()) {
        const errorMessages = Object.values(errors).filter(Boolean);
        if (errorMessages.length > 0) {
          notification.showError(
            `Пожалуйста, исправьте ошибки: ${errorMessages.join(', ')}`
          );
          setIsSaving(false);
          return;
        }
      }

      // Валидация пароля
      if (
        passwordForm.newPassword ||
        passwordForm.currentPassword ||
        passwordForm.confirmPassword
      ) {
        if (!passwordForm.currentPassword) {
          notification.showError('Введите текущий пароль');
          setIsSaving(false);
          return;
        }
        if (!passwordForm.newPassword) {
          notification.showError('Введите новый пароль');
          setIsSaving(false);
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          notification.showError('Пароли не совпадают');
          setIsSaving(false);
          return;
        }
        if (passwordForm.newPassword.length < 6) {
          notification.showError(
            'Новый пароль должен содержать минимум 6 символов'
          );
          setIsSaving(false);
          return;
        }
      }

      // Валидация рабочего времени (отправляем только валидные значения)
      const normalizeTime = (t?: string) =>
        t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : undefined;

      const start = normalizeTime(data.workStart);
      const end = normalizeTime(data.workEnd);

      if (start && end) {
        const [sh, sm] = start.split(':').map((n) => parseInt(n));
        const [eh, em] = end.split(':').map((n) => parseInt(n));
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        if (startMinutes >= endMinutes) {
          notification.showError(
            'Время начала работы должно быть раньше времени окончания'
          );
          setIsSaving(false);
          return;
        }
      }
      // Если любое из значений невалидно/пусто — не отправляем поле вообще
      data.workStart = start;
      data.workEnd = end;

      if (data.birthday) {
        try {
          const dateString = `${data.birthday}T00:00:00Z`;
          const dateObj = dateManager.parseDate(dateString);

          if (dateObj) {
            data.birthday = dateObj.toISOString();
          } else {
            throw new Error('Невалидная дата рождения');
          }
        } catch (e) {
          console.error('Ошибка при форматировании даты рождения:', e);
          notification.showError(
            'Ошибка при форматировании даты рождения. Пожалуйста, проверьте формат.'
          );
          setIsSaving(false);
          return;
        }
      } else {
        data.birthday = null;
      }

      data.status = status;
      // Бэкенд ожидает строку; не отправляем пустые значения
      if (preferencesText && preferencesText.trim().length > 0) {
        data.preferences = preferencesText.trim();
      } else {
        delete (data as any).preferences;
      }

      if (currentTimezone) {
        data.timezone = currentTimezone;
      }

      const resultAction = await dispatch(
        updateUserProfile({ role: user.role, userId: user!.id, data })
      );

      if (updateUserProfile.fulfilled.match(resultAction)) {
        notification.showSuccess('Профиль успешно обновлен');

        // TODO: Добавить вызов API для смены пароля если введен новый пароль
        if (passwordForm.newPassword) {
          notification.showInfo(
            'Смена пароля будет реализована в следующих версиях'
          );
        }

        // Выходим из режима редактирования
        setIsEditing(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        setTimeout(() => {
          dispatch(getCurrentUser());
        }, 300);
      }
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      notification.showError('Ошибка при обновлении профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Сбрасываем пароли
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    // Сбрасываем форму к исходным значениям
    if (user) {
      setValue('login', user.login || '');
      setValue('email', user.email || '');
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('middleName', user.middleName || '');
      setValue('workStart', user.workStart || '');
      setValue('workEnd', user.workEnd || '');
      setPreferencesText(
        typeof user.preferences === 'string' ? user.preferences : ''
      );
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const calculateAge = (birthdayString: string | null): number | null => {
    return dateManager.calculateAge(birthdayString);
  };

  const getStatusLabel = (status: UserStatus): string => {
    switch (status) {
      case UserStatus.WORKING:
        return 'На рабочем месте';
      case UserStatus.AWAY:
        return 'Отсутствую';
      case UserStatus.LUNCH:
        return 'Обедаю';
      case UserStatus.SLEEP:
        return 'Сплю';
      default:
        return 'Неизвестно';
    }
  };

  const age = calculateAge(user.birthday);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-8 pt-2 px-4 sm:px-6 lg:px-8">
        {/* Заголовок и кнопка редактирования */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Мой профиль</h1>
            <p className="text-gray-600 mt-2">Ваши личные данные и настройки</p>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="outline">
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Редактировать
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Шапка профиля */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="mb-4 sm:mb-0 sm:mr-6">
                <Avatar user={user} size="large" />
              </div>
              <div className="text-white flex-1">
                <h2 className="text-2xl font-bold mb-2">{fullName}</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Логин:</span>
                    <span className="bg-primary-800/40 px-3 py-1 rounded-full text-sm">
                      {user.login}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Роль:</span>
                    <span className="bg-primary-800/40 px-3 py-1 rounded-full text-sm">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Статус:</span>
                    {isEditing ? (
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(e.target.value as UserStatus)
                        }
                        className="bg-white text-gray-900 rounded px-2 py-1 text-sm"
                      >
                        <option value={UserStatus.WORKING}>
                          На рабочем месте
                        </option>
                        <option value={UserStatus.AWAY}>Отсутствую</option>
                        <option value={UserStatus.LUNCH}>Обедаю</option>
                        <option value={UserStatus.SLEEP}>Сплю</option>
                      </select>
                    ) : (
                      <span className="bg-primary-800/40 px-2 py-1 rounded text-sm">
                        {getStatusLabel(status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Содержимое профиля */}
          <div className="p-6 transition-all duration-200">
            {isEditing ? (
              <div className="animate-fadeIn">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Компактная форма редактирования */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Логин и Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Логин *
                        </label>
                        <input
                          type="text"
                          value={values.login}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="login"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400"
                          placeholder="Введите логин"
                        />
                        {errors.login && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.login}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="email"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400"
                          placeholder="Введите email"
                        />
                        {errors.email && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ФИО в одной строке */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Имя *
                        </label>
                        <input
                          type="text"
                          value={values.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="firstName"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400"
                          placeholder="Введите имя"
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Фамилия *
                        </label>
                        <input
                          type="text"
                          value={values.lastName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="lastName"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400"
                          placeholder="Введите фамилию"
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Отчество
                        </label>
                        <input
                          type="text"
                          value={values.middleName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="middleName"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400"
                          placeholder="Введите отчество"
                        />
                      </div>
                    </div>

                    {/* Дата рождения и часовой пояс */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Дата рождения
                        </label>
                        <input
                          type="date"
                          value={values.birthday}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="birthday"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <TimezoneSelector label="Часовой пояс" />
                      </div>
                    </div>

                    {/* Рабочее время */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Начало рабочего дня
                        </label>
                        <input
                          type="time"
                          value={values.workStart}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="workStart"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Окончание рабочего дня
                        </label>
                        <input
                          type="time"
                          value={values.workEnd}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          name="workEnd"
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Предпочтения */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Предпочтения
                      </label>
                      <textarea
                        value={preferencesText}
                        onChange={(e) => setPreferencesText(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400 resize-none"
                        placeholder="Опишите ваши предпочтения и особые требования..."
                      />
                    </div>

                    {/* Смена пароля */}
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">
                        Смена пароля (необязательно)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">
                            Текущий пароль
                          </label>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            name="currentPassword"
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500 transition-all duration-200 placeholder-gray-400"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">
                            Новый пароль
                          </label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordChange}
                            name="newPassword"
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500 transition-all duration-200 placeholder-gray-400"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">
                            Подтвердите пароль
                          </label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordChange}
                            name="confirmPassword"
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500 transition-all duration-200 placeholder-gray-400"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Кнопки */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="px-6 py-2.5 text-sm"
                      >
                        Отменить
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSaving}
                        isLoading={isSaving}
                        className="px-6 py-2.5 text-sm bg-primary-600 hover:bg-primary-700"
                      >
                        Сохранить изменения
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-8 animate-fadeIn">
                {/* Просмотр данных */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Логин
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.login}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Email
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.email || 'Не указан'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Имя
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.firstName || 'Не указано'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Фамилия
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.lastName || 'Не указано'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Отчество
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.middleName || 'Не указано'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Дата рождения
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.birthday
                        ? formatRussian(user.birthday)
                        : 'Не указана'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Возраст
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {age ? `${age} лет` : 'Не указан'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Часовой пояс
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.timezone
                        ? user.timezone
                            .replace(/&#x2F;/g, '/')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                        : 'Не указан'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Рабочее время
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {user.workStart && user.workEnd
                        ? `${user.workStart} - ${user.workEnd}`
                        : 'Не указано'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Регистрация
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatRussian(user.createdAt)}
                    </div>
                  </div>
                </div>

                {preferencesText && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-3">
                      Предпочтения
                    </div>
                    <div className="text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg">
                      {preferencesText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
