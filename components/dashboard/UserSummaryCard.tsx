import React from 'react';
import { formatCurrency } from '../../utils/currency';

interface Props {
  fullName: string;
  email: string;
  salary: number;
  salaryDayText: string;
}

export default function UserSummaryCard({
  fullName,
  email,
  salary,
  salaryDayText,
}: Props) {
  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl overflow-hidden shadow-lg">
      <div className="px-6 py-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-6 md:mb-0">
            <h2 className="text-xl font-medium text-primary-100 mb-2">
              Общая информация
            </h2>
            <div className="flex flex-col md:flex-row md:items-center">
              <h3 className="text-2xl font-bold">{fullName}</h3>
              <span className="md:ml-3 text-primary-200 bg-primary-800 bg-opacity-40 rounded-full px-3 py-1 text-sm">
                {email}
              </span>
            </div>
          </div>
          <div className="flex flex-col md:items-end">
            <div className="text-xl font-medium text-primary-100">Зарплата</div>
            <div className="text-3xl font-bold">{formatCurrency(salary)}</div>
            <div className="text-primary-200 text-sm">
              Выплата: {salaryDayText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
