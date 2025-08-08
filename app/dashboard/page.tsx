'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../store';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import { fetchDashboardData } from '../../store/slices/dashboard';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay, russianDateToDate } from '../../utils/date';
import { User } from '../../types/user';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    dispatch(fetchDashboardData());
  }, [isAuthenticated, router, dispatch]);

  // Форматирование отображения дня зарплаты
  const formatSalaryDay = (salaryDay: number | null | undefined): string => {
    if (salaryDay === null || salaryDay === undefined) return 'Не указан';
    return `${salaryDay} число`;
  };
  
  // Получение полного имени пользователя
  const getFullName = (user: User | null): string => {
    if (!user) return '';
    return `${user.lastName || ''} ${user.firstName || ''} ${user.middleName || ''}`.trim();
  };
  
  // Расчет возраста на основе даты рождения
  const calculateAge = (birthday: string | null): number | null => {
    if (!birthday) return null;
    
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Функция для корректного отображения даты выхода
  const formatReleaseDate = (releaseDate: string | null | undefined): string => {
    if (!releaseDate) return 'Не указана';
    
    // Отладочная информация
    console.log('🗓️ Форматирование даты выхода:', releaseDate);
    
    const formattedDate = formatDateForDisplay(releaseDate);
    console.log('🗓️ Результат форматирования:', formattedDate);
    
    return formattedDate || 'Не указана';
  };

  if (!user || isLoading || !data) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }
  
  const fullName = getFullName(user);
  const age = calculateAge(user.birthday);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Ваша панель</h1>
        
        <div className="mb-10">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-8 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-6 md:mb-0">
                  <h2 className="text-xl font-medium text-primary-100 mb-2">Общая информация</h2>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <h3 className="text-2xl font-bold">{fullName}</h3>
                    <span className="md:ml-3 text-primary-200 bg-primary-800 bg-opacity-40 rounded-full px-3 py-1 text-sm">{user.email}</span>
                  </div>
                </div>
                <div className="flex flex-col md:items-end">
                  <div className="text-xl font-medium text-primary-100">Зарплата</div>
                  <div className="text-3xl font-bold">{formatCurrency(data.salary)}</div>
                  <div className="text-primary-200 text-sm">Выплата: {formatSalaryDay(user.salaryDay)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1">
                  <div className="text-sm font-medium text-gray-500">Дата рождения</div>
                  <div className="mt-1 text-lg font-medium">{user.birthday || 'Не указана'}</div>
                </div>
                <div className="col-span-1">
                  <div className="text-sm font-medium text-gray-500">Возраст</div>
                  <div className="mt-1 text-lg font-medium">{age ? `${age} лет` : 'Не указан'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="inline-block w-2 h-6 bg-primary-600 mr-3 rounded"></span>
          Ваши работы и обязанности
        </h2>
        
        {data.works.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {data.works.map((workData, workIndex) => (
              <div key={`work-${workIndex}`} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="border-b border-gray-100">
                  <div className="px-6 py-5 flex flex-wrap justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">{workData.name}</h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">Ответственный:</span>
                      <span className="font-medium">
                        {workData.responsibleUser ? 
                          `${workData.responsibleUser.lastName} ${workData.responsibleUser.firstName}` : 
                          'Не назначен'
                        }
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">Дата выхода:</span>
                      <span className="font-medium">
                        {formatReleaseDate(workData.releaseDate)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Зарплата по работе (если пользователь ответственный) */}
                {workData.isResponsible && workData.salary && (
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-primary-50">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Зарплата по работе</span>
                      <span className="text-2xl font-bold text-primary-600">{formatCurrency(workData.salary)}</span>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  <div className="mb-4 flex items-center">
                    <div className="w-2 h-6 bg-primary-500 rounded mr-3"></div>
                    <h3 className="font-bold text-gray-900 text-lg">Ваши обязанности</h3>
                  </div>
                  
                  {workData.duties.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50">
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Название
                            </th>
                            {workData.isResponsible && (
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Расчет оплаты
                              </th>
                            )}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Сумма
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Дата назначения
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {workData.duties.map((duty, dutyIndex) => (
                            <tr key={`duty-${workIndex}-${dutyIndex}`} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{duty.name}</div>
                              </td>
                              
                              {/* Расчет оплаты показываем только для ответственного */}
                              {workData.isResponsible && (duty.price !== undefined || duty.percentage !== undefined) && (
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-2">
                                    {duty.price !== undefined && duty.price !== null && (
                                      <span className="text-gray-700 font-medium">{formatCurrency(Number(duty.price), true)}</span>
                                    )}
                                    
                                    {duty.price !== undefined && duty.price !== null && duty.percentage !== undefined && duty.percentage !== null && (
                                      <span className="text-gray-500">+</span>
                                    )}
                                    
                                    {duty.percentage !== undefined && duty.percentage !== null && (
                                      <span className="text-gray-700 font-medium">{duty.percentage}% от суммы работы</span>
                                    )}
                                    
                                    {((duty.price !== undefined && duty.price !== null) || (duty.percentage !== undefined && duty.percentage !== null)) && (
                                      <span className="text-gray-500">=</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              
                              <td className="px-6 py-4">
                                <span className="text-lg font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-md">
                                  {formatCurrency(duty.calculatedValue, true)}
                                </span>
                              </td>
                              
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {duty.assignedAt}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500 italic">У вас нет обязанностей по этой работе</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden p-10 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-4 text-gray-500">У вас пока нет работ или распределений</p>
          </div>
        )}
      </div>
    </Layout>
  );
} 