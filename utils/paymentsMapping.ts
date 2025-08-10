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
  const [day, month, year] = dStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}
