/**
 * Централизованный менеджер для работы с датами
 * Обеспечивает единообразную обработку дат во всей системе
 */

// Интерфейс для контекста часовых поясов
interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => void;
  availableTimezones: string[];
}

/**
 * Типы для различных форматов дат
 */
export type DateFormat = 'iso' | 'russian' | 'russian-with-time';
export type DateInput = string | Date | null | undefined;

/**
 * Поля которые должны отображаться только как даты (без времени)
 */
const DATE_ONLY_FIELDS = new Set([
  'birthday',
  'releaseDate',
  'effectiveDate',
  'paymentDate',
  'closureDate',
]);

/**
 * Класс для централизованной работы с датами
 */
export class DateManager {
  private static instance: DateManager;
  private userTimezone: string = 'UTC';

  private constructor() {
    // Определяем timezone браузера по умолчанию
    try {
      this.userTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      this.userTimezone = 'UTC';
    }
  }

  /**
   * Получить единственный экземпляр DateManager
   */
  static getInstance(): DateManager {
    if (!DateManager.instance) {
      DateManager.instance = new DateManager();
    }
    return DateManager.instance;
  }

  /**
   * Установить часовой пояс пользователя
   */
  setUserTimezone(timezone: string): void {
    this.userTimezone = timezone;
  }

  /**
   * Получить часовой пояс пользователя
   */
  getUserTimezone(): string {
    return this.userTimezone;
  }

  /**
   * Проверяет, является ли поле датой без времени
   */
  isDateOnlyField(fieldName: string): boolean {
    return DATE_ONLY_FIELDS.has(fieldName);
  }

  /**
   * Парсит строку даты в Date объект
   */
  parseDate(dateInput: DateInput): Date | null {
    if (!dateInput) return null;

    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }

    try {
      // Проверяем российский формат DD.MM.YYYY
      if (
        typeof dateInput === 'string' &&
        /^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)
      ) {
        const parts = dateInput.split('.');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Месяцы с 0
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);

        // Проверяем валидность
        if (
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
        ) {
          return date;
        }
        return null;
      }

      // Проверяем ISO формат YYYY-MM-DD
      if (
        typeof dateInput === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ) {
        const [year, month, day] = dateInput.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      }

      // Общий парсинг
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error('Ошибка парсинга даты:', e);
      return null;
    }
  }

  /**
   * Форматирует дату в ISO формат YYYY-MM-DD
   */
  formatISO(dateInput: DateInput): string {
    const date = this.parseDate(dateInput);
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Форматирует дату в российский формат DD.MM.YYYY
   */
  formatRussian(dateInput: DateInput): string {
    const date = this.parseDate(dateInput);
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${day}.${month}.${year}`;
  }

  /**
   * Форматирует дату в российский формат с временем DD.MM.YYYY HH:MM
   */
  formatRussianWithTime(
    dateInput: DateInput,
    useUserTimezone: boolean = true
  ): string {
    const date = this.parseDate(dateInput);
    if (!date) return '';

    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: useUserTimezone ? this.userTimezone : 'UTC',
      };

      return new Intl.DateTimeFormat('ru-RU', options).format(date);
    } catch (error) {
      console.error('Ошибка форматирования даты с временем:', error);
      // Fallback к простому формату
      return this.formatRussian(dateInput);
    }
  }

  /**
   * Универсальный метод форматирования даты
   */
  format(
    dateInput: DateInput,
    format: DateFormat = 'russian',
    useUserTimezone: boolean = true
  ): string {
    switch (format) {
      case 'iso':
        return this.formatISO(dateInput);
      case 'russian':
        return this.formatRussian(dateInput);
      case 'russian-with-time':
        return this.formatRussianWithTime(dateInput, useUserTimezone);
      default:
        return this.formatRussian(dateInput);
    }
  }

  /**
   * Автоматическое форматирование на основе типа поля
   */
  formatByField(
    dateInput: DateInput,
    fieldName: string,
    useUserTimezone: boolean = true
  ): string {
    if (this.isDateOnlyField(fieldName)) {
      return this.formatRussian(dateInput);
    } else {
      return this.formatRussianWithTime(dateInput, useUserTimezone);
    }
  }

  /**
   * Получить текущую дату в ISO формате
   */
  getCurrentDateISO(): string {
    return this.formatISO(new Date());
  }

  /**
   * Получить вчерашнюю дату в ISO формате
   */
  getYesterdayISO(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.formatISO(yesterday);
  }

  /**
   * Проверяет валидность российского формата даты DD.MM.YYYY
   */
  isValidRussianFormat(dateString: string): boolean {
    if (!dateString) return false;

    // Проверка формата DD.MM.YYYY
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
      return false;
    }

    // Разбивка на компоненты и валидация
    const parts = dateString.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    );
  }

  /**
   * Конвертирует дату в часовой пояс пользователя
   */
  toUserTimezone(date: Date): Date {
    // Для большинства случаев просто возвращаем дату как есть
    // В будущем здесь можно добавить сложную логику преобразования
    return date;
  }

  /**
   * Создает Date объект для даты без времени
   */
  createDateOnly(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Вычисляет возраст по дате рождения
   */
  calculateAge(birthdayInput: DateInput): number | null {
    const birthday = this.parseDate(birthdayInput);
    if (!birthday) return null;

    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthday.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * Интеграция с TimezoneContext
   */
  syncWithTimezoneContext(timezoneContext: TimezoneContextValue | null): void {
    if (timezoneContext?.timezone) {
      this.setUserTimezone(timezoneContext.timezone);
    }
  }
}

/**
 * Экспорт единственного экземпляра DateManager
 */
export const dateManager = DateManager.getInstance();

/**
 * Хуки для удобного использования в компонентах
 */
export const useDateManager = () => {
  return dateManager;
};

/**
 * Вспомогательные функции для обратной совместимости
 */
export const formatDateToISO = (date: DateInput): string => {
  return dateManager.formatISO(date);
};

export const formatDateForDisplay = (
  dateInput: DateInput,
  includeTime: boolean = false
): string => {
  return includeTime
    ? dateManager.formatRussianWithTime(dateInput)
    : dateManager.formatRussian(dateInput);
};

export const toDateObject = (date: DateInput): Date | null => {
  return dateManager.parseDate(date);
};

export const getCurrentDateISO = (): string => {
  return dateManager.getCurrentDateISO();
};

export const isValidRussianDateFormat = (dateString: string): boolean => {
  return dateManager.isValidRussianFormat(dateString);
};

export const russianDateToDate = (dateString: string): Date | null => {
  return dateManager.parseDate(dateString);
};

export const formatedDateToDateObject = (date: string): Date => {
  const parsed = dateManager.parseDate(date);
  if (!parsed) {
    throw new Error(`Failed to parse date: ${date}`);
  }
  return parsed;
};
