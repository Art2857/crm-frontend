import { useMemo } from 'react';
import { DetailedCalculation } from '../../types/payments';

export function useCalculationView(calculation: DetailedCalculation | null) {
  const totals = useMemo(() => {
    if (!calculation) return { totalPeriodsAmount: 0, totalHistoryAmount: 0 };
    const totalPeriodsAmount = (calculation.periods || []).reduce(
      (s, p) => s + (p.totalAmount || 0),
      0
    );
    const totalHistoryAmount = (calculation.paymentHistory || []).reduce(
      (s, h) => s + (h.amount || 0),
      0
    );
    return { totalPeriodsAmount, totalHistoryAmount };
  }, [calculation]);

  return { totals };
}
