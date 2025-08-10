import { useMemo } from 'react';
import { MyDebt } from '../../services/analytics';
import { ResponsibleUser } from '../../types/payments';

export function usePaymentStats(
  responsibleUsers: ResponsibleUser[],
  myDebts: MyDebt[]
) {
  // Сумма к выплате ответственным: учитываем только положительные остатки
  const totalResponsibleDebt = useMemo(
    () =>
      responsibleUsers.reduce(
        (sum, u) => sum + Math.max(u.remainingDebt ?? u.totalDebt ?? 0, 0),
        0
      ),
    [responsibleUsers]
  );

  const totalMyDebt = useMemo(
    () => myDebts.reduce((sum, d) => sum + (d.totalDebt || 0), 0),
    [myDebts]
  );

  // Количество «просроченных» — количество пользователей с индикатором «требует внимания»
  const overdueCount = useMemo(() => {
    if (!Array.isArray(responsibleUsers)) return 0;
    return responsibleUsers.filter((u) => Boolean(u.requiresAttention)).length;
  }, [responsibleUsers]);

  return { totalResponsibleDebt, totalMyDebt, overdueCount };
}
