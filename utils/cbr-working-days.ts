/**
 * Утилиты для рабочих дней ЦБ РФ в контексте КОТИРОВОК
 * Рабочие дни ЦБ РФ: вторник-суббота
 * 
 * Принципы: SOLID, DRY, KISS
 * Single Responsibility: только логика рабочих дней ЦБ РФ для котировок
 */

/**
 * Рабочие дни ЦБ РФ для котировок (вторник-суббота)
 */
const CBR_WORKING_DAYS = [2, 3, 4, 5, 6]; // вт-сб

/**
 * Проверяет, является ли день рабочим для ЦБ РФ
 * @param date Дата для проверки
 * @returns true если рабочий день ЦБ РФ (вт-сб)
 */
export function isCBRWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return CBR_WORKING_DAYS.includes(dayOfWeek);
}

/**
 * Возвращает количество рабочих дней ЦБ РФ в периоде (вт-сб)
 * @param startDate Начальная дата (включительно)
 * @param endDate Конечная дата (НЕ включительно)
 * @returns Количество рабочих дней ЦБ РФ в периоде
 */
export function getCBRWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
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
    if (isCBRWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Возвращает количество рабочих дней ЦБ РФ в месяце (вт-сб)
 * @param date Дата в месяце
 * @returns Количество рабочих дней ЦБ РФ в месяце
 */
export function getCBRWorkingDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return getCBRWorkingDaysInPeriod(firstDay, lastDay);
}

/**
 * Находит последний рабочий день ЦБ РФ (вт-сб)
 * @returns Последний рабочий день ЦБ РФ или сегодня
 */
export function getLastCBRWorkingDay(): Date {
  const today = new Date();
  
  if (isCBRWorkingDay(today)) {
    return today;
  }
  
  // Ищем предыдущий рабочий день ЦБ РФ
  const workingDay = new Date(today);
  for (let i = 1; i <= 7; i++) {
    workingDay.setDate(workingDay.getDate() - 1);
    if (isCBRWorkingDay(workingDay)) {
      return workingDay;
    }
  }
  
  throw new Error('Could not find CBR working day within last week');
}

/**
 * Находит следующий рабочий день ЦБ РФ (вт-сб)
 * @param date Исходная дата
 * @returns Следующий рабочий день ЦБ РФ
 */
export function getNextCBRWorkingDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  for (let i = 1; i <= 7; i++) {
    if (isCBRWorkingDay(nextDay)) {
      return nextDay;
    }
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  throw new Error('Could not find CBR working day within next week');
}

/**
 * Получает все рабочие дни ЦБ РФ в диапазоне
 * @param startDate Начальная дата
 * @param endDate Конечная дата (включительно)
 * @returns Массив рабочих дней ЦБ РФ
 */
export function getCBRWorkingDaysInRange(startDate: Date, endDate: Date): Date[] {
  const workingDays: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isCBRWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Проверяет, есть ли рабочие дни ЦБ РФ между датами
 * @param startDate Начальная дата
 * @param endDate Конечная дата
 * @returns true если есть рабочие дни ЦБ РФ между датами
 */
export function hasCBRWorkingDaysBetween(startDate: Date, endDate: Date): boolean {
  const nextDay = new Date(startDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (nextDay < endDate) {
    if (isCBRWorkingDay(nextDay)) {
      return true;
    }
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return false;
}

// Экспорт под общими именами для использования в котировках
// Эти функции должны использоваться ТОЛЬКО для котировок ЦБ РФ
export const isWorkingDay = isCBRWorkingDay;
export const getLastWorkingDay = getLastCBRWorkingDay;
export const getNextWorkingDay = getNextCBRWorkingDay;
