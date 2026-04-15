'use client';

import React from 'react';

import Modal from '../ui/Modal';
import {
  CalculationCurrencyHeader,
  CalculationDateInfo,
  CalculationPeriodsList,
  CalculationSummaryCards,
  CalculationTotalFooter,
  useCalculationDisplayCurrency,
  useCalculationPeriodHelpers,
} from './calculationModalShared';
import { CurrencyType } from '../../utils/payments';
import { DetailedCalculation } from '../../types/payments';

interface DebtsCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: DetailedCalculation | null;
  calculationDate: string;
  initialCurrency?: CurrencyType;
}

export default function DebtsCalculationModal({
  isOpen,
  onClose,
  calculation,
  calculationDate,
  initialCurrency,
}: DebtsCalculationModalProps) {
  const { displayCurrency, setDisplayCurrency, isLoadingRate, rate, displayValues, convert } =
    useCalculationDisplayCurrency(calculation, initialCurrency);
  const { formatRussian } = useCalculationPeriodHelpers(calculation);

  if (!calculation) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-full mx-auto max-h-[95vh] overflow-y-auto w-[90vw]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Детальный расчет по работе: {calculation.userName || 'Пользователь'} ·{' '}
              {calculation.workName || 'Работа'}
            </h3>
          </div>
          <CalculationCurrencyHeader
            displayCurrency={displayCurrency}
            onChange={setDisplayCurrency}
            isLoadingRate={isLoadingRate}
            rate={rate}
            onClose={onClose}
          />
        </div>

        <CalculationSummaryCards
          displayValues={displayValues}
          displayCurrency={displayCurrency}
          isDebtsView
        />

        <div className="space-y-4">
          <CalculationDateInfo
            lastClosureDate={calculation.lastClosureDate}
            calculationDate={calculationDate}
            compact
          />

          <h4 className="text-lg font-medium text-gray-900">
            Разбивка по периодам изменения обязанностей:
          </h4>

          <CalculationPeriodsList
            calculation={calculation}
            displayCurrency={displayCurrency}
            convert={convert}
            rate={rate}
            groupedByWork={false}
          />

          <CalculationTotalFooter
            totalAccrued={displayValues.totalAccrued}
            displayCurrency={displayCurrency}
          />
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-blue-700 font-medium">
            Для получения выплаты обратитесь к ответственному за работу.
          </p>
          <p className="mt-2 text-sm text-blue-600">
            Расчет выполнен до даты {formatRussian(calculationDate) || 'Неизвестная дата'} без
            включения самой этой даты.
          </p>
        </div>
      </div>
    </Modal>
  );
}
