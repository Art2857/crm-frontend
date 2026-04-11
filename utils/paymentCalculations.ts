import {
  DetailedCalculation,
  PeriodCalculation,
  ResponsibleUser,
  WorkDetail,
  DutyDebt,
  DutyDetail,
} from '../types/payments';
import { MyDebt } from '../services/analytics';
import {
  getSalaryWorkingDaysInMonth as getWorkingDaysInMonth,
  getSalaryWorkingDaysInPeriod as getWorkingDaysInPeriod,
} from './salary-working-days';
import { toIsoFromRu, parseRuDate } from './paymentsMapping';

// Основная функция находится ниже

type UsersData = ResponsibleUser[];

type PaymentType = 'SALARY' | 'ADVANCE' | 'BONUS' | 'EXTRA';

function normalizePaymentType(input: unknown): PaymentType {
  const value = String(input || '').toUpperCase();
  if (value === 'SALARY' || value === 'ADVANCE' || value === 'BONUS' || value === 'EXTRA') {
    return value as PaymentType;
  }
  return 'EXTRA';
}

export function buildWorkDetailedCalculation(params: {
  usersData: UsersData;
  myDebts: MyDebt[];
  userId: string;
  workId: string;
  dutyId?: string;
  getWorkPeriodDate: (workId: string) => string;
}): { calculation: DetailedCalculation; showPaymentHistory: boolean } | null {
  const { usersData, myDebts, userId, workId, dutyId, getWorkPeriodDate } = params;

  let work: {
    workId: string;
    workName: string;
    lastClosureDate: string | null;
    salary: number;
  } | null = null;
  let userWorkEntry: any | null = null;
  let workEntry: WorkDetail | null = null;
  let myDebtData: MyDebt | null = null;

  // Найти пользователя и работу в usersData
  const userData = usersData.find((u) => u.userId === userId);
  if (userData) {
    workEntry = userData.works?.find((w) => w.workId === workId) || null;
    if (workEntry) {
      work = {
        workId: workEntry.workId,
        workName: workEntry.workName,
        lastClosureDate: workEntry.lastClosureDate || null,
        salary: workEntry.salary,
      };
      userWorkEntry = workEntry.users?.find((u) => u.userId === userId) || null;
    }
  }

  // Если не нашли – попробуем долги текущего пользователя
  if (!work) {
    const debt = myDebts.find((d) => d.workId === workId);
    if (debt) {
      work = {
        workId: debt.workId,
        workName: debt.workName,
        salary: 0,
        lastClosureDate: null,
      };
      myDebtData = debt;
    }
  }

  if (!work) return null;

  // История выплат
  let paymentHistoryData: Array<{
    id: string;
    amount: number;
    type: PaymentType;
    description: string;
    date: string;
    createdAt: string;
  }> = [];

  if (userWorkEntry) {
    const rawHistory = userWorkEntry.paymentHistory || [];
    paymentHistoryData = rawHistory.map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount) || 0,
      type: normalizePaymentType(payment.type),
      description: payment.description || '',
      date: payment.date,
    }));
  } else if (myDebtData) {
    paymentHistoryData = (myDebtData.payments || []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount) || 0,
      type: normalizePaymentType((payment as any).paymentType || (payment as any).type),
      description: payment.description || '',
      date: (payment as any).paymentDate || (payment as any).date,
      createdAt: payment.createdAt,
    }));
  }

  const totalPaidAmount = paymentHistoryData.reduce((sum, p) => sum + p.amount, 0);
  const calculationDate = getWorkPeriodDate(workId);

  // Подготовка данных периодов
  const periods: PeriodCalculation[] = [];

  if (myDebtData) {
    if (dutyId) {
      const duty = myDebtData.duties.find((d) => d.id === dutyId);
      if (duty && duty.calculatedPeriods) {
        duty.calculatedPeriods.forEach((period: any) => {
          const startDate = new Date(period.start);
          const endDate = new Date(period.end);
          const daysInPeriod =
            Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const monthDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
          periods.push({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days: daysInPeriod,
            monthDays,
            duties: [
              {
                dutyId: duty.id,
                dutyName: duty.name,
                monthlyAmount: duty.monthlyAmount,
                calculatedAmount: period.accrued,
                currency: (duty as DutyDebt).currency as 'RUB' | 'USD' | undefined,
              },
            ],
            totalAmount: period.accrued,
          });
        });
      }
    } else {
      const allPeriods: any[] = [];
      myDebtData.duties.forEach((duty) => {
        (duty.calculatedPeriods || []).forEach((period: any) => {
          allPeriods.push({ duty, period });
        });
      });
      const periodMap = new Map<string, any[]>();
      allPeriods.forEach(({ duty, period }) => {
        const key = `${period.start}|${period.end}`;
        if (!periodMap.has(key)) periodMap.set(key, []);
        periodMap.get(key)!.push({ duty, period });
      });
      Array.from(periodMap.entries()).forEach(([key, dutyPeriods]) => {
        const [start, end] = key.split('|');
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Пропускаем периоды где начало больше или равно концу
        if (startDate.getTime() >= endDate.getTime()) {
          return;
        }

        const workingDaysInPeriod = getWorkingDaysInPeriod(startDate, endDate);
        const workingDaysInMonth = getWorkingDaysInMonth(endDate);
        const dutiesForPeriod = dutyPeriods.map(({ duty, period }: any) => ({
          dutyId: duty.id,
          dutyName: duty.name,
          monthlyAmount: duty.monthlyAmount,
          calculatedAmount: period.accrued,
          currency: (duty as DutyDebt).currency as 'RUB' | 'USD' | undefined,
        }));
        const totalAmount = dutiesForPeriod.reduce(
          (s: number, d: any) => s + d.calculatedAmount,
          0,
        );
        periods.push({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: workingDaysInPeriod,
          monthDays: workingDaysInMonth,
          duties: dutiesForPeriod,
          totalAmount,
        });
      });
    }
  } else if (userWorkEntry && (workEntry as any)?.rawClosureWraps) {
    const salary = Number(work.salary) || 0;
    const closureWrap = (workEntry as any).rawClosureWraps?.find(
      (cw: any) => cw.closure.userId === userId,
    );
    const userPeriodsSource = closureWrap?.userPeriods;
    userPeriodsSource?.dutiesPeriods?.forEach((p: any) => {
      try {
        const periodStartDate = parseRuDate(p.startDate);
        const periodEndDate = parseRuDate(p.endDate);
        const workingDaysInMonth = getWorkingDaysInMonth(periodEndDate);
        const userDuties: DutyDetail[] = (userWorkEntry?.duties || []) as DutyDetail[];
        const currencyMap = new Map<string, 'RUB' | 'USD'>();
        userDuties.forEach((ud) => {
          const cur: 'RUB' | 'USD' = ud.currency === 'USD' ? 'USD' : 'RUB';
          currencyMap.set(ud.dutyId, cur);
        });

        const dutiesCalc = p.distributionDetails.map(
          (dd: {
            dutyId: string;
            price: number | null;
            percentage: number | null;
            calculatedValuePeriod?: number;
            duty?: { name?: string | null };
          }) => {
            const price = Number(dd.price) || 0;
            const perc = Number(dd.percentage) || 0;
            const monthlyAmount = price + (salary * perc) / 100;
            return {
              dutyId: dd.dutyId,
              dutyName: dd.duty?.name || '-',
              monthlyAmount,
              calculatedAmount: Math.round(Number(dd.calculatedValuePeriod) || 0),
              currency: currencyMap.get(dd.dutyId),
            };
          },
        );
        const filteredDuties = dutyId
          ? dutiesCalc.filter((d: any) => d.dutyId === dutyId)
          : dutiesCalc;
        if (filteredDuties.length === 0) return;

        // Проверяем корректность периода
        const startDate = parseRuDate(p.startDate);
        const endDate = parseRuDate(p.endDate);

        // Пропускаем периоды где начало больше или равно концу
        if (startDate.getTime() >= endDate.getTime()) return;

        const totalAmount = filteredDuties.reduce((s: number, d: any) => s + d.calculatedAmount, 0);
        periods.push({
          startDate: toIsoFromRu(p.startDate)!,
          endDate: toIsoFromRu(p.endDate)!,
          days: p.daysInPeriod,
          monthDays: workingDaysInMonth,
          duties: filteredDuties,
          totalAmount,
        });
      } catch (error) {
        console.error('Ошибка парсинга дат в периоде:', {
          startDate: p.startDate,
          endDate: p.endDate,
          error,
        });
        // Пропускаем этот период при ошибке парсинга дат
      }
    });
  }

  if (periods.length === 0) {
    periods.push({
      startDate: work.lastClosureDate || '2024-01-01',
      endDate: calculationDate,
      days: 0,
      monthDays: 0,
      duties: [],
      totalAmount: 0,
    });
  }

  let totalAccrued: number;
  let totalPaid: number;
  let remainingDebt: number;

  if (myDebtData) {
    if (dutyId) {
      const duty = myDebtData.duties.find((d) => d.id === dutyId);
      if (duty) {
        totalAccrued = duty.totalAccrued || periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
        totalPaid = duty.totalPaid || 0;
        remainingDebt = duty.totalDebt || totalAccrued - totalPaid;
      } else {
        totalAccrued = periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
        totalPaid = totalPaidAmount;
        remainingDebt = totalAccrued - totalPaidAmount;
      }
    } else {
      totalAccrued =
        myDebtData.totalAccrued || periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
      totalPaid = myDebtData.totalPaid || totalPaidAmount;
      remainingDebt = myDebtData.totalDebt || totalAccrued - totalPaid;
    }
  } else {
    totalAccrued = periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
    totalPaid = totalPaidAmount;
    remainingDebt = totalAccrued - totalPaidAmount;
  }

  let userName = 'Пользователь';
  if (userData) {
    userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Пользователь';
  }

  const calculation: DetailedCalculation = {
    userId,
    workId,
    userName,
    workName: work.workName,
    periods,
    totalAccrued,
    totalPaid,
    remainingDebt,
    lastClosureDate: work.lastClosureDate || null,
    paymentHistory: paymentHistoryData,
  };

  const showPaymentHistory = !Boolean(dutyId);
  return { calculation, showPaymentHistory };
}

export function buildUserDetailedCalculation(params: {
  usersData: UsersData;
  userId: string;
  getWorkPeriodDate: (workId: string) => string;
}): DetailedCalculation | null {
  const { usersData, userId, getWorkPeriodDate } = params;
  const userData = usersData.find((u) => u.userId === userId);
  if (!userData || !userData.works || userData.works.length === 0) return null;

  const firstWork = userData.works[0];
  const totalAccrued = userData.totalAccrued;
  const totalPaid = userData.totalPaid;
  const remainingDebt = userData.works.reduce((sum, work) => {
    const workRemaining = work.totalDebt;
    return sum + (workRemaining > 0 ? workRemaining : 0);
  }, 0);

  const allDuties: any[] = [];
  const allPaymentHistory: any[] = [];
  const workGroups: any[] = [];

  userData.works.forEach((work) => {
    const userWork = work.users?.find((u) => u.userId === userId);
    if (userWork) {
      // Копируем обязанности и помечаем источник работы
      allDuties.push(
        ...userWork.duties.map((d: any) => ({
          ...d,
          workId: work.workId,
          workName: work.workName,
        })),
      );
      if (userWork.paymentHistory && userWork.paymentHistory.length > 0) {
        allPaymentHistory.push(...userWork.paymentHistory);
      }
      if (userWork.duties && userWork.duties.length > 0) {
        workGroups.push({
          workId: work.workId,
          workName: work.workName,
          duties: userWork.duties.map((duty: any, index: number) => ({
            dutyId: `${duty.dutyId}-${index}`,
            dutyName: duty.dutyName,
            monthlyAmount: duty.monthlyAmount,
            calculatedAmount: duty.debt,
          })),
        });
      }
    }
  });

  const sortedPaymentHistory = allPaymentHistory.sort((a, b) => {
    const dateA = new Date(a.date || a.paymentDate || 0);
    const dateB = new Date(b.date || b.paymentDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const startDate = firstWork.lastClosureDate || '2024-01-01';
  const endDate = getWorkPeriodDate(firstWork.workId);

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const workingDaysInPeriod = getWorkingDaysInPeriod(startDateObj, endDateObj);
  const workingDaysInMonth = getWorkingDaysInMonth(endDateObj);

  const periods: PeriodCalculation[] = [
    {
      startDate,
      endDate,
      days: workingDaysInPeriod,
      monthDays: workingDaysInMonth,
      duties: allDuties.map((duty, index) => ({
        dutyId: `${duty.dutyId}-${index}`,
        dutyName: duty.dutyName,
        monthlyAmount: duty.monthlyAmount,
        calculatedAmount: duty.debt,
        workId: duty.workId,
        workName: duty.workName,
      })),
      // @ts-ignore - опциональная группировка для UI
      workGroups,
      totalAmount: totalAccrued,
    },
  ];

  const userName =
    `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Пользователь';

  return {
    userId,
    workId: firstWork.workId,
    userName,
    workName: firstWork.workName,
    periods,
    totalAccrued,
    totalPaid,
    remainingDebt,
    lastClosureDate: firstWork.lastClosureDate || null,
    paymentHistory: sortedPaymentHistory,
  };
}
