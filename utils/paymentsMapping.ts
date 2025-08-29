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
// mapAnalysisToUsers больше не используется — расчёты теперь приходят с бэка
export function mapAnalysisToUsers(): ResponsibleUser[] {
  return [];
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
  if (!dStr || typeof dStr !== 'string') {
    throw new Error('Invalid date string provided');
  }

  const parts = dStr.split('.');
  if (parts.length !== 3) {
    throw new Error(
      `Invalid Russian date format: ${dStr}. Expected DD.MM.YYYY`
    );
  }

  const [day, month, year] = parts.map(Number);

  // Проверяем валидность чисел
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date components in: ${dStr}`);
  }

  // Проверяем диапазоны
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900 ||
    year > 2100
  ) {
    throw new Error(`Date out of valid range: ${dStr}`);
  }

  const date = new Date(year, month - 1, day);

  // Проверяем, что дата валидна (например, 32.01.2023 создаст 01.02.2023)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${dStr}`);
  }

  return date;
}
