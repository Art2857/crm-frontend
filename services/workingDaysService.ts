/**
 * Сервис для работы с рабочими днями
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: только логика рабочих дней
 * Open/Closed: легко добавить новые правила для выходных
 * Liskov Substitution: интерфейс может быть заменен на другую реализацию
 * Interface Segregation: четкий интерфейс без лишних методов
 * Dependency Inversion: зависит от абстракций, а не от конкретных реализаций
 */

import { ExchangeRateDate, ExchangeRateDates } from '../utils/exchangeRateDate';

/**
 * Дни недели (JavaScript стандарт)
 */
export enum WeekDay {
  SUNDAY = 0,    // Воскресенье 
  MONDAY = 1,    // Понедельник
  TUESDAY = 2,   // Вторник
  WEDNESDAY = 3, // Среда  
  THURSDAY = 4,  // Четверг
  FRIDAY = 5,    // Пятница
  SATURDAY = 6   // Суббота
}

/**
 * Конфигурация рабочих дней
 */
export interface IWorkingDaysConfig {
  workingDays: WeekDay[];
  holidays: string[]; // Даты праздников в формате DD.MM.YYYY
}

/**
 * Интерфейс для сервиса рабочих дней
 */
export interface IWorkingDaysService {
  isWorkingDay(date: ExchangeRateDate | string | Date): boolean;
  getNextWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate;
  getPreviousWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate;
  getLastWorkingDay(): ExchangeRateDate;
  getWorkingDaysInRange(start: ExchangeRateDate | string, end: ExchangeRateDate | string): ExchangeRateDate[];
  countWorkingDays(start: ExchangeRateDate | string, end: ExchangeRateDate | string): number;
  hasWorkingDaysBetween(start: ExchangeRateDate | string, end: ExchangeRateDate | string): boolean;
}

/**
 * Конфигурация для котировок ЦБ РФ: вт-сб рабочие, вс-пн выходные
 * ЦБ РФ публикует котировки во вторник-суббота
 */
export const STANDARD_WORKING_DAYS_CONFIG: IWorkingDaysConfig = {
  workingDays: [
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
    WeekDay.SATURDAY
  ],
  holidays: []
};

/**
 * Реализация сервиса рабочих дней
 */
export class WorkingDaysService implements IWorkingDaysService {
  private config: IWorkingDaysConfig;

  constructor(config: IWorkingDaysConfig = STANDARD_WORKING_DAYS_CONFIG) {
    this.config = config;
  }

  /**
   * Проверяет, является ли день рабочим
   */
  isWorkingDay(date: ExchangeRateDate | string | Date): boolean {
    const exchangeDate = this.normalizeDate(date);
    const jsDate = exchangeDate.toDate();
    const dayOfWeek = jsDate.getDay() as WeekDay;
    
    // Проверяем, что день входит в рабочие дни
    if (!this.config.workingDays.includes(dayOfWeek)) {
      return false;
    }
    
    // Проверяем, что день не является праздником
    if (this.config.holidays.includes(exchangeDate.value)) {
      return false;
    }
    
    return true;
  }

  /**
   * Находит следующий рабочий день
   */
  getNextWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    let current = this.normalizeDate(date).addDays(1);
    let attempts = 0;
    
    while (!this.isWorkingDay(current) && attempts < 14) { // Защита от бесконечного цикла
      current = current.addDays(1);
      attempts++;
    }
    
    if (attempts >= 14) {
      throw new Error('Could not find next working day within 2 weeks');
    }
    
    return current;
  }

  /**
   * Находит предыдущий рабочий день
   */
  getPreviousWorkingDay(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    let current = this.normalizeDate(date).subtractDays(1);
    let attempts = 0;
    
    while (!this.isWorkingDay(current) && attempts < 14) { // Защита от бесконечного цикла
      current = current.subtractDays(1);
      attempts++;
    }
    
    if (attempts >= 14) {
      throw new Error('Could not find previous working day within 2 weeks');
    }
    
    return current;
  }

  /**
   * Находит последний рабочий день (от сегодня или раньше)
   */
  getLastWorkingDay(): ExchangeRateDate {
    const today = ExchangeRateDates.today();
    
    if (this.isWorkingDay(today)) {
      return today;
    }
    
    return this.getPreviousWorkingDay(today);
  }

  /**
   * Получает все рабочие дни в диапазоне (включительно)
   */
  getWorkingDaysInRange(start: ExchangeRateDate | string, end: ExchangeRateDate | string): ExchangeRateDate[] {
    const startDate = this.normalizeDate(start);
    const endDate = this.normalizeDate(end);
    
    if (startDate.isAfter(endDate)) {
      throw new Error('Start date must be before or equal to end date');
    }
    
    const allDates = ExchangeRateDates.range(startDate, endDate);
    return allDates.filter(date => this.isWorkingDay(date));
  }

  /**
   * Подсчитывает количество рабочих дней в диапазоне (включительно)
   */
  countWorkingDays(start: ExchangeRateDate | string, end: ExchangeRateDate | string): number {
    return this.getWorkingDaysInRange(start, end).length;
  }

  /**
   * Проверяет, есть ли рабочие дни между двумя датами (исключительно)
   */
  hasWorkingDaysBetween(start: ExchangeRateDate | string, end: ExchangeRateDate | string): boolean {
    const startDate = this.normalizeDate(start);
    const endDate = this.normalizeDate(end);
    
    if (startDate.isAfter(endDate)) {
      return false;
    }
    
    // Проверяем дни между start и end (не включая сами start и end)
    let current = startDate.addDays(1);
    
    while (current.isBefore(endDate)) {
      if (this.isWorkingDay(current)) {
        return true;
      }
      current = current.addDays(1);
    }
    
    return false;
  }

  /**
   * Обновляет конфигурацию рабочих дней
   */
  updateConfig(config: Partial<IWorkingDaysConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получает текущую конфигурацию
   */
  getConfig(): IWorkingDaysConfig {
    return { ...this.config };
  }

  /**
   * Добавляет праздник
   */
  addHoliday(date: ExchangeRateDate | string): void {
    const holidayDate = this.normalizeDate(date);
    if (!this.config.holidays.includes(holidayDate.value)) {
      this.config.holidays.push(holidayDate.value);
    }
  }

  /**
   * Удаляет праздник
   */
  removeHoliday(date: ExchangeRateDate | string): void {
    const holidayDate = this.normalizeDate(date);
    this.config.holidays = this.config.holidays.filter(h => h !== holidayDate.value);
  }

  /**
   * Получает отладочную информацию о дне
   */
  getDebugInfo(date: ExchangeRateDate | string | Date): object {
    const exchangeDate = this.normalizeDate(date);
    const jsDate = exchangeDate.toDate();
    const dayOfWeek = jsDate.getDay() as WeekDay;
    const dayNames = ['ВОСКР(❌)', 'ПОНЕД(❌)', 'ВТОРН(✅)', 'СРЕДА(✅)', 'ЧЕТВ(✅)', 'ПЯТН(✅)', 'СУББ(✅)'];
    
    return {
      date: exchangeDate.value,
      dayOfWeek: dayOfWeek,
      dayName: dayNames[dayOfWeek],
      isInWorkingDays: this.config.workingDays.includes(dayOfWeek),
      isHoliday: this.config.holidays.includes(exchangeDate.value),
      isWorkingDay: this.isWorkingDay(exchangeDate),
      workingDaysConfig: this.config.workingDays.map(day => dayNames[day]),
      note: 'ЦБ РФ: Выходные ВС+ПН, Рабочие ВТ-СБ'
    };
  }

  /**
   * Приводит любой формат даты к ExchangeRateDate
   */
  private normalizeDate(date: ExchangeRateDate | string | Date): ExchangeRateDate {
    if (date instanceof ExchangeRateDate) {
      return date;
    }
    
    return new ExchangeRateDate(date);
  }
}

/**
 * Синглтон сервиса рабочих дней с стандартной конфигурацией
 */
export const workingDaysService = new WorkingDaysService(STANDARD_WORKING_DAYS_CONFIG);

/**
 * Хук для использования в React компонентах
 */
export const useWorkingDays = (): IWorkingDaysService => {
  return workingDaysService;
};

/**
 * Вспомогательные функции для обратной совместимости
 */

/**
 * @deprecated Используйте workingDaysService.isWorkingDay()
 * Проверяет рабочий день по логике ЦБ РФ (вт-сб рабочие, вс-пн выходные)
 */
export function isWorkingDay(date: Date): boolean {
  return workingDaysService.isWorkingDay(date);
}

/**
 * @deprecated Используйте workingDaysService.getLastWorkingDay()
 * Получает последний рабочий день по логике ЦБ РФ
 */
export function getLastWorkingDay(): Date {
  return workingDaysService.getLastWorkingDay().toDate();
}

/**
 * @deprecated Используйте workingDaysService.countWorkingDays()
 * Считает рабочие дни по логике ЦБ РФ (вт-сб рабочие)
 */
export function getWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
  const start = new ExchangeRateDate(startDate);
  const end = new ExchangeRateDate(endDate);
  return workingDaysService.countWorkingDays(start, end);
}
