'use client';

import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import { useDateManager } from '../../hooks/useDateManager';
import { ExclamationTriangleIcon, BanknotesIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface PaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currency: CurrencyType;
  periods: Array<{ startDate: string; endDate: string }>;
  workNames: string[];
  calculationDate?: string;
  isBulk?: boolean;
  hasOverpayment?: boolean;
}

export default function PaymentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  currency,
  periods,
  workNames,
  calculationDate,
  isBulk = false,
  hasOverpayment = false,
}: PaymentConfirmModalProps) {
  const { formatRussian } = useDateManager();

  const hasPayment = amount > 0;
  const isMultipleWorks = workNames.length > 1;

  const formattedPeriods = periods
    .map((p) => `${formatRussian(p.startDate)} — ${formatRussian(p.endDate)}`)
    .join(', ');

  const formattedWorks = workNames.join(', ');
  const formattedCalculationDate = calculationDate ? formatRussian(calculationDate) : null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-0 max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div
          className={`p-4 text-white ${hasPayment ? 'bg-gradient-to-r from-green-600 to-blue-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              {hasPayment ? (
                <BanknotesIcon className="h-5 w-5" />
              ) : (
                <CalendarIcon className="h-5 w-5" />
              )}
            </div>
            <h3 className="text-lg font-bold">Подтверждение действия</h3>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 leading-relaxed">
                {hasPayment ? (
                  <>
                    <span>Будет выплачено </span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(amount, currency)}
                    </span>
                    {formattedPeriods && (
                      <>
                        <span> за периоды </span>
                        <span className="font-medium">{formattedPeriods}</span>
                      </>
                    )}
                    <span> по {isMultipleWorks ? 'работам' : 'работе'} </span>
                    <span className="font-semibold">{formattedWorks}</span>
                    {formattedCalculationDate && (
                      <>
                        <span> с закрытием периодов до </span>
                        <span className="font-semibold text-blue-700">
                          {formattedCalculationDate}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span>Будет произведено закрытие периодов</span>
                    {formattedCalculationDate && (
                      <>
                        <span> до </span>
                        <span className="font-semibold text-blue-700">
                          {formattedCalculationDate}
                        </span>
                      </>
                    )}
                    <span> по {isMultipleWorks ? 'работам' : 'работе'} </span>
                    <span className="font-semibold">{formattedWorks}</span>
                    <span>, без выплат — </span>
                    {hasOverpayment ? (
                      <span className="text-amber-700">есть переплата</span>
                    ) : (
                      <span>всё выплачено</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirm}
              className={`px-5 py-2 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all ${
                hasPayment ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {hasPayment ? (
                <>
                  <BanknotesIcon className="h-4 w-4 mr-2" />
                  {isBulk ? 'Выплатить/закрыть по всем работам' : 'Выплатить и закрыть'}
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {isBulk ? 'Закрыть по всем работам' : 'Закрыть период'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
