import { WorkIncome } from '../types/work-income';
import { formatDateToISO } from './date';
import { getWorkingDaysInPeriod } from './salary-working-days';

export const MONTHLY_WORKING_DAYS_MULTIPLIER = 365 / 12;

interface CalculateWorkIncomeFixationAmountParams {
  incomes: WorkIncome[];
  workCurrency: 'RUB' | 'USD';
  startDate?: string;
  endDate?: string;
}

export function calculatePeriodAmountInWorkCurrency(
  incomes: WorkIncome[],
  workCurrency: 'RUB' | 'USD',
): number {
  return incomes.reduce((sum, income) => {
    if (income.currency === workCurrency) {
      return sum + income.amount;
    }

    return sum + (income.convertedAmount ?? 0);
  }, 0);
}

export function calculateWorkingDaysInInclusivePeriod(
  startDate?: string,
  endDate?: string,
): number | null {
  const parsedStartDate = parseDateOnly(startDate);
  const parsedEndDate = parseDateOnly(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return null;
  }

  const endExclusiveDate = addUtcDays(parsedEndDate, 1);
  return getWorkingDaysInPeriod(parsedStartDate, endExclusiveDate);
}

export function calculateWorkIncomeFixationAmount({
  incomes,
  workCurrency,
  startDate,
  endDate,
}: CalculateWorkIncomeFixationAmountParams): number | undefined {
  const totalPeriodAmount = calculatePeriodAmountInWorkCurrency(incomes, workCurrency);

  if (totalPeriodAmount === 0) {
    return 0;
  }

  const workingDaysInPeriod = calculateWorkingDaysInInclusivePeriod(startDate, endDate);
  if (!workingDaysInPeriod || workingDaysInPeriod <= 0) {
    return undefined;
  }

  return Math.round((totalPeriodAmount / workingDaysInPeriod) * MONTHLY_WORKING_DAYS_MULTIPLIER);
}

function parseDateOnly(dateInput?: string): Date | null {
  const normalizedDate = formatDateToISO(dateInput);
  if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  const [year, month, day] = normalizedDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
