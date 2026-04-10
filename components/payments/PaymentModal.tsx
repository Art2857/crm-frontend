'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { formatCurrency } from '../../utils/payments';
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { PaymentFormData, PaymentModalData } from '../../types/payments';
import { useDateManager } from '../../hooks/useDateManager';
import { getCurrentDateISO } from '../../utils/date';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentFormData | null;
  paymentDate: string | null;
  onSubmit: (data: PaymentModalData) => void;
  periods?: Array<{ startDate: string; endDate: string }>;
  calculationDate?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  payment,
  paymentDate,
  onSubmit,
  periods,
  calculationDate,
}: PaymentModalProps) {
  const [description, setDescription] = useState('');
  const { formatRussian } = useDateManager();

  useEffect(() => {
    if (payment) {
      setDescription(`Выплата для ${payment.userName} по ${payment.workName}`);
    }
  }, [payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    const defaultDescription = `Зарплата по работе ${payment.workName}`;

    const finalDescription = description.trim() || defaultDescription;
    const date = paymentDate || getCurrentDateISO();

    onSubmit({
      amount: payment.amount,
      type: 'SALARY',
      description: finalDescription,
      date,
    });
  };

  if (!payment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-0 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Стильный заголовок с градиентом */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BanknotesIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Создание выплаты</h3>
                <p className="text-green-100 text-xs">Выплата сотруднику</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Форма */}
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Информация о получателе */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">
                    Получатель:
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {payment.userName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-gray-600">
                    Работа:
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {payment.workName}
                  </span>
                </div>
              </div>
            </div>

            {/* Тип выплаты */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <DocumentTextIcon className="h-4 w-4 mr-2 text-orange-500" />
                Тип выплаты
              </label>
              <div className="p-3 rounded-lg border-2 border-purple-500 bg-purple-50 shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">💰</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Зарплата
                    </p>
                    <p className="text-xs text-gray-500">
                      Влияет на закрытие долга
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="flex items-center text-sm font-semibold text-gray-700"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2 text-indigo-500" />
                Описание
              </label>
              <TextArea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание выплаты"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
              />
            </div>

            {/* Пояснение о действии */}
            {(periods?.length || calculationDate) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700 leading-relaxed">
                    <span>Будет выплачено </span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(payment.amount)}
                    </span>
                    {periods && periods.length > 0 && (
                      <>
                        <span> за периоды </span>
                        <span className="font-medium">
                          {periods
                            .map(
                              (p) =>
                                `${formatRussian(p.startDate)} — ${formatRussian(p.endDate)}`
                            )
                            .join(', ')}
                        </span>
                      </>
                    )}
                    <span> по работе </span>
                    <span className="font-semibold">{payment.workName}</span>
                    {calculationDate && (
                      <>
                        <span> с закрытием периодов до </span>
                        <span className="font-semibold text-blue-700">
                          {formatRussian(calculationDate)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Сводка */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="bg-green-100 p-1 rounded">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-green-900 text-sm">
                  Итоговая сумма выплаты
                </h4>
              </div>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-xs text-gray-600 mt-1">Тип: 💰 Зарплата</p>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <BanknotesIcon className="h-4 w-4 mr-2" />
                Создать выплату
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
