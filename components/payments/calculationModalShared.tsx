'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Badge from '../ui/Badge';
import CurrencySwitch from '../ui/CurrencySwitch';
import { useDateManager } from '../../hooks/useDateManager';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';
import { DATE_RANGE_SEPARATOR, formatDateToISO, shiftDateISOByDays } from '../../utils/date';
import { buildDutyFormulaView } from '../../utils/paymentsFormula';
import { formatCurrency, CurrencyType } from '../../utils/payments';
import { DetailedCalculation, PeriodCalculation, WorkDutiesGroup } from '../../types/payments';

export interface CalculationDisplayValues {
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  actualTotalPaid: number;
}

export function useCalculationDisplayCurrency(
  calculation: DetailedCalculation | null,
  initialCurrency?: CurrencyType,
) {
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>(initialCurrency ?? 'RUB');
  const { convert, isLoading: isLoadingRate, rate } = useCurrencyConversion();

  useEffect(() => {
    if (initialCurrency === 'RUB' || initialCurrency === 'USD') {
      setDisplayCurrency(initialCurrency);
    }
  }, [initialCurrency, calculation?.userId, calculation?.workId]);

  const displayValues = useMemo<CalculationDisplayValues>(() => {
    if (!calculation) {
      return {
        totalAccrued: 0,
        totalPaid: 0,
        remainingDebt: 0,
        actualTotalPaid: 0,
      };
    }

    const totalAccrued = convert(calculation.totalAccrued, 'RUB', displayCurrency);
    const totalPaid = convert(calculation.totalPaid, 'RUB', displayCurrency);
    const remainingDebt = convert(calculation.remainingDebt, 'RUB', displayCurrency);

    return {
      totalAccrued: Math.round(totalAccrued),
      totalPaid: Math.round(totalPaid),
      remainingDebt: Math.round(remainingDebt),
      actualTotalPaid: Math.round(totalPaid),
    };
  }, [calculation, convert, displayCurrency]);

  return {
    convert,
    displayCurrency,
    setDisplayCurrency,
    isLoadingRate,
    rate,
    displayValues,
  };
}

export function useCalculationPeriodHelpers(calculation: DetailedCalculation | null) {
  const { formatRussian } = useDateManager();

  const renderDutyFormula = useCallback(
    (
      monthlyAmount: number,
      calculatedAmount: number,
      dutyCurrency: CurrencyType,
      days: number,
      monthDays: number,
      displayCurrency: CurrencyType,
      rate: number | null,
    ) => {
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
    [],
  );

  const getGroupedDutiesForPeriod = useCallback(
    (period: PeriodCalculation): WorkDutiesGroup[] => {
      if (Array.isArray(period.workGroups) && period.workGroups.length > 0) {
        return period.workGroups;
      }

      const fallbackWorkName = calculation?.workName || 'Работа';
      const grouped = new Map<string, WorkDutiesGroup>();

      for (const duty of period.duties || []) {
        const workId = duty.workId || '__unknown_work__';
        const workName = duty.workName || fallbackWorkName;

        if (!grouped.has(workId)) {
          grouped.set(workId, {
            workId,
            workName,
            duties: [],
          });
        }

        grouped.get(workId)?.duties.push({
          dutyId: duty.dutyId,
          dutyName: duty.dutyName,
          monthlyAmount: duty.monthlyAmount,
          calculatedAmount: duty.calculatedAmount,
          currency: duty.currency,
        });
      }

      return Array.from(grouped.values());
    },
    [calculation?.workName],
  );

  const getDisplayPeriodEnd = useCallback((startDate: string, endDate: string) => {
    return formatDateToISO(startDate) < formatDateToISO(endDate)
      ? shiftDateISOByDays(endDate, -1)
      : formatDateToISO(endDate);
  }, []);

  const formatPeriodTitle = useCallback(
    (period: PeriodCalculation, index: number) => {
      return (
        <>
          Период {index + 1}: {formatRussian(period.startDate) || 'Неизвестная дата'}
          {DATE_RANGE_SEPARATOR}
          {formatRussian(getDisplayPeriodEnd(period.startDate, period.endDate)) ||
            'Неизвестная дата'}
        </>
      );
    },
    [formatRussian, getDisplayPeriodEnd],
  );

  return {
    formatRussian,
    renderDutyFormula,
    getGroupedDutiesForPeriod,
    getDisplayPeriodEnd,
    formatPeriodTitle,
  };
}

interface CalculationCurrencyHeaderProps {
  displayCurrency: CurrencyType;
  onChange: (value: CurrencyType) => void;
  isLoadingRate: boolean;
  rate: number | null;
  onClose: () => void;
}

export function CalculationCurrencyHeader({
  displayCurrency,
  onChange,
  isLoadingRate,
  rate,
  onClose,
}: CalculationCurrencyHeaderProps) {
  return (
    <div className="flex items-center gap-3 relative">
      <div className="relative">
        <CurrencySwitch value={displayCurrency} onChange={onChange} size="sm" />
        <div className="absolute right-0 top-full mt-1 text-xs leading-none text-gray-500 whitespace-nowrap bg-white px-1 rounded pointer-events-none z-10 antialiased">
          {isLoadingRate
            ? 'Курс: загрузка...'
            : rate
              ? `Курс: 1 USD = ${formatCurrency(rate, 'RUB')}`
              : 'Курс недоступен'}
        </div>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

interface CalculationSummaryCardsProps {
  displayValues: CalculationDisplayValues;
  displayCurrency: CurrencyType;
  isDebtsView: boolean;
}

export function CalculationSummaryCards({
  displayValues,
  displayCurrency,
  isDebtsView,
}: CalculationSummaryCardsProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-blue-600 font-medium">Всего начислено</p>
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
          <p
            className={`text-sm font-medium ${
              displayValues.remainingDebt > 0
                ? 'text-red-600'
                : displayValues.remainingDebt < 0
                  ? 'text-emerald-600'
                  : 'text-gray-600'
            }`}
          >
            {isDebtsView ? 'Мне должны' : 'Остаток'}
          </p>
          <p
            className={`text-2xl font-bold ${
              displayValues.remainingDebt > 0
                ? 'text-red-900'
                : displayValues.remainingDebt < 0
                  ? 'text-emerald-900'
                  : 'text-gray-900'
            }`}
          >
            {formatCurrency(displayValues.remainingDebt, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface CalculationDateInfoProps {
  lastClosureDate: string | null;
  calculationDate?: string;
  compact?: boolean;
}

export function CalculationDateInfo({
  lastClosureDate,
  calculationDate,
  compact = false,
}: CalculationDateInfoProps) {
  const { formatRussian } = useDateManager();

  if (!lastClosureDate && !calculationDate) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex justify-center gap-6 text-sm">
          {lastClosureDate && (
            <div className="text-center">
              <span className="text-blue-600 font-medium">Дата закрытия периода: </span>
              <span className="text-blue-800 font-semibold">
                {formatRussian(lastClosureDate) || 'Неизвестная дата'}
              </span>
            </div>
          )}
          {calculationDate && (
            <div className="text-center">
              <span className="text-green-600 font-medium">Расчет до (дата не включается): </span>
              <span className="text-green-800 font-semibold">
                {formatRussian(calculationDate) || 'Неизвестная дата'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {lastClosureDate && (
        <div className="bg-blue-50 rounded-md px-3 py-2 flex-1 text-center border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Дата закрытия периода</p>
          <p className="text-sm font-semibold text-blue-800">
            {formatRussian(lastClosureDate) || 'Неизвестная дата'}
          </p>
        </div>
      )}

      {calculationDate && (
        <div className="bg-green-50 rounded-md px-3 py-2 flex-1 text-center border border-green-200">
          <p className="text-xs text-green-600 font-medium">Расчет до (дата не включается)</p>
          <p className="text-sm font-semibold text-green-800">
            {formatRussian(calculationDate) || 'Неизвестная дата'}
          </p>
        </div>
      )}
    </div>
  );
}

interface CalculationPeriodsListProps {
  calculation: DetailedCalculation;
  displayCurrency: CurrencyType;
  convert: (amount: number, from: CurrencyType, to: CurrencyType) => number;
  rate: number | null;
  groupedByWork: boolean;
  maxHeightClass?: string;
}

export function CalculationPeriodsList({
  calculation,
  displayCurrency,
  convert,
  rate,
  groupedByWork,
  maxHeightClass = 'max-h-[410px]',
}: CalculationPeriodsListProps) {
  const { renderDutyFormula, getGroupedDutiesForPeriod, formatPeriodTitle } =
    useCalculationPeriodHelpers(calculation);

  return (
    <div className={`space-y-4 overflow-y-auto pr-2 ${maxHeightClass}`}>
      {calculation.periods.map((period, index) => (
        <div
          key={`period-detail-${period.startDate}-${period.endDate}-${index}`}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-gray-900">{formatPeriodTitle(period, index)}</h5>
            <Badge className="bg-blue-100 text-blue-800">
              {period.days || 0} из {period.monthDays || 0} рабочих дней
            </Badge>
          </div>

          <div className="space-y-2">
            {groupedByWork
              ? getGroupedDutiesForPeriod(period).map((workGroup, wgIndex) => (
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
                          <span className="text-gray-700">{duty.dutyName}:</span>
                          {renderDutyFormula(
                            duty.monthlyAmount as number,
                            duty.calculatedAmount as number,
                            dutyCurrency,
                            period.days,
                            period.monthDays,
                            displayCurrency,
                            rate,
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              : period.duties.map((duty, dutyIndex) => {
                  const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';

                  return (
                    <div
                      key={`duty-alt-${duty.dutyId}-${index}-${dutyIndex}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {duty.workName ? (
                          <>
                            <span className="text-gray-500 mr-1">{duty.workName}:</span>
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
                        period.monthDays,
                        displayCurrency,
                        rate,
                      )}
                    </div>
                  );
                })}
            <hr className="border-gray-300" />
            <div className="flex items-center justify-between font-medium">
              <span>Итого за период:</span>
              <span className="text-blue-600">
                {formatCurrency(
                  (groupedByWork
                    ? getGroupedDutiesForPeriod(period).flatMap((group) => group.duties)
                    : period.duties
                  ).reduce((sum, duty) => {
                    const dutyCurrency = (duty.currency as CurrencyType) || 'RUB';
                    const amount = Number(duty.calculatedAmount) || 0;

                    return sum + convert(amount, dutyCurrency, displayCurrency);
                  }, 0),
                  displayCurrency,
                )}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CalculationTotalFooterProps {
  totalAccrued: number;
  displayCurrency: CurrencyType;
}

export function CalculationTotalFooter({
  totalAccrued,
  displayCurrency,
}: CalculationTotalFooterProps) {
  return (
    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
      <div className="flex items-center justify-between">
        <h5 className="text-lg font-semibold text-green-800">Общая сумма за все периоды:</h5>
        <span className="text-2xl font-bold text-green-700">
          {formatCurrency(totalAccrued, displayCurrency)}
        </span>
      </div>
    </div>
  );
}
