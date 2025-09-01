/**
 * Утилиты для работы с датами в контексте котировок
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: только работа с датами для котировок
 * Open/Closed: легко расширяется новыми форматами
 * DRY: единое место для всей логики дат котировок
 * KISS: простые, понятные функции
 */

import { dateManager } from './DateManager';

/**
 * Формат даты котировок - всегда DD.MM.YYYY
 */
export const EXCHANGE_RATE_DATE_FORMAT = 'DD.MM.YYYY';

/**
 * Регулярное выражение для проверки формата DD.MM.YYYY
 */
const RATE_DATE_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;

/**
 * Интерфейс для работы с датами котировок
 */
export interface IExchangeRateDate {
  readonly value: string; // DD.MM.YYYY
  toDate(): Date;
  toISO(): string;
  isValid(): boolean;
  equals(other: IExchangeRateDate | string): boolean;
  isAfter(other: IExchangeRateDate | string): boolean;
  isBefore(other: IExchangeRateDate | string): boolean;
  addDays(days: number): IExchangeRateDate;
  subtractDays(days: number): IExchangeRateDate;
}

/**
 * Класс для работы с датами котировок
 * Инкапсулирует всю логику работы с датами формата DD.MM.YYYY
 */
export class ExchangeRateDate implements IExchangeRateDate {
  public readonly value: string;

  constructor(date: string | Date) {
    if (date instanceof Date) {
      this.value = dateManager.formatRussian(date);
    } else if (typeof date === 'string') {
      if (RATE_DATE_REGEX.test(date)) {
        this.value = date;
      } else {
        // Попробуем парсить через DateManager
        const parsed = dateManager.parseDate(date);
        if (parsed) {
          this.value = dateManager.formatRussian(parsed);
        } else {
          throw new Error(`Invalid date format: ${date}. Expected DD.MM.YYYY or valid Date`);
        }
      }
    } else {
      throw new Error(`Invalid date input: ${date}`);
    }

    if (!this.isValid()) {
      throw new Error(`Invalid date: ${this.value}`);
    }
  }

  /**
   * Преобразует в объект Date
   */
  toDate(): Date {
    const parsed = dateManager.parseDate(this.value);
    if (!parsed) {
      throw new Error(`Failed to parse date: ${this.value}`);
    }
    return parsed;
  }

  /**
   * Преобразует в ISO формат YYYY-MM-DD
   */
  toISO(): string {
    return dateManager.formatISO(this.toDate());
  }

  /**
   * Проверяет валидность даты
   */
  isValid(): boolean {
    return dateManager.isValidRussianFormat(this.value);
  }

  /**
   * Сравнивает с другой датой на равенство
   */
  equals(other: IExchangeRateDate | string): boolean {
    const otherValue = typeof other === 'string' ? other : other.value;
    return this.value === otherValue;
  }

  /**
   * Проверяет, что эта дата позже другой
   */
  isAfter(other: IExchangeRateDate | string): boolean {
    const otherDate = typeof other === 'string' 
      ? new ExchangeRateDate(other).toDate() 
      : other.toDate();
    return this.toDate() > otherDate;
  }

  /**
   * Проверяет, что эта дата раньше другой
   */
  isBefore(other: IExchangeRateDate | string): boolean {
    const otherDate = typeof other === 'string' 
      ? new ExchangeRateDate(other).toDate() 
      : other.toDate();
    return this.toDate() < otherDate;
  }

  /**
   * Добавляет дни к дате
   */
  addDays(days: number): ExchangeRateDate {
    const date = this.toDate();
    date.setDate(date.getDate() + days);
    return new ExchangeRateDate(date);
  }

  /**
   * Вычитает дни из даты
   */
  subtractDays(days: number): ExchangeRateDate {
    return this.addDays(-days);
  }

  /**
   * Возвращает строковое представление
   */
  toString(): string {
    return this.value;
  }
}

/**
 * Фабричные функции для создания дат котировок
 * Следуют принципу DRY
 */
export const ExchangeRateDates = {
  /**
   * Создает дату из строки DD.MM.YYYY
   */
  fromString(dateStr: string): ExchangeRateDate {
    return new ExchangeRateDate(dateStr);
  },

  /**
   * Создает дату из объекта Date
   */
  fromDate(date: Date): ExchangeRateDate {
    return new ExchangeRateDate(date);
  },

  /**
   * Создает текущую дату
   */
  today(): ExchangeRateDate {
    return new ExchangeRateDate(new Date());
  },

  /**
   * Создает вчерашнюю дату
   */
  yesterday(): ExchangeRateDate {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return new ExchangeRateDate(date);
  },

  /**
   * Парсит дату безопасно, возвращает null если не удалось
   */
  tryParse(input: string | Date | null | undefined): ExchangeRateDate | null {
    if (!input) return null;
    
    try {
      return new ExchangeRateDate(input);
    } catch {
      return null;
    }
  },

  /**
   * Проверяет валидность строки даты
   */
  isValidString(dateStr: string): boolean {
    return RATE_DATE_REGEX.test(dateStr) && dateManager.isValidRussianFormat(dateStr);
  },

  /**
   * Сортирует массив дат котировок по убыванию (новые сначала)
   */
  sortDescending(dates: (ExchangeRateDate | string)[]): ExchangeRateDate[] {
    return dates
      .map(d => typeof d === 'string' ? new ExchangeRateDate(d) : d)
      .sort((a, b) => {
        const dateA = a.toDate();
        const dateB = b.toDate();
        return dateB.getTime() - dateA.getTime();
      });
  },

  /**
   * Сортирует массив дат котировок по возрастанию (старые сначала)
   */
  sortAscending(dates: (ExchangeRateDate | string)[]): ExchangeRateDate[] {
    return dates
      .map(d => typeof d === 'string' ? new ExchangeRateDate(d) : d)
      .sort((a, b) => {
        const dateA = a.toDate();
        const dateB = b.toDate();
        return dateA.getTime() - dateB.getTime();
      });
  },

  /**
   * Создает последовательность дат от start до end (включительно)
   */
  range(start: ExchangeRateDate | string, end: ExchangeRateDate | string): ExchangeRateDate[] {
    const startDate = typeof start === 'string' ? new ExchangeRateDate(start) : start;
    const endDate = typeof end === 'string' ? new ExchangeRateDate(end) : end;
    
    if (startDate.isAfter(endDate)) {
      throw new Error('Start date must be before or equal to end date');
    }

    const dates: ExchangeRateDate[] = [];
    let current = startDate;
    
    while (!current.isAfter(endDate)) {
      dates.push(current);
      current = current.addDays(1);
    }
    
    return dates;
  }
};

/**
 * Вспомогательные функции для обратной совместимости
 * Постепенно заменят старые функции в коде
 */

/**
 * Парсит дату DD.MM.YYYY в объект Date
 * @deprecated Используйте ExchangeRateDate.fromString().toDate()
 */
export function parseExchangeRateDate(dateStr: string): Date | null {
  try {
    return new ExchangeRateDate(dateStr).toDate();
  } catch {
    return null;
  }
}

/**
 * Форматирует Date в DD.MM.YYYY
 * @deprecated Используйте ExchangeRateDate.fromDate().toString()
 */
export function formatExchangeRateDate(date: Date): string {
  return new ExchangeRateDate(date).toString();
}

/**
 * Проверяет валидность строки даты DD.MM.YYYY
 * @deprecated Используйте ExchangeRateDates.isValidString()
 */
export function isValidExchangeRateDate(dateStr: string): boolean {
  return ExchangeRateDates.isValidString(dateStr);
}
