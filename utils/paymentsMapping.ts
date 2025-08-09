import { DutyDetail, ResponsibleUser, WorkDetail } from '../types/payments';

type AnyRecord = Record<string, any>;

export interface UsersWorksClosurePeriodsAnalysisResult {
  users?: Array<{
    userId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    works?: Array<{
      workId: string;
      workName: string;
      salary: number;
      createdAt: string;
      usersClosuresWithPeriods: Array<{
        closure: { userId: string; closureDate: string };
        userPeriods: AnyRecord;
        paymentHistory?: Array<{
          id: string;
          amount: number;
          paymentType?: string;
          type?: string;
          description?: string | null;
          paymentDate: string;
        }>;
      }>;
    }>;
  }>;
}

/**
 * Преобразует результат аналитики в формат ResponsibleUser[] для UI «Выплаты»
 */
export function mapAnalysisToUsers(
  analysis: UsersWorksClosurePeriodsAnalysisResult
): ResponsibleUser[] {
  if (!analysis || !Array.isArray(analysis.users)) return [];

  return analysis.users.map((user: any) => {
    const { userId, firstName, lastName, email } = user;

    let totalDebt = 0;
    let totalAccrued = 0;
    let totalPaid = 0;
    const works: WorkDetail[] = [] as any;

    user.works?.forEach((work: any) => {
      const salary = Number(work.salary) || 0;
      const workUsers: any[] = [];

      work.usersClosuresWithPeriods.forEach((closureWrap: any) => {
        const { closure, userPeriods, paymentHistory } = closureWrap;

        // Build duty map for this user
        const dutyMap: Record<string, DutyDetail> = {} as any;

        userPeriods?.dutiesPeriods?.forEach((period: any) => {
          period.distributionDetails?.forEach((dd: any) => {
            const dutyId = dd.dutyId;
            if (!dutyMap[dutyId]) {
              const price = Number(dd.price) || 0;
              const perc = Number(dd.percentage) || 0;
              const monthlyAmount = price + (salary * perc) / 100;
              dutyMap[dutyId] = {
                dutyId,
                dutyName: dd.duty?.name || '—',
                monthlyAmount,
                dailyAmount: monthlyAmount / 30,
                debt: 0,
              } as any;
            }
            dutyMap[dutyId].debt += Number(dd.calculatedValuePeriod || 0);
          });
        });

        const dutiesArr = Object.values(dutyMap);
        const totalAccruedUser = dutiesArr.reduce((s, d) => s + d.debt, 0);
        const totalPaidUser = (paymentHistory || []).reduce(
          (s: number, p: any) => s + p.amount,
          0
        );
        totalAccrued += totalAccruedUser;
        totalPaid += totalPaidUser;
        totalDebt += totalAccruedUser - totalPaidUser;

        // Преобразуем историю выплат
        const formattedPaymentHistory = (paymentHistory || []).map(
          (payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            type: payment.paymentType || payment.type || 'ADVANCE',
            description: payment.description || '',
            date: payment.paymentDate,
          })
        );

        workUsers.push({
          userId,
          firstName: firstName || '',
          lastName: lastName || '',
          email,
          totalDebt: totalAccruedUser - totalPaidUser,
          totalAccrued: totalAccruedUser,
          totalPaid: totalPaidUser,
          remainingDebt: totalAccruedUser - totalPaidUser,
          isPaymentDue: totalAccruedUser - totalPaidUser > 0,
          lastClosureDate: toIsoFromRu(closure.closureDate),
          duties: dutiesArr,
          paymentHistory: formattedPaymentHistory,
          userPeriods,
        });
      });

      const totalWorkDebt = workUsers.reduce(
        (sum, u) => sum + (u.totalAccrued - u.totalPaid),
        0
      );
      const totalWorkPaid = workUsers.reduce((sum, u) => sum + u.totalPaid, 0);

      works.push({
        workId: work.workId,
        workName: work.workName,
        duties: [],
        totalDebt: totalWorkDebt,
        paidAmount: totalWorkPaid,
        isPaymentDue: totalWorkDebt > 0,
        lastClosureDate: work.createdAt,
        users: workUsers,
        salary: salary,
        rawClosureWraps: work.usersClosuresWithPeriods,
      } as any);
    });

    // Рассчитываем общую выплаченную сумму (не больше начисленного по каждой работе)
    const totalPaidCorrected = (works as any[]).reduce((sum, work) => {
      const workAccrued = (work.users || []).reduce(
        (userSum: number, u: any) => userSum + u.totalAccrued,
        0
      );
      const workPaid = work.paidAmount;
      return sum + Math.min(workPaid, workAccrued);
    }, 0);

    // Общий остаток только по положительным остаткам работ
    const remainingDebt = (works as any[]).reduce((sum, work) => {
      const workRemaining = work.totalDebt;
      return sum + (workRemaining > 0 ? workRemaining : 0);
    }, 0);

    return {
      userId,
      firstName,
      lastName,
      email,
      salaryDay: 15,
      works: works as any,
      totalDebt,
      totalAccrued,
      totalPaid: totalPaidCorrected,
      remainingDebt,
      isPaymentDue: remainingDebt > 0,
      lastPaymentDate: null,
      lastPaymentAmount: null,
    } as ResponsibleUser;
  });
}

export function toIsoFromRu(dStr: string | null): string | null {
  if (!dStr) return null;
  if (dStr.includes('.')) {
    const [day, month, year] = dStr.split('.');
    return `${year}-${month}-${day}`;
  }
  return dStr;
}

export function parseRuDate(dStr: string): Date {
  const [day, month, year] = dStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}
