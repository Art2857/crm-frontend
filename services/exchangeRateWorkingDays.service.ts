/**
 * Сервис для работы с рабочими днями в контексте котировок ЦБ РФ
 * Принципы: SOLID, DRY, KISS
 *
 * Single Responsibility: только рабочие дни для котировок
 * Open/Closed: легко расширяется для других центробанков
 * Dependency Inversion: зависит от интерфейсов
 */

import { ExchangeRateDate, ExchangeRateDates } from '../utils/exchangeRateDate';
import {
  isCBRWorkingDay,
  getLastCBRWorkingDay,
  getNextCBRWorkingDay,
  getCBRWorkingDaysInRange,
  hasCBRWorkingDaysBetween,
} from '../utils/cbr-working-days';

/**
 * Интерфейс для сервиса рабочих дней котировок
 */
export interface IExchangeRateWorkingDaysService {
  isWorkingDay(date: ExchangeRateDate | string | Date): boolean;
  getNextWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate;
  getPreviousWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate;
  getLastWorkingDay(): ExchangeRateDate;
  getWorkingDaysInRange(
    start: ExchangeRateDate | string,
    end: ExchangeRateDate | string,
  ): ExchangeRateDate[];
  countWorkingDays(start: ExchangeRateDate | string, end: ExchangeRateDate | string): number;
  hasWorkingDaysBetween(start: ExchangeRateDate | string, end: ExchangeRateDate | string): boolean;
}

/**
 * Реализация сервиса рабочих дней для котировок ЦБ РФ
 */
export class ExchangeRateWorkingDaysService implements IExchangeRateWorkingDaysService {
  /**
   * Проверяет, является ли день рабочим для ЦБ РФ
   */
  isWorkingDay(date: ExchangeRateDate | string | Date): boolean {
    const dateObj = this.normalizeToDate(date);
    return isCBRWorkingDay(dateObj);
  }

  /**
   * Находит следующий рабочий день ЦБ РФ
   */
  getNextWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    const dateObj = this.normalizeToDate(date);
    const nextWorkingDay = getNextCBRWorkingDay(dateObj);
    return ExchangeRateDates.fromDate(nextWorkingDay);
  }

  /**
   * Находит предыдущий рабочий день ЦБ РФ
   */
  getPreviousWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    const dateObj = this.normalizeToDate(date);
    const currentDate = new Date(dateObj);

    for (let i = 1; i <= 7; i++) {
      currentDate.setDate(currentDate.getDate() - 1);
      if (isCBRWorkingDay(currentDate)) {
        return ExchangeRateDates.fromDate(new Date(currentDate));
      }
    }

    throw new Error('Could not find previous CBR working day within last week');
  }

  /**
   * Находит последний рабочий день ЦБ РФ (от сегодня или раньше)
   */
  getLastWorkingDay(): ExchangeRateDate {
    const lastWorkingDay = getLastCBRWorkingDay();
    return ExchangeRateDates.fromDate(lastWorkingDay);
  }

  /**
   * Получает все рабочие дни ЦБ РФ в диапазоне (включительно)
   */
  getWorkingDaysInRange(
    start: ExchangeRateDate | string,
    end: ExchangeRateDate | string,
  ): ExchangeRateDate[] {
    const startDate = this.normalizeToExchangeRateDate(start);
    const endDate = this.normalizeToExchangeRateDate(end);

    if (startDate.isAfter(endDate)) {
      throw new Error('Start date must be before or equal to end date');
    }

    const allDates = ExchangeRateDates.range(startDate, endDate);
    return allDates.filter((date) => this.isWorkingDay(date));
  }

  /**
   * Подсчитывает количество рабочих дней ЦБ РФ в диапазоне (включительно)
   */
  countWorkingDays(start: ExchangeRateDate | string, end: ExchangeRateDate | string): number {
    return this.getWorkingDaysInRange(start, end).length;
  }

  /**
   * Проверяет, есть ли рабочие дни ЦБ РФ между двумя датами (исключительно)
   */
  hasWorkingDaysBetween(start: ExchangeRateDate | string, end: ExchangeRateDate | string): boolean {
    const startDate = this.normalizeToDate(start);
    const endDate = this.normalizeToDate(end);

    return hasCBRWorkingDaysBetween(startDate, endDate);
  }

  /**
   * Получает отладочную информацию о дне
   */
  getDebugInfo(date: ExchangeRateDate | string | Date): object {
    const exchangeDate = this.normalizeToExchangeRateDate(date);
    const jsDate = exchangeDate.toDate();
    const dayOfWeek = jsDate.getDay();
    const dayNames = [
      'ВОСКР(❌)',
      'ПОНЕД(❌)',
      'ВТОРН(✅)',
      'СРЕДА(✅)',
      'ЧЕТВ(✅)',
      'ПЯТН(✅)',
      'СУББ(✅)',
    ];

    return {
      date: exchangeDate.value,
      dayOfWeek: dayOfWeek,
      dayName: dayNames[dayOfWeek],
      isWorkingDay: this.isWorkingDay(exchangeDate),
      note: 'ЦБ РФ: Выходные ВС+ПН, Рабочие ВТ-СБ',
    };
  }

  /**
   * Приводит любой формат даты к Date
   */
  private normalizeToDate(date: ExchangeRateDate | string | Date): Date {
    if (date instanceof Date) {
      return date;
    }

    if (date instanceof ExchangeRateDate) {
      return date.toDate();
    }

    if (typeof date === 'string') {
      return new ExchangeRateDate(date).toDate();
    }

    throw new Error(`Invalid date format: ${date}`);
  }

  /**
   * Приводит любой формат даты к ExchangeRateDate
   */
  private normalizeToExchangeRateDate(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    if (date instanceof ExchangeRateDate) {
      return date;
    }

    return new ExchangeRateDate(date);
  }
}

/**
 * Синглтон сервиса рабочих дней ЦБ РФ
 */
export const exchangeRateWorkingDaysService = new ExchangeRateWorkingDaysService();
