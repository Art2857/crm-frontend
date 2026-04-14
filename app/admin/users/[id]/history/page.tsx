'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../../../store';
import Card from '../../../../../components/ui/Card';
import Button from '../../../../../components/ui/Button';
import { Role } from '../../../../../types/user';
import { fetchUserHistory, clearCurrentUser } from '../../../../../store/slices/users';
import { formatDateForDisplay } from '../../../../../utils/date';
import { toDateObject } from '../../../../../utils/date';
import { normalizeBirthday } from '../../../../../utils/birthday';

export default function UserHistoryPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentUser, isLoading } = useAppSelector((state) => state.users);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = params.id;

  // Функция для ручного обновления данных истории
  const refreshUserHistory = async () => {
    if (!user) {
      return;
    }

    try {
      setRefreshing(true);
      await dispatch(fetchUserHistory({ userId }));
    } catch (error) {
      console.error('Ошибка при обновлении истории:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при обновлении истории');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user || user.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }

    // Устанавливаем таймаут для предотвращения вечной загрузки
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 секунд таймаут

    // Загрузка истории пользователя
    dispatch(fetchUserHistory({ userId }))
      .then(() => {
        setHasLoaded(true);
      })
      .catch((error) => {
        console.error('Ошибка при загрузке истории:', error);
        setError(error instanceof Error ? error.message : 'Произошла ошибка при загрузке истории');
        setHasLoaded(true);
      });

    // Очистка данных при размонтировании компонента
    return () => {
      dispatch(clearCurrentUser());
      clearTimeout(timer);
    };
  }, [dispatch, isAuthenticated, router, user, userId]);

  if (!user) {
    return null;
  }

  // Показываем ошибку в удобочитаемом виде
  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <div className="text-center py-6">
              <div className="text-red-500 text-lg font-medium mb-2">Ошибка загрузки данных</div>
              <div className="text-gray-600 mb-4">{error}</div>
              <button
                onClick={refreshUserHistory}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Попробовать снова
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Если таймаут истек или данные загружены, но currentUser отсутствует - показываем сообщение об ошибке
  if ((loadingTimeout || hasLoaded) && !currentUser) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">История изменений</h1>

            <div className="flex space-x-4">
              <Button variant="secondary" onClick={() => router.push('/admin/users')}>
                Назад к списку
              </Button>
            </div>
          </div>

          <Card>
            <div className="text-center py-6 text-gray-500">
              <p>Не удалось загрузить историю пользователя</p>
              <button
                onClick={() => {
                  setHasLoaded(false);
                  setLoadingTimeout(false);
                  dispatch(fetchUserHistory({ userId }))
                    .then(() => setHasLoaded(true))
                    .catch(() => setHasLoaded(true));
                }}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Попробовать снова
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Показываем спиннер, пока загружаются данные и таймаут не истек
  if (isLoading && !loadingTimeout && !hasLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Вычисление возраста на основе даты рождения
  const calculateAge = (birthdayString: string | null): number | null => {
    const normalizedBirthday = normalizeBirthday(birthdayString);
    if (!normalizedBirthday) return null;

    // Попытка преобразовать дату с использованием toDateObject
    const birthday = toDateObject(normalizedBirthday);
    if (!birthday) {
      console.warn('Failed to parse birthday:', normalizedBirthday);
      return null;
    }

    try {
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();

      // Если день рождения в этом году еще не наступил
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age--;
      }

      return age;
    } catch (error) {
      console.error(`Ошибка расчета возраста: ${birthdayString}`, error);
      return null;
    }
  };

  // Форматирование отображения дня зарплаты
  const formatSalaryDays = (salaryDays: number[] | undefined): string => {
    if (!salaryDays || salaryDays.length === 0) return '-';
    return salaryDays.map((d) => `${d} число`).join(', ');
  };

  const getRoleBadge = (role: Role): { className: string; label: string } => {
    switch (role) {
      case Role.ADMIN:
        return { className: 'bg-green-100 text-green-800', label: 'Администратор' };
      case Role.MANAGER:
        return { className: 'bg-blue-100 text-blue-800', label: 'Менеджер' };
      case Role.WORKER:
        return { className: 'bg-slate-100 text-slate-800', label: 'Работник' };
      case Role.HR:
        return { className: 'bg-violet-100 text-violet-800', label: 'HR' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: role };
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            История изменений: {currentUser?.firstName || ''} {currentUser?.lastName || ''}
          </h1>

          <div className="flex space-x-4">
            <Button variant="primary" onClick={refreshUserHistory} isLoading={refreshing}>
              Обновить историю
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin/users')}>
              Назад к списку
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/admin/users/${userId}`)}>
              Редактировать пользователя
            </Button>
          </div>
        </div>

        <Card>
          {currentUser?.history && currentUser.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Дата изменения
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
                      ФИО
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Возраст / Дата рождения
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Дни зарплаты
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Роль
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUser.history.map((historyItem) => (
                    <tr key={historyItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {historyItem.updatedAt
                          ? formatDateForDisplay(historyItem.updatedAt, true)
                          : 'Нет даты'}
                        <div className="text-xs text-gray-400">
                          {historyItem.updatedAt
                            ? new Date(historyItem.updatedAt).toLocaleString()
                            : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{historyItem.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {[
                            historyItem.lastName || '',
                            historyItem.firstName || '',
                            historyItem.middleName || '',
                          ]
                            .filter(Boolean)
                            .join(' ') || 'Не указано'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            // Проверяем и форматируем информацию о возрасте и дате рождения
                            const age = calculateAge(historyItem.birthday);
                            let birthdayDisplay = '';
                            const normalizedBirthday = normalizeBirthday(historyItem.birthday);

                            // Если день рождения есть, пытаемся его отформатировать
                            if (normalizedBirthday) {
                              try {
                                birthdayDisplay = formatDateForDisplay(normalizedBirthday);
                              } catch (e) {
                                console.error('Error formatting birthday:', e);
                              }
                            }

                            // Собираем финальный вывод
                            return (
                              <>
                                {age ? `${age} лет` : '-'} / {birthdayDisplay || '-'}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatSalaryDays(historyItem.salaryDays)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getRoleBadge(historyItem.role).className
                          }`}
                        >
                          {getRoleBadge(historyItem.role).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>История изменений пользователя не найдена</p>
              {currentUser?.id && (
                <button
                  onClick={() =>
                    dispatch(
                      fetchUserHistory({
                        userId: currentUser.id,
                      }),
                    )
                  }
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Обновить данные
                </button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
