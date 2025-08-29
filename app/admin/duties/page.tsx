'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Link from 'next/link';
import { Duty } from '../../../types/duty';
import { Role } from '../../../types/user';
import { fetchAllDuties } from '../../../store/slices/duties';
import { formatCurrency, formatPercentage } from '../../../utils/currency';

export default function AdminDutiesPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { duties, isLoading } = useAppSelector((state) => state.duties);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }

    // Загрузка данных об обязанностях
    dispatch(fetchAllDuties({ role: user.role }));
  }, [isAuthenticated, router, user, dispatch]);

  if (!user || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Управление обязанностями
          </h1>

          <Button>
            <Link href="/admin/duties/create" className="text-white">
              Добавить обязанность
            </Link>
          </Button>
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
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {duties.map((duty) => (
                  <tr key={duty.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {duty.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {duty.basePrice ? formatCurrency(duty.basePrice) : '—'}
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
                          ? `${formatCurrency(duty.minValue)} — ${formatCurrency(duty.maxValue)}`
                          : duty.minValue !== null
                            ? `Мин: ${formatCurrency(duty.minValue)}`
                            : `Макс: ${formatCurrency(duty.maxValue)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/duties/${duty.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Редактировать
                      </Link>
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
