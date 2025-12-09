'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { DetailedCalculation } from '../../types/payments';
import { useDateManager } from '../../hooks/useDateManager';
import { useCalculationView } from '../../hooks/payments/useCalculationView';
import CurrencySwitch from '../ui/CurrencySwitch';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: DetailedCalculation | null;
  onCreatePayment: (
    userId: string,
    workId: string,
    amount: number,
    userName: string,
    workName: string,
    calculationDate?: string
  ) => void;
  isDebtsView: boolean;
  calculationDate?: string;
  isUserCalculation?: boolean; // Флаг для общего расчета пользователя
  showPaymentHistory?: boolean; // Нужно ли показать раздел выплат
  onBulkPayAllWorks?: () => void;
  initialCurrency?: CurrencyType;
}

export default function CalculationModal({
  isOpen,
  onClose,
  calculation,
  onCreatePayment,
  isDebtsView,
  calculationDate,
  isUserCalculation = false,
  showPaymentHistory = true,
  onBulkPayAllWorks,
  initialCurrency,
}: CalculationModalProps) {
  // Hooks must be called unconditionally
  const { formatRussian } = useDateManager();
  const { totals } = useCalculationView(calculation);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>('RUB');

  // Sync initial currency when provided/opened
  useEffect(() => {
    if (isOpen && initialCurrency && (initialCurrency === 'USD' || initialCurrency === 'RUB')) {
      setDisplayCurrency(initialCurrency);
    }
  }, [isOpen, initialCurrency]);

  // Используем хук для конвертации
  const { convert, isLoading: isLoadingRate } = useCurrencyConversion();

  // Конвертированные значения для отображения
  const displayValues = useMemo(() => {
    if (!calculation) {
      return { totalAccrued: 0, totalPaid: 0, remainingDebt: 0, nativeCurrency: 'RUB' as CurrencyType, actualTotalPaid: 0 };
    }

    const periods = calculation.periods || [];
    let totalAccruedSum = 0;

    // Суммируем начисления с учётом валюты каждой обязанности
    for (const p of periods) {
      const duties = Array.isArray(p.duties) ? p.duties : [];
      for (const d of duties as Array<{ calculatedAmount: number; currency?: string }>) {
        const amount = Number(d.calculatedAmount) || 0;
        if (!amount) continue;
        const dutyCurrency: CurrencyType = d.currency === 'USD' ? 'USD' : 'RUB';
        // Конвертируем в целевую валюту отображения
        totalAccruedSum += convert(amount, dutyCurrency, displayCurrency);
      }
    }

    // Determine native currency from the first duty of the first period (if available)
    // This aligns with WorkCard logic
    let nativeCurrency: CurrencyType = 'RUB';
    if (periods.length > 0) {
      const firstPeriod = periods[0];
      const duties = Array.isArray(firstPeriod.duties) ? firstPeriod.duties : [];
      if (duties.length > 0) {
        const firstDuty = duties[0] as { currency?: string };
        if (firstDuty.currency === 'USD') {
          nativeCurrency = 'USD';
        }
      }
    }

    // Если периодов нет, используем totalAccrued (предполагаем RUB)
    if (periods.length === 0 || totalAccruedSum === 0) {
      totalAccruedSum = convert(calculation.totalAccrued, 'RUB', displayCurrency);
    }

    // totalPaid в рублях (выплаты в рублях); remaining считаем из конвертированных сумм
    let totalPaidConverted = 0;
    if (calculation.paymentHistory && calculation.paymentHistory.length > 0) {
      for (const payment of calculation.paymentHistory) {
        const pCurrency = (payment.currency as CurrencyType) || 'RUB';
        totalPaidConverted += convert(payment.amount, pCurrency, displayCurrency);
      }
    } else {
      totalPaidConverted = convert(calculation.totalPaid, 'RUB', displayCurrency);
    }

    // Compute remaining from same-base values to avoid currency drift
    const computedRemaining = Math.max(totalAccruedSum - totalPaidConverted, 0);
    // Align with WorkCard: cap paid by accrued in debts view
    const paidForDisplay = isDebtsView
      ? Math.min(totalPaidConverted, totalAccruedSum)
      : totalPaidConverted;

    return {
      totalAccrued: Math.round(totalAccruedSum),
      totalPaid: Math.round(paidForDisplay),
      remainingDebt: Math.round(computedRemaining),
      nativeCurrency,
      actualTotalPaid: Math.round(totalPaidConverted),
    };
  }, [calculation, displayCurrency, convert, isDebtsView]);

  if (!calculation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className={`p-6 max-w-full mx-auto max-h-[95vh] overflow-y-auto ${calculation?.periods[0]?.duties.length === 1 && !showPaymentHistory
          ? 'w-[70vw]'
          : 'w-[90vw]'
          }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {(() => {
                const userName = calculation?.userName || 'Пользователь';
                const workName = calculation?.workName || 'Работа';
                if (isUserCalculation)
                  return `Детальный расчет по пользователю: ${userName}`;
                if (
                  calculation?.periods[0]?.duties.length === 1 &&
                  !isDebtsView &&
                  !showPaymentHistory
                )
                  return `Детальный расчет: ${userName} · ${workName} · ${calculation.periods[0].duties[0].dutyName}`;
                return `Детальный расчет по работе: ${userName} · ${workName}`;
              })()}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySwitch value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
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

        {/* Для расчета по конкретной обязанности показываем только расчеты */}
        {calculation?.periods[0]?.duties.length === 1 &&
          !isDebtsView &&
          !showPaymentHistory ? (
          <div className="space-y-4">
            {/* Общая информация */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Всего начислено
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(displayValues.totalAccrued, displayCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    {isDebtsView ? 'Уже получено' : 'Уже выплачено'}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(displayValues.totalPaid, displayCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    {isDebtsView ? 'Мне должны' : 'К доплате'}
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(displayValues.remainingDebt, displayCurrency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Компактные информационные блоки */}
            <div className="flex gap-3">
              {calculation.lastClosureDate && (
                <div className="bg-blue-50 rounded-md px-3 py-2 flex-1 text-center border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">
                    Последнее закрытие
                  </p>
                  <p className="text-sm font-semibold text-blue-800">
                    {formatRussian(calculation.lastClosureDate) ||
                      'Неизвестная дата'}
                  </p>
                </div>
              )}

              {calculationDate && (
                <div className="bg-green-50 rounded-md px-3 py-2 flex-1 text-center border border-green-200">
                  <p className="text-xs text-green-600 font-medium">
                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                    Расчет до
                  </p>
                  <p className="text-sm font-semibold text-green-800">
                    {formatRussian(calculationDate) || 'Неизвестная дата'}
                  </p>
                </div>
              )}
            </div>

            <h4 className="text-lg font-medium text-gray-900">
              Разбивка по периодам изменения обязанности:
            </h4>

            {/* Основной контент - только разбивка по периодам для обязанности */}
            <div className="space-y-4">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {calculation.periods.map((period, index) => (
                  <div key={`period-${period.startDate}-${period.endDate}-${index}`} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">
                        Период {index + 1}:{' '}
                        {formatRussian(period.startDate) || 'Неизвестная дата'}{' '}
                        - {formatRussian(period.endDate) || 'Неизвестная дата'}
                      </h5>
                      <Badge className="bg-blue-100 text-blue-800">
                        {period.days} из {period.monthDays} рабочих дней
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {/* Отображаем обязанности с группировкой по работам */}
                      {period.workGroups && period.workGroups.length > 0
                        ? // Если есть группировка по работам - используем её
                        period.workGroups.map((workGroup, wgIndex) => (
                          <div key={`workgroup-${workGroup.workId}-${index}-${wgIndex}`} className="space-y-1">
                            <div className="font-medium text-gray-800 text-sm mb-1">
                              {workGroup.workName}
                            </div>
                            {workGroup.duties.map((duty, dutyIndex) => {
                              const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                              return (
                                <div
                                  key={`duty-${duty.dutyId}-${workGroup.workId}-${index}-${dutyIndex}`}
                                  className="flex items-center justify-between text-sm ml-4"
                                >
                                  <span className="text-gray-700">
                                    {duty.dutyName}:
                                  </span>
                                  <span className="font-mono">
                                    {formatCurrency(duty.monthlyAmount, dutyCurrency)} ×{' '}
                                    {period.days}/{period.monthDays} ={' '}
                                    {formatCurrency(duty.calculatedAmount, dutyCurrency)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))
                        : // Если нет группировки - отображаем как раньше
                        period.duties.map((duty, dutyIndex) => {
                          const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                          return (
                            <div
                              key={`duty-${duty.dutyId}-${index}-${dutyIndex}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {duty.dutyName}:
                              </span>
                              <span className="font-mono">
                                {formatCurrency(duty.monthlyAmount, dutyCurrency)} ×{' '}
                                {period.days}/{period.monthDays} ={' '}
                                {formatCurrency(duty.calculatedAmount, dutyCurrency)}
                              </span>
                            </div>
                          );
                        })}
                      <hr className="border-gray-300" />
                      <div className="flex items-center justify-between font-medium">
                        <span>Итого за период:</span>
                        <span className="text-blue-600">
                          {formatCurrency(
                            (
                              Array.isArray(period.workGroups) && period.workGroups.length > 0
                                ? period.workGroups.reduce((sum, wg) =>
                                  sum + wg.duties.reduce((s, duty) => {
                                    const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                                    const amt = Number(duty.calculatedAmount) || 0;
                                    return s + convert(amt, dutyCurrency, displayCurrency);
                                  }, 0),
                                  0)
                                : (Array.isArray(period.duties) ? period.duties : []).reduce((s, duty: any) => {
                                  const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                                  const amt = Number(duty.calculatedAmount) || 0;
                                  return s + convert(amt, dutyCurrency, displayCurrency);
                                }, 0)
                            ),
                            displayCurrency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Общая сумма всех периодов для обязанности */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <h5 className="text-lg font-semibold text-green-800">
                  Общая сумма за все периоды:
                </h5>
                <span className="text-2xl font-bold text-green-700">
                  {formatCurrency(displayValues.totalAccrued, displayCurrency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Полный расчет для всей работы */
          <>
            {/* Общая информация */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Всего начислено
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(displayValues.totalAccrued, displayCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    {isDebtsView ? 'Уже получено' : 'Уже выплачено'}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(displayValues.totalPaid, displayCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    {isDebtsView ? 'Мне должны' : 'К доплате'}
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(displayValues.remainingDebt, displayCurrency)}
                  </p>
                </div>
              </div>

              {/* Компактная строка с датами */}
              {(calculation.lastClosureDate || calculationDate) && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-center gap-6 text-sm">
                    {calculation.lastClosureDate && (
                      <div className="text-center">
                        <span className="text-blue-600 font-medium">
                          Последнее закрытие:{' '}
                        </span>
                        <span className="text-blue-800 font-semibold">
                          {formatRussian(calculation.lastClosureDate) ||
                            'Неизвестная дата'}
                        </span>
                      </div>
                    )}
                    {calculationDate && (
                      <div className="text-center">
                        <CalendarIcon className="h-4 w-4 inline mr-1 text-green-600" />
                        <span className="text-green-600 font-medium">
                          Расчет до:{' '}
                        </span>
                        <span className="text-green-800 font-semibold">
                          {formatRussian(calculationDate) || 'Неизвестная дата'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Основной контент в двух колонках */}
            <div
              className={`grid gap-8 mb-6 ${showPaymentHistory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
            >
              {/* Левая колонка - Разбивка по периодам */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Разбивка по периодам изменения обязанностей:
                </h4>
                <div className="space-y-4 max-h-[410px] overflow-y-auto pr-2">
                  {calculation.periods.map((period, index) => {
                    const periodStartLocalDateString =
                      formatRussian(period.startDate) || 'Неизвестная дата';
                    const periodEndLocalDateString =
                      formatRussian(period.endDate) || 'Неизвестная дата';

                    return (
                      <div key={`period-detail-${period.startDate}-${period.endDate}-${index}`} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            <span> Период {index + 1} </span>
                            <span> {periodStartLocalDateString} </span>-
                            <span> {periodEndLocalDateString} </span>
                          </h5>
                          <Badge className="bg-blue-100 text-blue-800">
                            {period.days || 0} из {period.monthDays || 0}{' '}
                            рабочих дней
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {/* Отображаем обязанности с группировкой по работам */}
                          {period.workGroups && period.workGroups.length > 0
                            ? // Если есть группировка по работам - используем её
                            period.workGroups.map((workGroup, wgIndex) => (
                              <div
                                key={`workgroup-detail-${workGroup.workId}-${index}-${wgIndex}`}
                                className="space-y-1"
                              >
                                <div className="font-medium text-gray-800 text-sm mb-1">
                                  {workGroup.workName}
                                </div>
                                {workGroup.duties.map((duty, dutyIndex) => {
                                  const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                                  return (
                                    <div
                                      key={`duty-detail-${duty.dutyId}-${workGroup.workId}-${index}-${dutyIndex}`}
                                      className="flex items-center justify-between text-sm ml-4"
                                    >
                                      <span className="text-gray-700">
                                        {duty.dutyName}:
                                      </span>
                                      <span className="font-mono">
                                        {formatCurrency(duty.monthlyAmount, dutyCurrency)} ×{' '}
                                        {period.days || 0}/
                                        {period.monthDays || 0} ={' '}
                                        {formatCurrency(duty.calculatedAmount, dutyCurrency)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                            : // Если нет группировки - отображаем все обязанности
                            period.duties.map((duty, dutyIndex) => {
                              const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                              return (
                                <div
                                  key={`duty-alt-${duty.dutyId}-${index}-${dutyIndex}`}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {duty.workName ? (
                                      <>
                                        <span className="text-gray-500 mr-1">
                                          {duty.workName}:
                                        </span>
                                        {duty.dutyName}:
                                      </>
                                    ) : (
                                      <>{duty.dutyName}:</>
                                    )}
                                  </span>
                                  <span className="font-mono">
                                    {formatCurrency(duty.monthlyAmount, dutyCurrency)} ×{' '}
                                    {period.days || 0}/{period.monthDays || 0} ={' '}
                                    {formatCurrency(duty.calculatedAmount, dutyCurrency)}
                                  </span>
                                </div>
                              );
                            })}
                          <hr className="border-gray-300" />
                          <div className="flex items-center justify-between font-medium">
                            <span>Итого за период:</span>
                            <span className="text-blue-600">
                              {formatCurrency(
                                (
                                  Array.isArray(period.workGroups) && period.workGroups.length > 0
                                    ? period.workGroups.reduce((sum, wg) =>
                                      sum + wg.duties.reduce((s, duty) => {
                                        const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                                        const amt = Number(duty.calculatedAmount) || 0;
                                        return s + convert(amt, dutyCurrency, displayCurrency);
                                      }, 0),
                                      0)
                                    : (Array.isArray(period.duties) ? period.duties : []).reduce((s, duty: any) => {
                                      const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                                      const amt = Number(duty.calculatedAmount) || 0;
                                      return s + convert(amt, dutyCurrency, displayCurrency);
                                    }, 0)
                                ),
                                displayCurrency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Общая сумма всех периодов */}
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-semibold text-green-800">
                      Общая сумма за все периоды:
                    </h5>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(displayValues.totalAccrued, displayCurrency)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Правая колонка - История выплат */}
              {showPaymentHistory && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    История выплат:
                  </h4>
                  <p className="text-sm text-gray-600">(все типы выплат)</p>
                  {calculation.paymentHistory.length > 0 ? (
                    <div className="space-y-3">
                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                        {calculation.paymentHistory.map((payment, paymentIndex) => (
                          <div
                            key={`payment-${payment.id}-${paymentIndex}`}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className={`p-2 rounded-full ${payment.type === 'SALARY'
                                  ? 'bg-green-100'
                                  : payment.type === 'BONUS'
                                    ? 'bg-blue-100'
                                    : payment.type === 'EXTRA'
                                      ? 'bg-purple-100'
                                      : 'bg-yellow-100'
                                  }`}
                              >
                                {payment.type === 'SALARY' ? (
                                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                                ) : payment.type === 'BONUS' ? (
                                  <BanknotesIcon className="h-5 w-5 text-blue-600" />
                                ) : payment.type === 'EXTRA' ? (
                                  <BanknotesIcon className="h-5 w-5 text-purple-600" />
                                ) : (
                                  <BanknotesIcon className="h-5 w-5 text-yellow-600" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge
                                    className={
                                      payment.type === 'SALARY'
                                        ? 'bg-green-100 text-green-800'
                                        : payment.type === 'BONUS'
                                          ? 'bg-blue-100 text-blue-800'
                                          : payment.type === 'EXTRA'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }
                                  >
                                    {payment.type === 'SALARY'
                                      ? 'Зарплата'
                                      : payment.type === 'BONUS'
                                        ? 'Премия'
                                        : payment.type === 'EXTRA'
                                          ? 'Доплата'
                                          : 'Аванс'}
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    {formatRussian(payment.date) ||
                                      'Неизвестная дата'}
                                  </span>
                                  {payment.createdAt && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      <span>создано: </span>
                                      <span>
                                        {formatRussian(payment.createdAt) ||
                                          'Неизвестная дата'}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900">
                                  {payment.description}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                +{formatCurrency(payment.amount, (payment.currency as CurrencyType) || 'RUB')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Итого по выплатам */}
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mt-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-lg font-semibold text-green-800">
                            {`Итого ${isDebtsView ? 'получено' : 'выплачено'}:`}
                          </h5>
                          <span className="text-2xl font-bold text-green-700">
                            {formatCurrency(displayValues.actualTotalPaid, displayCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        История пуста
                      </h3>
                      <p className="text-gray-600">
                        Выплат по этой работе пока не было
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Кнопки создания выплаты */}
            {!isDebtsView && !isUserCalculation && (
              <div className="flex justify-center">
                {displayValues.remainingDebt > 0 ? (
                  <Button
                    onClick={() => {
                      onCreatePayment(
                        calculation.userId,
                        calculation.workId,
                        displayValues.remainingDebt,
                        calculation.userName || 'Пользователь',
                        calculation.workName || 'Работа',
                        calculationDate
                      );
                    }}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <BanknotesIcon className="h-5 w-5 mr-2" />
                    Выплатить зарплату (
                    {formatCurrency(displayValues.remainingDebt, displayCurrency)})
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const ev = new CustomEvent('close-period', {
                        detail: {
                          userId: calculation.userId,
                          workId: calculation.workId,
                          calculationDate,
                        },
                      });
                      window.dispatchEvent(ev);
                    }}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Закрыть период
                  </Button>
                )}
              </div>
            )}

            {/* Общий расчёт по пользователю: мультиидействие */}
            {!isDebtsView && isUserCalculation && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-50 rounded-lg p-4 text-center w-full">
                  <p className="text-blue-700 font-medium">
                    Это общий расчет по всем работам пользователя. Можно
                    выполнить мульти-выплату/закрытие периодов одним действием.
                  </p>
                </div>
                {onBulkPayAllWorks && (
                  <Button
                    onClick={onBulkPayAllWorks}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <BanknotesIcon className="h-5 w-5 mr-2" /> Выплатить/закрыть
                    по всем работам
                  </Button>
                )}
              </div>
            )}

            {isDebtsView && (
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-blue-700 font-medium">
                  💡 Это ваша задолженность. Для получения выплаты обратитесь к
                  ответственному за работу.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

