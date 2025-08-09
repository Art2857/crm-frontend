import React from 'react';
import { formatCurrency } from '../../utils/currency';

interface DutyRow {
  name: string;
  price?: number | string | null;
  percentage?: number | string | null;
  calculatedValue: number;
  assignedAt?: string | null;
}

interface WorkCardProps {
  name: string;
  responsibleName: string;
  releaseDateText: string;
  isResponsible: boolean;
  salary?: number | null;
  duties: DutyRow[];
}

export default function WorkDutiesTable({
  name,
  responsibleName,
  releaseDateText,
  isResponsible,
  salary,
  duties,
}: WorkCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      <div className="border-b border-gray-100">
        <div className="px-6 py-5 flex flex-wrap justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">{name}</h3>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Ответственный:</span>
            <span className="font-medium">{responsibleName}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Дата выхода:</span>
            <span className="font-medium">{releaseDateText}</span>
          </div>
        </div>
      </div>

      {isResponsible && salary ? (
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-primary-50">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">
              Зарплата по работе
            </span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(salary)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-6">
        <div className="mb-4 flex items-center">
          <div className="w-2 h-6 bg-primary-500 rounded mr-3"></div>
          <h3 className="font-bold text-gray-900 text-lg">Ваши обязанности</h3>
        </div>

        {duties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  {isResponsible && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Расчет оплаты
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата назначения
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {duties.map((duty, idx) => (
                  <tr
                    key={`duty-${idx}`}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {duty.name}
                      </div>
                    </td>
                    {isResponsible &&
                      (duty.price !== undefined ||
                        duty.percentage !== undefined) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {duty.price !== undefined &&
                              duty.price !== null && (
                                <span className="text-gray-700 font-medium">
                                  {formatCurrency(Number(duty.price), true)}
                                </span>
                              )}
                            {duty.price !== undefined &&
                              duty.price !== null &&
                              duty.percentage !== undefined &&
                              duty.percentage !== null && (
                                <span className="text-gray-500">+</span>
                              )}
                            {duty.percentage !== undefined &&
                              duty.percentage !== null && (
                                <span className="text-gray-700 font-medium">
                                  {duty.percentage}% от суммы работы
                                </span>
                              )}
                            {(duty.price !== undefined &&
                              duty.price !== null) ||
                            (duty.percentage !== undefined &&
                              duty.percentage !== null) ? (
                              <span className="text-gray-500">=</span>
                            ) : null}
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
            <p className="text-gray-500 italic">
              У вас нет обязанностей по этой работе
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
