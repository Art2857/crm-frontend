'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import UsersFiltersBar from '../../../components/users/UsersFiltersBar';
import Link from 'next/link';
import { User, Role } from '../../../types/user';
import { fetchAllUsers } from '../../../store/slices/users';
import { useConfirmation } from '../../../hooks/useConfirmation';
import { privateApi } from '../../../services/ApiClient';
import { useNotification } from '../../../contexts/NotificationContext';
import { ArchiveRestore } from 'lucide-react';

export default function AdminUsersPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [sort, setSort] = useState<
    | 'name_asc'
    | 'name_desc'
    | 'createdAt_asc'
    | 'createdAt_desc'
  >('name_asc');

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setSort('name_asc');
  };

  const displayedUsers = useMemo(
    () =>
      (users || []).filter(
        (u) => !!u && !!(u as any).isArchived === showArchived
      ),
    [users, showArchived]
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const notification = useNotification();

  const buildFetchParams = () =>
    ({
      role: user.role,
      archivingStatus: showArchived ? 'archived' : 'actual',
      search: search || undefined,
      roleFilter: roleFilter || undefined,
      orderBy: sort.startsWith('createdAt')
          ? 'createdAt'
          : 'name',
      orderDirection: sort.endsWith('desc') ? 'desc' : 'asc',
    } as any);

  const extractErrorMessage = async (error: any): Promise<string> => {
    const errorPayload = error instanceof Promise ? await error : error;
    if (errorPayload?.originalData?.message) {
      return errorPayload.originalData.message;
    }
    if (errorPayload?.response?.data?.message) {
      return errorPayload.response.data.message;
    }
    if (errorPayload?.message) {
      return errorPayload.message;
    }
    return '';
  };

  const archiveConfirm = useConfirmation<string>(async (id: string) => {
    try {
      await privateApi.patch(`/users/${id}/archive`);
      notification.showSuccess('Пользователь успешно архивирован');
      if (user) {
        await dispatch(fetchAllUsers(buildFetchParams()));
      }
    } catch (error: any) {
      const errorMessage = await extractErrorMessage(error);
      if (errorMessage) notification.showError(errorMessage, 10000);
      else
        notification.showError(
          'Произошла ошибка при архивировании пользователя',
          10000
        );
    }
  });

  const restoreConfirm = useConfirmation<string>(async (id: string) => {
    try {
      await privateApi.patch(`/users/${id}/restore`);
      notification.showSuccess('Пользователь восстановлен из архива');
      if (user) {
        await dispatch(fetchAllUsers(buildFetchParams()));
      }
    } catch (error: any) {
      const errorMessage = await extractErrorMessage(error);
      if (errorMessage) notification.showError(errorMessage, 10000);
      else
        notification.showError(
          'Не удалось восстановить пользователя',
          10000
        );
    }
  });

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (![Role.ADMIN, Role.MANAGER].includes(user?.role)) {
      router.push('/dashboard');
      return;
    }

    // Загрузка данных о пользователях с фильтрами по умолчанию
    dispatch(fetchAllUsers(buildFetchParams()));
  }, [isAuthenticated, router, user, dispatch]);

  // Запрашиваем при изменении фильтров (с дебаунсом для поля поиска)
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const timer = setTimeout(() => {
      dispatch(fetchAllUsers(buildFetchParams()));
    }, 300);
    return () => clearTimeout(timer);
  }, [showArchived, search, roleFilter, sort, user, isAuthenticated, dispatch]);

  if (!user || ![Role.ADMIN, Role.MANAGER].includes(user.role)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Форматирование имени пользователя
  const formatUserName = (user: User | undefined): string => {
    if (!user) return 'Неизвестный пользователь';
    return (
      [user.lastName, user.firstName, user.middleName]
        .filter(Boolean)
        .join(' ') || 'Имя не указано'
    );
  };

  // Форматирование даты рождения для отображения
  const formatBirthday = (birthdayString: string | null): string => {
    if (!birthdayString) return 'Не указана';

    try {
      const date = new Date(birthdayString);
      if (isNaN(date.getTime())) return 'Некорректная дата';

      // Форматируем дату в виде ДД.ММ.ГГГГ
      return date.toLocaleDateString('ru-RU');
    } catch (error) {
      console.error('Error formatting birthday:', birthdayString, error);
      return 'Некорректная дата';
    }
  };

  // Форматирование дня зарплаты
  const formatSalaryDays = (salaryDays: number[] | undefined): string => {
    if (!salaryDays || salaryDays.length === 0) return 'Не указан';
    return salaryDays.map((d) => `${d} число`).join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto pb-8 sm:px-6 lg:px-8">
      <div className="px-0 pb-6 pt-0 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Управление пользователями
          </h1>

          <div className="flex gap-3">
            <Button
              variant={showArchived ? 'primary' : 'secondary'}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Показать активных' : 'Показать архив'}
            </Button>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters((v) => !v)}
            >
              Фильтры
            </Button>
            <Button onClick={() => router.push('/admin/users/create')}>
              Добавить пользователя
            </Button>
          </div>
        </div>

        {showFilters && (
          <UsersFiltersBar
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            sort={sort as any}
            onSortChange={(v) => setSort(v as any)}
            onClear={clearFilters}
          />
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4"
                  >
                    ФИО
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                  >
                    Роль
                  </th>

                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                  >
                    Дни зарплаты
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedUsers &&
                  displayedUsers
                    .filter((user) => user !== undefined)
                    .map((userItem) => (
                      <tr key={userItem?.id || 'unknown'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatUserName(userItem)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatBirthday(userItem?.birthday)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {userItem?.email || 'Email не указан'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              userItem?.role === Role.ADMIN
                                ? 'bg-green-100 text-green-800'
                                : userItem?.role === Role.MANAGER
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {userItem?.role === Role.ADMIN
                              ? 'Администратор'
                              : userItem?.role === Role.MANAGER
                                ? 'Менеджер'
                                : 'Работник'}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatSalaryDays(userItem?.salaryDays)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          {userItem?.id && (
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/admin/users/${userItem.id}`}
                                className="text-primary-600 hover:text-primary-900 p-1.5 rounded-full hover:bg-primary-50 transition-colors"
                                title="Редактировать"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                  />
                                </svg>
                              </Link>
                              {user?.role === Role.ADMIN && (
                              <Link
                                href={`/admin/users/${userItem.id}/history`}
                                className="text-secondary-600 hover:text-secondary-900 p-1.5 rounded-full hover:bg-secondary-50 transition-colors"
                                title="История"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                  />
                                </svg>
                              </Link>
                              )}
                              {userItem?.isArchived ? (
                                <button
                                  type="button"
                                  className="text-green-600 hover:text-green-800 p-1.5 rounded-full hover:bg-green-50 transition-colors"
                                  title="Восстановить"
                                  onClick={() =>
                                    restoreConfirm.confirmAndExecute(
                                      userItem.id,
                                      'Восстановить пользователя из архива?',
                                      {
                                        confirmText: 'Восстановить',
                                        variant: 'primary',
                                      }
                                    )
                                  }
                                >
                                  <ArchiveRestore className="w-5 h-5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="text-red-600 hover:text-red-800 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                  title="Архивировать"
                                  onClick={() =>
                                    archiveConfirm.confirmAndExecute(
                                      userItem.id,
                                      'Архивировать пользователя? Он будет скрыт из активных списков. Продолжить?',
                                      {
                                        confirmText: 'Архивировать',
                                        variant: 'danger',
                                      }
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 10.5v6m0 0L8.25 12.75M12 16.5l3.75-3.75M4.5 6.75h15a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 18V9A2.25 2.25 0 0 1 4.5 6.75ZM6 6.75V4.5A2.25 2.25 0 0 1 8.25 2.25h7.5A2.25 2.25 0 0 1 18 4.5v2.25"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
