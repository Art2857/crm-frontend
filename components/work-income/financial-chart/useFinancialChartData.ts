import { useMemo } from 'react';
import { WorkIncome } from '../../../types/work-income';
import { Payment } from '../../../types/payment';
import { DistributionWithDetails } from '../../../types/duty';

export const useFinancialChartData = (
  incomes: WorkIncome[],
  payments: Payment[],
  workCurrency: 'RUB' | 'USD',
  workReleaseDate?: string | null,
  totalWorkBudget?: number,
  distributions?: DistributionWithDetails[]
) => {
  const sortedDistributions = useMemo(() => {
    if (!distributions) return [];
    return [...distributions].sort((a, b) => {
      const dateA = new Date(
        a.workHistory?.effectiveDate || a.workHistory?.date || a.createdAt
      ).getTime();
      const dateB = new Date(
        b.workHistory?.effectiveDate || b.workHistory?.date || b.createdAt
      ).getTime();
      return dateA - dateB;
    });
  }, [distributions]);

  const { chartData, totalIncome } = useMemo(() => {
    const getPlannedExpenseAt = (timestamp: number) => {
      let activeDist: DistributionWithDetails | null = null;
      for (const dist of sortedDistributions) {
        const distTime = new Date(
          dist.workHistory?.effectiveDate ||
            dist.workHistory?.date ||
            dist.createdAt
        ).getTime();
        if (distTime <= timestamp) {
          activeDist = dist;
        } else {
          break;
        }
      }

      if (!activeDist || !activeDist.details) return 0;

      let monthlyFixed = 0;
      activeDist.details.forEach((d) => {
        if (d.price) {
          monthlyFixed += parseFloat(d.price);
        }
      });
      return monthlyFixed;
    };

    // Агрегирование всех событий по дате
    const eventsByDate = new Map<
      number,
      {
        date: number;
        isoDate: string;
        incomeAmount: number;
        expenseAmount: number;
        incomeItems: any[];
        expenseItems: any[];
        type: 'event';
      }
    >();

    const getOrCreateDay = (t: number, iso: string) => {
      if (!eventsByDate.has(t)) {
        eventsByDate.set(t, {
          date: t,
          isoDate: iso,
          incomeAmount: 0,
          expenseAmount: 0,
          incomeItems: [],
          expenseItems: [],
          type: 'event',
        });
      }
      return eventsByDate.get(t)!;
    };

    let tIncome = 0;

    incomes.forEach((inc) => {
      let amount = inc.amount;
      if (
        inc.currency !== workCurrency &&
        inc.convertedAmount &&
        inc.convertedCurrency === workCurrency
      ) {
        amount = inc.convertedAmount;
      }
      tIncome += amount;

      const d = new Date(inc.receivedDate);
      d.setHours(12, 0, 0, 0);
      const t = d.getTime();
      const day = getOrCreateDay(t, inc.receivedDate);

      day.incomeAmount += amount;
      day.incomeItems.push(inc);
    });

    payments.forEach((pay) => {
      const d = new Date(pay.paymentDate);
      d.setHours(12, 0, 0, 0);
      const t = d.getTime();
      const day = getOrCreateDay(t, pay.paymentDate);

      day.expenseAmount += pay.amount;
      day.expenseItems.push(pay);
    });

    // Определение временного диапазона
    let minTs = Infinity;
    let maxTs = -Infinity;

    for (const t of Array.from(eventsByDate.keys())) {
      if (t < minTs) minTs = t;
      if (t > maxTs) maxTs = t;
    }

    if (workReleaseDate) {
      const r = new Date(workReleaseDate);
      r.setHours(12, 0, 0, 0);
      const rTs = r.getTime();
      if (rTs < minTs) minTs = rTs;
      if (rTs > maxTs) maxTs = rTs;
    }

    if (sortedDistributions.length > 0) {
      const firstDist = sortedDistributions[0];
      const firstDistTs = new Date(
        firstDist.workHistory?.effectiveDate ||
          firstDist.workHistory?.date ||
          firstDist.createdAt
      ).getTime();
      if (firstDistTs < minTs) minTs = firstDistTs;
    }

    if (minTs === Infinity) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      oneMonthAgo.setHours(12, 0, 0, 0);
      minTs = oneMonthAgo.getTime();
    }
    if (maxTs === -Infinity) {
      maxTs = new Date().getTime();
    }
    if (maxTs < minTs) maxTs = minTs;

    // Контрольные точки
    const distributionCheckpoints = sortedDistributions.map((d) => {
      const t = new Date(
        d.workHistory?.effectiveDate || d.workHistory?.date || d.createdAt
      ).getTime();
      return {
        type: 'checkpoint',
        date: t,
        isoDate:
          d.workHistory?.effectiveDate ||
          d.workHistory?.date ||
          d.createdAt ||
          new Date(t).toISOString(),
      } as any;
    });

    const monthCheckpoints: any[] = [];
    const startCursor = new Date(minTs);
    startCursor.setDate(1);
    startCursor.setHours(12, 0, 0, 0);

    const now = new Date();
    now.setHours(12, 0, 0, 0);
    let endBound = Math.max(maxTs, now.getTime());
    if (workReleaseDate) {
      const r = new Date(workReleaseDate);
      r.setHours(12, 0, 0, 0);
      endBound = Math.max(endBound, r.getTime());
    }

    while (startCursor.getTime() <= endBound + 60 * 24 * 3600 * 1000) {
      const t = startCursor.getTime();
      monthCheckpoints.push({
        type: 'checkpoint',
        date: t,
        isoDate: startCursor.toISOString(),
      });
      startCursor.setMonth(startCursor.getMonth() + 1);
    }

    // Объединение всего в отсортированный список уникальных временных меток
    const allUniqueTimestamps = new Set<number>();
    eventsByDate.forEach((_, t) => allUniqueTimestamps.add(t));
    distributionCheckpoints.forEach((p) => allUniqueTimestamps.add(p.date));
    monthCheckpoints.forEach((p) => allUniqueTimestamps.add(p.date));

    const sortedTimestamps = Array.from(allUniqueTimestamps).sort(
      (a, b) => a - b
    );

    // Отслеживание текущего месяца для сброса накопления
    let currentMonthKey = '';

    let currentIncomeAcc = 0;
    let currentExpenseAcc = 0;

    const finalBudget =
      totalWorkBudget !== undefined ? totalWorkBudget : tIncome;

    const data = sortedTimestamps
      .map((t) => {
        const planned = getPlannedExpenseAt(t);
        const eventData = eventsByDate.get(t);

        // Значения по умолчанию
        let incVal = null;
        let expVal = null;
        let incomeItems: any[] = [];
        let expenseItems: any[] = [];
        let isoDate = eventData?.isoDate || new Date(t).toISOString();

        const dateObj = new Date(t);
        const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;

        // Сброс аккумуляторов при смене месяца
        if (monthKey !== currentMonthKey) {
          currentMonthKey = monthKey;
          currentIncomeAcc = 0;
          currentExpenseAcc = 0;
        }

        if (eventData) {
          // Обработка доходов
          if (eventData.incomeAmount > 0) {
            const start = currentIncomeAcc;
            const end = currentIncomeAcc + eventData.incomeAmount;
            currentIncomeAcc = end;
            incVal = [start, end] as [number, number];
            incomeItems = eventData.incomeItems;
          }
          // Обработка расходов
          if (eventData.expenseAmount > 0) {
            const start = currentExpenseAcc;
            const end = currentExpenseAcc - eventData.expenseAmount;
            currentExpenseAcc = end;
            // Обеспечение порядка [min, max] для Recharts
            expVal = [end, start] as [number, number];
            expenseItems = eventData.expenseItems;
          }
        }
        
        // Расчет накопленного баланса (нетто)
        const acc = currentIncomeAcc + currentExpenseAcc;

        return {
          date: t,
          isoDate: isoDate,
          type: eventData ? 'event' : 'checkpoint',
          incomeValue: incVal,
          expenseValue: expVal,
          plannedExpense: planned > 0 ? -planned : (sortedDistributions.length > 0 ? 0 : null),
          incomeItems: incomeItems.length ? incomeItems : null,
          expenseItems: expenseItems.length ? expenseItems : null,
          accAfter: acc,
          budget: finalBudget,
        };
      })
      .filter(
        (d) =>
          d.incomeValue ||
          d.expenseValue ||
          d.plannedExpense !== null ||
          d.type === 'checkpoint'
      );

    return { chartData: data, totalIncome: tIncome };
  }, [
    incomes,
    payments,
    workCurrency,
    sortedDistributions,
    workReleaseDate,
    totalWorkBudget,
  ]);

  return { chartData, totalIncome };
};
