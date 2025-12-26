'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Link from 'next/link';
import { Role } from '../../../types/user';
import { fetchAllDuties } from '../../../store/slices/duties';
import {
  formatPercentage,
  formatAmountWithCurrency,
} from '../../../utils/currency';

export default function AdminDutiesPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { duties, isLoading } = useAppSelector((state) => state.duties);
  const [search, setSearch] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (![Role.ADMIN, Role.MANAGER].includes(user?.role as Role)) {
      router.push('/dashboard');
      return;
    }

    // Загрузка данных об обязанностях
    dispatch(fetchAllDuties({ role: user.role }));
  }, [isAuthenticated, router, user, dispatch]);

  const filteredDuties = useMemo(() => {
    if (!search) return duties;
    const lowerSearch = search.toLowerCase();
    return duties.filter((d) => d.name.toLowerCase().includes(lowerSearch));
  }, [duties, search]);

  if (!user || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-6 sm:px-6 lg:px-8">
      <div className="px-0 pb-6 pt-0 sm:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Управление обязанностями
          </h1>

          <div className="flex w-full sm:w-auto items-center gap-4">
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <Button>
              <Link href="/admin/duties/create" className="text-white">
                Добавить обязанность
              </Link>
            </Button>
          </div>
        </div>


        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Название
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Базовая цена
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Базовый процент
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Ограничения
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDuties.map((duty) => (
                  <tr key={duty.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {duty.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {duty.basePrice
                        ? formatAmountWithCurrency(
                            Number(duty.basePrice),
                            duty.currency === 'USD' ? 'USD' : 'RUB'
                          )
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {duty.basePercentage
                        ? formatPercentage(duty.basePercentage, false)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {duty.minValue === null && duty.maxValue === null
                        ? '—'
                        : duty.minValue !== null && duty.maxValue !== null
                          ? `${formatAmountWithCurrency(
                              Number(duty.minValue),
                              duty.currency === 'USD' ? 'USD' : 'RUB'
                            )} — ${formatAmountWithCurrency(
                              Number(duty.maxValue),
                              duty.currency === 'USD' ? 'USD' : 'RUB'
                            )}`
                          : duty.minValue !== null
                            ? `Мин: ${formatAmountWithCurrency(
                                Number(duty.minValue),
                                duty.currency === 'USD' ? 'USD' : 'RUB'
                              )}`
                            : `Макс: ${formatAmountWithCurrency(
                                Number(duty.maxValue),
                                duty.currency === 'USD' ? 'USD' : 'RUB'
                              )}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center">
                        <Link
                          href={`/admin/duties/${duty.id}`}
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
                      </div>
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
