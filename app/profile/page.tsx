'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { useRouter } from 'next/navigation';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { UpdateProfileDto } from '../../types/user';
import { Role } from '../../types/user';
import { updateUserProfile } from '../../store/slices/users';
import { toDateObject, formatDateToISO } from '../../utils/date';
import { useForm } from '../../hooks/useForm';
import { useNotification } from '../../contexts/NotificationContext';
import { authService } from '../../services/auth';
import { getCurrentUser } from '../../store/slices/auth';
import TimezoneSelector from '../../components/ui/TimezoneSelector';

export default function ProfilePage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const notification = useNotification();

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
      firstName: '',
      lastName: '',
      middleName: '',
      birthday: '',
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
    }
  );

  useEffect(() => {
    // Если пользователь не аутентифицирован, перенаправляем его на страницу входа
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Заполняем форму данными пользователя
    if (user) {
      setValue('firstName', user.firstName || '');
      setValue('lastName', user.lastName || '');
      setValue('middleName', user.middleName || '');

      // Используем утилиту для безопасного получения даты
      try {
        if (user.birthday) {
          const dateObj = toDateObject(user.birthday);
          if (dateObj) {
            const formattedDate = dateObj.toISOString().split('T')[0];
            setValue('birthday', formattedDate);
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
    }
  }, [user, isAuthenticated, router, setValue]);

  const onSubmit = async (data: UpdateProfileDto) => {
    try {
      // Перед отправкой вручную валидируем форму
      if (!validateForm()) {
        // Если есть ошибки валидации, выводим сообщение
        const errorMessages = Object.values(errors).filter(Boolean);
        if (errorMessages.length > 0) {
          notification.showError(
            `Пожалуйста, исправьте ошибки: ${errorMessages.join(', ')}`
          );
          return;
        }
      }

      // Преобразуем дату рождения в формат ISO-8601 DateTime, если она указана
      if (data.birthday) {
        try {
          // Создаем дату из строки формата YYYY-MM-DD
          const dateString = `${data.birthday}T00:00:00Z`;
          const dateObj = toDateObject(dateString);

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
          return;
        }
      } else {
        // Если поле даты пустое, отправляем null
        data.birthday = null;
      }

      // Отправляем запрос на обновление профиля
      const resultAction = await dispatch(
        updateUserProfile({ userId: user!.id, data })
      );

      if (updateUserProfile.fulfilled.match(resultAction)) {
        notification.showSuccess('Профиль успешно обновлен');

        // Обновляем данные пользователя после успешного сохранения
        console.log('Обновляем данные пользователя после успешного сохранения');

        // Добавляем небольшую задержку перед запросом актуальных данных
        // чтобы БД успела полностью обновить данные
        setTimeout(() => {
          dispatch(getCurrentUser());
        }, 300);
      }
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      notification.showError('Ошибка при обновлении профиля');
    }
  };

  // Вычисление возраста на основе даты рождения
  const calculateAge = (birthdayString: string | null): number | null => {
    if (!birthdayString) return null;

    const birthday = toDateObject(birthdayString);
    if (!birthday) return null;

    try {
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();

      // Если день рождения в этом году еще не наступил
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthday.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.error(`Ошибка расчета возраста: ${birthdayString}`, error);
      return null;
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const age = calculateAge(user.birthday);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
          Мой профиль
        </h1>

        <div className="mb-10">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-8 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-6 md:mb-0">
                  <h2 className="text-xl font-medium text-primary-100 mb-2">
                    Информация о пользователе
                  </h2>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <h3 className="text-2xl font-bold">{fullName}</h3>
                    <span className="md:ml-3 text-primary-200 bg-primary-800 bg-opacity-40 rounded-full px-3 py-1 text-sm">
                      {user.email}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col md:items-end">
                  <div className="text-xl font-medium text-primary-100">
                    Роль
                  </div>
                  <div className="text-xl font-bold capitalize">
                    {user.role.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1">
                  <div className="text-sm font-medium text-gray-500">
                    Дата рождения
                  </div>
                  <div className="mt-1 text-lg font-medium">
                    {user.birthday
                      ? formatDateToISO(user.birthday)
                      : 'Не указана'}
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="text-sm font-medium text-gray-500">
                    Возраст
                  </div>
                  <div className="mt-1 text-lg font-medium">
                    {age ? `${age} лет` : 'Не указан'}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="text-sm font-medium text-gray-500 mb-1">Часовой пояс</div>
                  <TimezoneSelector />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center mb-6">
            <span className="inline-block w-2 h-6 bg-primary-600 mr-3 rounded"></span>
            <h2 className="text-2xl font-bold text-gray-900">
              Редактирование профиля
            </h2>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    id="firstName"
                    name="firstName"
                    label="Имя"
                    fullWidth
                    value={values.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.firstName}
                  />

                  <Input
                    id="lastName"
                    name="lastName"
                    label="Фамилия"
                    fullWidth
                    value={values.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.lastName}
                  />
                </div>

                <Input
                  id="middleName"
                  name="middleName"
                  label="Отчество"
                  fullWidth
                  value={values.middleName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.middleName}
                />

                <Input
                  id="birthday"
                  name="birthday"
                  label="Дата рождения (необязательно)"
                  type="date"
                  fullWidth
                  value={values.birthday}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.birthday}
                />

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    isLoading={isLoading}
                    className="w-full md:w-auto"
                  >
                    Сохранить изменения
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
