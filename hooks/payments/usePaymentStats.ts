import { useMemo } from 'react';
import { MyDebt } from '../../services/analytics';
import { ResponsibleUser, DutyDetail } from '../../types/payments';
import {
  useCurrencyConversion,
  DisplayCurrency,
} from '../useCurrencyConversion';

/**
 * Рассчитывает сумму долга по обязанностям с конвертацией в целевую валюту
 */
function calculateDebtWithConversion(
  duties: DutyDetail[],
  targetCurrency: DisplayCurrency,
  convert: (amount: number, from: 'RUB' | 'USD', to: 'RUB' | 'USD') => number
): number {
  return duties.reduce((sum, duty) => {
    const dutyCurrency = (duty.currency as 'RUB' | 'USD') || 'RUB';
    const debtInTargetCurrency = convert(
      duty.debt,
      dutyCurrency,
      targetCurrency
    );
    return sum + debtInTargetCurrency;
  }, 0);
}

export function usePaymentStats(
  responsibleUsers: ResponsibleUser[],
  myDebts: MyDebt[],
  displayCurrency: DisplayCurrency = 'RUB'
) {
  const { convert, rate, isLoading } = useCurrencyConversion();

  // Сумма к выплате ответственным с учётом валюты обязанностей
  const totalResponsibleDebt = useMemo(() => {
    if (!Array.isArray(responsibleUsers)) return 0;

    return responsibleUsers.reduce((sum, user) => {
      return sum + convert(user.remainingDebt || 0, 'RUB', displayCurrency);
    }, 0);
  }, [responsibleUsers, displayCurrency, convert]);

  // Сумма моих долгов с учётом валюты
  const totalMyDebt = useMemo(() => {
    if (!Array.isArray(myDebts)) return 0;

    return myDebts.reduce((sum, debt) => {
      const debtAmount = debt.duties.reduce((dutySum, duty) => {
        const dutyCurrency = (duty.currency as 'RUB' | 'USD') || 'RUB';
        const debtInTargetCurrency = convert(
          duty.totalDebt,
          dutyCurrency,
          displayCurrency
        );
        return dutySum + debtInTargetCurrency;
      }, 0);
      return sum + debtAmount;
    }, 0);
  }, [myDebts, displayCurrency, convert]);

  // Количество «просроченных» — количество работ с индикатором «требует внимания»
  const overdueCount = useMemo(() => {
    if (!Array.isArray(responsibleUsers)) return 0;
    return responsibleUsers.reduce((userOverdueCount, user) => {
      const userWorksOverdueCount = user.works.reduce(
        (userWorkOverdueCount, work) => {
          return userWorkOverdueCount + Number(work.requiresAttention);
        },
        0
      );
      return userOverdueCount + userWorksOverdueCount;
    }, 0);
  }, [responsibleUsers]);

  return {
    totalResponsibleDebt,
    totalMyDebt,
    overdueCount,
    exchangeRate: rate,
    isLoadingRate: isLoading,
  };
}
