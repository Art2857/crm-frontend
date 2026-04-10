'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import { buildDutyFormulaView } from '../../utils/paymentsFormula';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { DetailedCalculation } from '../../types/payments';
import { useDateManager } from '../../hooks/useDateManager';
import { formatDateToISO } from '../../utils/date';
import CurrencySwitch from '../ui/CurrencySwitch';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';
import PaymentConfirmModal from './PaymentConfirmModal';

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
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>('RUB');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Sync initial currency when provided/opened
  useEffect(() => {
    if (
      isOpen &&
      initialCurrency &&
      (initialCurrency === 'USD' || initialCurrency === 'RUB')
    ) {
      setDisplayCurrency(initialCurrency);
    }
  }, [isOpen, initialCurrency]);

  // Используем хук для конвертации
  const { convert, isLoading: isLoadingRate, rate } = useCurrencyConversion();

  const renderDutyFormula = useCallback(
    (monthlyAmount, calculatedAmount, dutyCurrency, days, monthDays) => {
      const view = buildDutyFormulaView({
        monthlyAmount,
        calculatedAmount,
        dutyCurrency,
        days,
        monthDays,
        displayCurrency,
        rate,
      });

      return (
        <span className="font-mono">
          {view.left}
          {view.op ? ` ${view.op} ${view.rateText} ` : ' '}= {view.right}
        </span>
      );
    },
    [displayCurrency, rate]
  );

  // Конвертированные значения для отображения
  const displayValues = useMemo(() => {
    if (!calculation) {
      return {
        totalAccrued: 0,
        totalPaid: 0,
        remainingDebt: 0,
        actualTotalPaid: 0,
      };
    }

    const totalAccrued = convert(
      calculation.totalAccrued,
      'RUB',
      displayCurrency
    );
    const totalPaid = convert(calculation.totalPaid, 'RUB', displayCurrency);
    const remainingDebt = convert(
      calculation.remainingDebt,
      'RUB',
      displayCurrency
    );

    return {
      totalAccrued: Math.round(totalAccrued),
      totalPaid: Math.round(totalPaid),
      remainingDebt: Math.round(remainingDebt),
      actualTotalPaid: Math.round(totalPaid),
    };
  }, [calculation, displayCurrency, convert]);

  const confirmModalWorkNames = useMemo(() => {
    if (!calculation) return [];
    if (!isUserCalculation && calculation.workName) {
      return [calculation.workName];
    }
    const names = new Set<string>();
    for (const period of calculation.periods || []) {
      if (period.workGroups) {
        for (const wg of period.workGroups) {
          if (wg.workName) names.add(wg.workName);
        }
      }
      for (const duty of period.duties || []) {
        if (duty.workName) names.add(duty.workName);
      }
    }
    if (names.size === 0 && calculation.workName) {
      names.add(calculation.workName);
    }
    return Array.from(names);
  }, [calculation, isUserCalculation]);

  const confirmModalPeriods = useMemo(() => {
    if (!calculation) return [];
    return calculation.periods.map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate,
    }));
  }, [calculation]);

  const openConfirmModal = useCallback((action: () => void) => {
    setConfirmAction(() => action);
    setConfirmModalOpen(true);
  }, []);

  const isDateBeforeClosure = useMemo(() => {
    if (!calculation || !calculationDate) return false;
    const closure = calculation.lastClosureDate;
    if (!closure) return false;
    return formatDateToISO(calculationDate) <= formatDateToISO(closure);
  }, [calculation, calculationDate]);

  if (!calculation) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div
          className={`p-6 max-w-full mx-auto max-h-[95vh] overflow-y-auto ${
            calculation?.periods[0]?.duties.length === 1 && !showPaymentHistory
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
            <div className="flex items-center gap-3 relative">
              <div className="relative">
                <CurrencySwitch
                  value={displayCurrency}
                  onChange={setDisplayCurrency}
                  size="sm"
                />
                <div className="absolute right-0 top-full mt-1 text-xs leading-none text-gray-500 whitespace-nowrap bg-white px-1 rounded pointer-events-none z-10 antialiased">
                  {isLoadingRate
                    ? 'Курс: загрузка...'
                    : rate
                      ? `Курс: 1 USD = ${formatCurrency(rate, 'RUB')}`
                      : 'Курс недоступен'}
                </div>
              </div>
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
                      {formatCurrency(
                        displayValues.totalAccrued,
                        displayCurrency
                      )}
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
                      {formatCurrency(
                        displayValues.remainingDebt,
                        displayCurrency
                      )}
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
                <div className="space-y-4 max-h-[510px] overflow-y-auto pr-2">
                  {calculation.periods.map((period, index) => (
                    <div
                      key={`period-${period.startDate}-${period.endDate}-${index}`}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900">
                          Период {index + 1}:{' '}
                          {formatRussian(period.startDate) ||
                            'Неизвестная дата'}{' '}
                          -{' '}
                          {formatRussian(period.endDate) || 'Неизвестная дата'}
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
                              <div
                                key={`workgroup-${workGroup.workId}-${index}-${wgIndex}`}
                                className="space-y-1"
                              >
                                <div className="font-medium text-gray-800 text-sm mb-1">
                                  {workGroup.workName}
                                </div>
                                {workGroup.duties.map((duty, dutyIndex) => {
                                  const dutyCurrency =
                                    (duty.currency as CurrencyType) || 'RUB';
                                  return (
                                    <div
                                      key={`duty-${duty.dutyId}-${workGroup.workId}-${index}-${dutyIndex}`}
                                      className="flex items-center justify-between text-sm ml-4"
                                    >
                                      <span className="text-gray-700">
                                        {duty.dutyName}:
                                      </span>
                                      {renderDutyFormula(
                                        duty.monthlyAmount as number,
                                        duty.calculatedAmount as number,
                                        dutyCurrency,
                                        period.days,
                                        period.monthDays
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          : // Если нет группировки - отображаем как раньше
                            period.duties.map((duty, dutyIndex) => {
                              const dutyCurrency =
                                (duty.currency as CurrencyType) || 'RUB';
                              return (
                                <div
                                  key={`duty-${duty.dutyId}-${index}-${dutyIndex}`}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {duty.dutyName}:
                                  </span>
                                  {renderDutyFormula(
                                    duty.monthlyAmount as number,
                                    duty.calculatedAmount as number,
                                    dutyCurrency,
                                    period.days,
                                    period.monthDays
                                  )}
                                </div>
                              );
                            })}
                        <hr className="border-gray-300" />
                        <div className="flex items-center justify-between font-medium">
                          <span>Итого за период:</span>
                          <span className="text-blue-600">
                            {formatCurrency(
                              Array.isArray(period.workGroups) &&
                                period.workGroups.length > 0
                                ? period.workGroups.reduce(
                                    (sum, wg) =>
                                      sum +
                                      wg.duties.reduce((s, duty) => {
                                        const dutyCurrency =
                                          (duty.currency as CurrencyType) ||
                                          'RUB';
                                        const amt =
                                          Number(duty.calculatedAmount) || 0;
                                        return (
                                          s +
                                          convert(
                                            amt,
                                            dutyCurrency,
                                            displayCurrency
                                          )
                                        );
                                      }, 0),
                                    0
                                  )
                                : (Array.isArray(period.duties)
                                    ? period.duties
                                    : []
                                  ).reduce((s, duty: any) => {
                                    const dutyCurrency =
                                      (duty.currency as CurrencyType) || 'RUB';
                                    const amt =
                                      Number(duty.calculatedAmount) || 0;
                                    return (
                                      s +
                                      convert(
                                        amt,
                                        dutyCurrency,
                                        displayCurrency
                                      )
                                    );
                                  }, 0),
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
                    {formatCurrency(
                      displayValues.totalAccrued,
                      displayCurrency
                    )}
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
                      {formatCurrency(
                        displayValues.totalAccrued,
                        displayCurrency
                      )}
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
                      {formatCurrency(
                        displayValues.remainingDebt,
                        displayCurrency
                      )}
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
                            {formatRussian(calculationDate) ||
                              'Неизвестная дата'}
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
                        <div
                          key={`period-detail-${period.startDate}-${period.endDate}-${index}`}
                          className="bg-gray-50 rounded-lg p-4"
                        >
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
                                      const dutyCurrency =
                                        (duty.currency as CurrencyType) ||
                                        'RUB';
                                      return (
                                        <div
                                          key={`duty-detail-${duty.dutyId}-${workGroup.workId}-${index}-${dutyIndex}`}
                                          className="flex items-center justify-between text-sm ml-4"
                                        >
                                          <span className="text-gray-700">
                                            {duty.dutyName}:
                                          </span>
                                          {renderDutyFormula(
                                            duty.monthlyAmount as number,
                                            duty.calculatedAmount as number,
                                            dutyCurrency,
                                            period.days,
                                            period.monthDays
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))
                              : // Если нет группировки - отображаем все обязанности
                                period.duties.map((duty, dutyIndex) => {
                                  const dutyCurrency =
                                    (duty.currency as CurrencyType) || 'RUB';
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
                                      {renderDutyFormula(
                                        duty.monthlyAmount as number,
                                        duty.calculatedAmount as number,
                                        dutyCurrency,
                                        period.days,
                                        period.monthDays
                                      )}
                                    </div>
                                  );
                                })}
                            <hr className="border-gray-300" />
                            <div className="flex items-center justify-between font-medium">
                              <span>Итого за период:</span>
                              <span className="text-blue-600">
                                {formatCurrency(
                                  Array.isArray(period.workGroups) &&
                                    period.workGroups.length > 0
                                    ? period.workGroups.reduce(
                                        (sum, wg) =>
                                          sum +
                                          wg.duties.reduce((s, duty) => {
                                            const dutyCurrency =
                                              (duty.currency as CurrencyType) ||
                                              'RUB';
                                            const amt =
                                              Number(duty.calculatedAmount) ||
                                              0;
                                            return (
                                              s +
                                              convert(
                                                amt,
                                                dutyCurrency,
                                                displayCurrency
                                              )
                                            );
                                          }, 0),
                                        0
                                      )
                                    : (Array.isArray(period.duties)
                                        ? period.duties
                                        : []
                                      ).reduce((s, duty: any) => {
                                        const dutyCurrency =
                                          (duty.currency as CurrencyType) ||
                                          'RUB';
                                        const amt =
                                          Number(duty.calculatedAmount) || 0;
                                        return (
                                          s +
                                          convert(
                                            amt,
                                            dutyCurrency,
                                            displayCurrency
                                          )
                                        );
                                      }, 0),
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
                        {formatCurrency(
                          displayValues.totalAccrued,
                          displayCurrency
                        )}
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
                    <p className="text-sm text-gray-600">
                      (учитываются для долга: зарплата и аванс)
                    </p>
                    {calculation.paymentHistory.length > 0 ? (
                      <div className="space-y-3">
                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                          {calculation.paymentHistory.map(
                            (payment, paymentIndex) => (
                              <div
                                key={`payment-${payment.id}-${paymentIndex}`}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center space-x-4">
                                  <div
                                    className={`p-2 rounded-full ${
                                      payment.type === 'SALARY'
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
                                    {payment.workName &&
                                      (isUserCalculation ||
                                        !calculation.workName ||
                                        payment.workName !==
                                          calculation.workName) && (
                                        <p className="mt-1 text-sm text-blue-700">
                                          Работа: {payment.workName}
                                        </p>
                                      )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">
                                    +
                                    {formatCurrency(
                                      payment.amount,
                                      (payment.currency as CurrencyType) ||
                                        'RUB'
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                        {/* Итого по выплатам */}
                        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mt-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-lg font-semibold text-green-800">
                              {`Итого ${isDebtsView ? 'получено' : 'выплачено'}:`}
                            </h5>
                            <span className="text-2xl font-bold text-green-700">
                              {formatCurrency(
                                displayValues.actualTotalPaid,
                                displayCurrency
                              )}
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
                <div className="flex flex-col items-center gap-3">
                  {isDateBeforeClosure && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      <span>
                        На выбранную дату ({formatRussian(calculationDate)})
                        новых начислений уже нет, потому что период закрыт по{' '}
                        {formatRussian(calculation.lastClosureDate)}. Выберите
                        более позднюю дату.
                      </span>
                    </div>
                  )}
                  {calculation.remainingDebt > 0 ? (
                    <Button
                      disabled={isDateBeforeClosure}
                      onClick={() => {
                        onCreatePayment(
                          calculation.userId,
                          calculation.workId,
                          calculation.remainingDebt,
                          calculation.userName || 'Пользователь',
                          calculation.workName || 'Работа',
                          calculationDate
                        );
                      }}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BanknotesIcon className="h-5 w-5 mr-2" />
                      <>
                        Выплатить зарплату (
                        {formatCurrency(calculation.remainingDebt, 'RUB')})
                      </>
                    </Button>
                  ) : (
                    <Button
                      disabled={isDateBeforeClosure}
                      onClick={() => {
                        openConfirmModal(() => {
                          const ev = new CustomEvent('close-period', {
                            detail: {
                              userId: calculation.userId,
                              workId: calculation.workId,
                              calculationDate,
                            },
                          });
                          window.dispatchEvent(ev);
                        });
                      }}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                      выполнить мульти-выплату/закрытие периодов одним
                      действием.
                    </p>
                  </div>
                  {isDateBeforeClosure && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 w-full">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      <span>
                        На выбранную дату ({formatRussian(calculationDate)})
                        новых начислений уже нет, потому что период закрыт по{' '}
                        {formatRussian(calculation.lastClosureDate)}. Выберите
                        более позднюю дату.
                      </span>
                    </div>
                  )}
                  {onBulkPayAllWorks && (
                    <Button
                      disabled={isDateBeforeClosure}
                      onClick={() => openConfirmModal(onBulkPayAllWorks)}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BanknotesIcon className="h-5 w-5 mr-2" />{' '}
                      Выплатить/закрыть по всем работам
                    </Button>
                  )}
                </div>
              )}

              {isDebtsView && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-blue-700 font-medium">
                    💡 Это ваша задолженность. Для получения выплаты обратитесь
                    к ответственному за работу.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {confirmModalOpen && (
        <PaymentConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setConfirmAction(null);
          }}
          onConfirm={() => {
            if (confirmAction) confirmAction();
            setConfirmAction(null);
          }}
          amount={displayValues.remainingDebt}
          currency={displayCurrency}
          periods={confirmModalPeriods}
          workNames={confirmModalWorkNames}
          calculationDate={calculationDate}
          isBulk={isUserCalculation}
          hasOverpayment={
            displayValues.actualTotalPaid > displayValues.totalAccrued
          }
        />
      )}
    </>
  );
}
