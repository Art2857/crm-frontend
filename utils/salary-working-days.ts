/**
 * Утилиты для рабочих дней в контексте ЗАРПЛАТЫ
 * Стандартные рабочие дни: понедельник-пятница
 * 
 * Принципы: SOLID, DRY, KISS
 * Single Responsibility: только логика рабочих дней для расчета зарплаты
 */

/**
 * Стандартные рабочие дни для расчета зарплаты (понедельник-пятница)
 */
const SALARY_WORKING_DAYS = [1, 2, 3, 4, 5]; // пн-пт

/**
 * Проверяет, является ли день рабочим для расчета зарплаты
 * @param date Дата для проверки
 * @returns true если рабочий день (пн-пт)
 */
export function isSalaryWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return SALARY_WORKING_DAYS.includes(dayOfWeek);
}

/**
 * Возвращает количество рабочих дней для зарплаты в периоде (пн-пт)
 * @param startDate Начальная дата (включительно)
 * @param endDate Конечная дата (НЕ включительно)
 * @returns Количество рабочих дней в периоде
 */
export function getSalaryWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
  if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return 0;
  }

  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate < endDate) {
    if (isSalaryWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Возвращает количество рабочих дней для зарплаты в месяце (пн-пт)
 * @param date Дата в месяце
 * @returns Количество рабочих дней в месяце
 */
export function getSalaryWorkingDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return getSalaryWorkingDaysInPeriod(firstDay, lastDay);
}

/**
 * Находит последний рабочий день для зарплаты (пн-пт)
 * @returns Последний рабочий день или сегодня
 */
export function getLastSalaryWorkingDay(): Date {
  const today = new Date();
  
  if (isSalaryWorkingDay(today)) {
    return today;
  }
  
  // Ищем предыдущий рабочий день
  const workingDay = new Date(today);
  for (let i = 1; i <= 7; i++) {
    workingDay.setDate(workingDay.getDate() - 1);
    if (isSalaryWorkingDay(workingDay)) {
      return workingDay;
    }
  }
  
  throw new Error('Could not find salary working day within last week');
}

/**
 * Находит следующий рабочий день для зарплаты (пн-пт)
 * @param date Исходная дата
 * @returns Следующий рабочий день
 */
export function getNextSalaryWorkingDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  for (let i = 1; i <= 7; i++) {
    if (isSalaryWorkingDay(nextDay)) {
      return nextDay;
    }
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  throw new Error('Could not find salary working day within next week');
}

/**
 * Получает все рабочие дни для зарплаты в диапазоне
 * @param startDate Начальная дата
 * @param endDate Конечная дата (включительно)
 * @returns Массив рабочих дней
 */
export function getSalaryWorkingDaysInRange(startDate: Date, endDate: Date): Date[] {
  const workingDays: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isSalaryWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

// Экспорт под старыми именами для обратной совместимости
// Эти функции должны использоваться ТОЛЬКО для расчета зарплаты
export const getWorkingDaysInPeriod = getSalaryWorkingDaysInPeriod;
export const getWorkingDaysInMonth = getSalaryWorkingDaysInMonth;
