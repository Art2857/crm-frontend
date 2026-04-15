'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PaymentConfirmModal from './PaymentConfirmModal';
import { DetailedCalculation } from '../../types/payments';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import { formatDateToISO } from '../../utils/date';
import {
  CalculationCurrencyHeader,
  CalculationDateInfo,
  CalculationPeriodsList,
  CalculationSummaryCards,
  CalculationTotalFooter,
  useCalculationDisplayCurrency,
  useCalculationPeriodHelpers,
} from './calculationModalShared';

interface ManagementCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: DetailedCalculation | null;
  calculationDate: string;
  isUserCalculation?: boolean;
  showPaymentHistory?: boolean;
  paymentDate?: string;
  initialCurrency?: CurrencyType;
  onCreatePayment: (
    userId: string,
    workId: string,
    amount: number,
    userName: string,
    workName: string,
    calculationDate?: string,
  ) => void;
  onClosePeriod: (payload: {
    userId: string;
    workId: string;
    calculationDate: string;
  }) => Promise<void> | void;
  onBulkPayAllWorks?: () => void;
}

export default function ManagementCalculationModal({
  isOpen,
  onClose,
  calculation,
  calculationDate,
  isUserCalculation = false,
  showPaymentHistory = true,
  paymentDate,
  initialCurrency,
  onCreatePayment,
  onClosePeriod,
  onBulkPayAllWorks,
}: ManagementCalculationModalProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const { formatRussian } = useCalculationPeriodHelpers(calculation);
  const { displayCurrency, setDisplayCurrency, isLoadingRate, rate, displayValues, convert } =
    useCalculationDisplayCurrency(calculation, initialCurrency);

  const confirmModalWorkNames = useMemo(() => {
    if (!calculation) {
      return [];
    }

    if (!isUserCalculation && calculation.workName) {
      return [calculation.workName];
    }

    const names = new Set<string>();
    for (const period of calculation.periods || []) {
      for (const group of period.workGroups || []) {
        if (group.workName) {
          names.add(group.workName);
        }
      }
      for (const duty of period.duties || []) {
        if (duty.workName) {
          names.add(duty.workName);
        }
      }
    }

    if (names.size === 0 && calculation.workName) {
      names.add(calculation.workName);
    }

    return Array.from(names);
  }, [calculation, isUserCalculation]);

  const confirmModalPeriods = useMemo(() => {
    if (!calculation) {
      return [];
    }

    return calculation.periods.map((period) => ({
      startDate: period.startDate,
      endDate: period.endDate,
      days: period.days,
    }));
  }, [calculation]);

  const isDateBeforeClosureDate = useMemo(() => {
    if (!calculation || !calculationDate || !calculation.lastClosureDate) {
      return false;
    }

    return formatDateToISO(calculationDate) < formatDateToISO(calculation.lastClosureDate);
  }, [calculation, calculationDate]);

  const isDutyCompactView = useMemo(() => {
    if (!calculation || isUserCalculation) {
      return false;
    }

    return calculation.periods[0]?.duties.length === 1 && !showPaymentHistory;
  }, [calculation, isUserCalculation, showPaymentHistory]);

  const openConfirmModal = useCallback((action: () => void) => {
    setConfirmAction(() => action);
    setConfirmModalOpen(true);
  }, []);

  if (!calculation) {
    return null;
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div
          className={`p-6 max-w-full mx-auto max-h-[95vh] overflow-y-auto ${
            isDutyCompactView ? 'w-[70vw]' : 'w-[90vw]'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {isUserCalculation
                  ? `Детальный расчет по пользователю: ${calculation.userName || 'Пользователь'}`
                  : isDutyCompactView
                    ? `Детальный расчет: ${calculation.userName || 'Пользователь'} · ${
                        calculation.workName || 'Работа'
                      } · ${calculation.periods[0]?.duties[0]?.dutyName || 'Обязанность'}`
                    : `Детальный расчет по работе: ${calculation.userName || 'Пользователь'} · ${
                        calculation.workName || 'Работа'
                      }`}
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

          {isDutyCompactView ? (
            <div className="space-y-4">
              <CalculationSummaryCards
                displayValues={displayValues}
                displayCurrency={displayCurrency}
                isDebtsView={false}
              />
              <CalculationDateInfo
                lastClosureDate={calculation.lastClosureDate}
                calculationDate={calculationDate}
              />
              <h4 className="text-lg font-medium text-gray-900">
                Разбивка по периодам изменения обязанности:
              </h4>
              <CalculationPeriodsList
                calculation={calculation}
                displayCurrency={displayCurrency}
                convert={convert}
                rate={rate}
                groupedByWork
                maxHeightClass="max-h-[510px]"
              />
              <CalculationTotalFooter
                totalAccrued={displayValues.totalAccrued}
                displayCurrency={displayCurrency}
              />
            </div>
          ) : (
            <>
              <CalculationSummaryCards
                displayValues={displayValues}
                displayCurrency={displayCurrency}
                isDebtsView={false}
              />

              <div
                className={`grid gap-8 mb-6 ${
                  showPaymentHistory ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                }`}
              >
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
                    groupedByWork
                  />
                  <CalculationTotalFooter
                    totalAccrued={displayValues.totalAccrued}
                    displayCurrency={displayCurrency}
                  />
                </div>

                {showPaymentHistory && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">История выплат:</h4>
                    <p className="text-sm text-gray-600">
                      (учитываются для долга: зарплата и аванс)
                    </p>
                    {calculation.paymentHistory.length > 0 ? (
                      <div className="space-y-3">
                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                          {calculation.paymentHistory.map((payment, paymentIndex) => (
                            <div
                              key={`payment-${payment.id}-${paymentIndex}`}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm text-gray-600">
                                    {formatRussian(payment.date) || 'Неизвестная дата'}
                                  </span>
                                  {payment.createdAt && (
                                    <span className="text-xs text-gray-500">
                                      создано:{' '}
                                      {formatRussian(payment.createdAt) || 'Неизвестная дата'}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900">{payment.description}</p>
                                {payment.workName &&
                                  (isUserCalculation ||
                                    !calculation.workName ||
                                    payment.workName !== calculation.workName) && (
                                    <p className="mt-1 text-sm text-blue-700">
                                      Работа: {payment.workName}
                                    </p>
                                  )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">
                                  +
                                  {formatCurrency(
                                    payment.amount,
                                    (payment.currency as CurrencyType) || 'RUB',
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 mt-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-lg font-semibold text-green-800">
                              Итого выплачено:
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">История пуста</h3>
                        <p className="text-gray-600">Выплат по этой работе пока не было</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isUserCalculation && (
                <div className="flex flex-col items-center gap-3">
                  {isDateBeforeClosureDate && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      <span>
                        На выбранную дату ({formatRussian(calculationDate)}) новых начислений нет:
                        текущая дата закрытия периода — {formatRussian(calculation.lastClosureDate)}
                        . Выберите дату не раньше этой границы.
                      </span>
                    </div>
                  )}
                  {calculation.remainingDebt > 0 ? (
                    <Button
                      disabled={isDateBeforeClosureDate}
                      onClick={() =>
                        onCreatePayment(
                          calculation.userId,
                          calculation.workId,
                          calculation.remainingDebt,
                          calculation.userName || 'Пользователь',
                          calculation.workName || 'Работа',
                          calculationDate,
                        )
                      }
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BanknotesIcon className="h-5 w-5 mr-2" />
                      Выплатить зарплату ({formatCurrency(calculation.remainingDebt, 'RUB')})
                    </Button>
                  ) : (
                    <Button
                      disabled={isDateBeforeClosureDate}
                      onClick={() =>
                        openConfirmModal(() => {
                          void onClosePeriod({
                            userId: calculation.userId,
                            workId: calculation.workId,
                            calculationDate,
                          });
                        })
                      }
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Закрыть период
                    </Button>
                  )}
                </div>
              )}

              {isUserCalculation && (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-blue-50 rounded-lg p-4 text-center w-full">
                    <p className="text-blue-700 font-medium">
                      Это общий расчет по всем работам пользователя. Можно выполнить
                      мульти-выплату/закрытие периодов одним действием.
                    </p>
                  </div>
                  {isDateBeforeClosureDate && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 w-full">
                      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                      <span>
                        На выбранную дату ({formatRussian(calculationDate)}) новых начислений нет:
                        текущая дата закрытия периода — {formatRussian(calculation.lastClosureDate)}
                        . Выберите дату не раньше этой границы.
                      </span>
                    </div>
                  )}
                  {onBulkPayAllWorks && (
                    <Button
                      disabled={isDateBeforeClosureDate}
                      onClick={() => openConfirmModal(onBulkPayAllWorks)}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BanknotesIcon className="h-5 w-5 mr-2" /> Выплатить/закрыть по всем работам
                    </Button>
                  )}
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
            if (confirmAction) {
              confirmAction();
            }
            setConfirmAction(null);
            setConfirmModalOpen(false);
          }}
          amount={displayValues.remainingDebt}
          currency={displayCurrency}
          periods={confirmModalPeriods}
          workNames={confirmModalWorkNames}
          calculationDate={calculationDate}
          paymentDate={paymentDate}
          isBulk={isUserCalculation}
        />
      )}
    </>
  );
}
