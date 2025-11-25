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
    | 'salaryDay_asc'
    | 'salaryDay_desc'
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
    dispatch(
      fetchAllUsers({
        role: user.role,
        archivingStatus: showArchived ? 'archived' : 'actual',
        search: search || undefined,
        roleFilter: roleFilter || undefined,
        orderBy: sort.startsWith('salaryDay')
          ? 'salaryDay'
          : sort.startsWith('createdAt')
            ? 'createdAt'
            : 'name',
        orderDirection: sort.endsWith('desc') ? 'desc' : 'asc',
      } as any)
    );
  }, [isAuthenticated, router, user, dispatch]);

  // Запрашиваем при изменении фильтров (с дебаунсом для поля поиска)
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const timer = setTimeout(() => {
      dispatch(
        fetchAllUsers({
          role: user.role,
          archivingStatus: showArchived ? 'archived' : 'actual',
          search: search || undefined,
          roleFilter: roleFilter || undefined,
          orderBy: sort.startsWith('salaryDay')
            ? 'salaryDay'
            : sort.startsWith('createdAt')
              ? 'createdAt'
              : 'name',
          orderDirection: sort.endsWith('desc') ? 'desc' : 'asc',
        } as any)
      );
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

  // Вычисление возраста на основе даты рождения
  const calculateAge = (birthdayString: string | null): number | null => {
    if (!birthdayString) return null;

    try {
      const birthday = new Date(birthdayString);
      if (isNaN(birthday.getTime())) {
        console.warn('Invalid birthday date:', birthdayString);
        return null;
      }

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
      console.error(
        'Error calculating age from birthday:',
        birthdayString,
        error
      );
      return null;
    }
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
  const formatSalaryDay = (salaryDay: number | null | undefined): string => {
    if (salaryDay === null || salaryDay === undefined) return 'Не указан';
    return `${salaryDay} число`;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
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
            <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters((v) => !v)}>
              Фильтры
            </Button>
            <Button>
              <Link href="/admin/users/create" className="text-white">
                Добавить пользователя
              </Link>
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ФИО
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Роль
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Возраст
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    День зарплаты
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
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
                          {calculateAge(userItem?.birthday)
                            ? `${calculateAge(userItem?.birthday)} лет`
                            : 'Возраст не указан'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatSalaryDay(userItem?.salaryDay)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {userItem?.id && (
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={`/admin/users/${userItem.id}`}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                Редактировать
                              </Link>
                              <Link
                                href={`/admin/users/${userItem.id}/history`}
                                className="text-secondary-600 hover:text-secondary-900"
                              >
                                История
                              </Link>
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
