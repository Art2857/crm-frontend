import { useMemo } from 'react';
import { MyDebt } from '../../services/analytics';
import { ResponsibleUser } from '../../types/payments';

export function usePaymentStats(
  responsibleUsers: ResponsibleUser[],
  myDebts: MyDebt[]
) {
  const totalResponsibleDebt = useMemo(
    () => responsibleUsers.reduce((sum, u) => sum + (u.totalDebt || 0), 0),
    [responsibleUsers]
  );

  const totalMyDebt = useMemo(
    () => myDebts.reduce((sum, d) => sum + (d.totalDebt || 0), 0),
    [myDebts]
  );

  const overdueCount = useMemo(
    () =>
      (responsibleUsers?.filter((u) => u.isPaymentDue)?.length || 0) +
      (myDebts?.filter((d) => d.isPaymentDue)?.length || 0),
    [responsibleUsers, myDebts]
  );

  return { totalResponsibleDebt, totalMyDebt, overdueCount };
}
