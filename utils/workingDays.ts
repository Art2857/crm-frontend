/**
 * Возвращает количество рабочих дней в периоде (исключая выходные - субботу и воскресенье)
 * @param startDate - Начальная дата
 * @param endDate - Конечная дата
 * @returns Количество рабочих дней в периоде
 */
export function getWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
  // Проверка валидности
  if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return 0;
  }

  let workingDays = 0;
  const currentDate = new Date(startDate);

  // Проходим по всем дням в периоде
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Считаем рабочими днями пн-пт (1-5), исключаем сб-вс (0,6)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }

    // Переходим к следующему дню
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Возвращает количество рабочих дней в месяце (использует getWorkingDaysInPeriod)
 * @param date - Дата в месяце
 * @returns Количество рабочих дней в месяце
 */
export function getWorkingDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Получаем первый день месяца
  const firstDay = new Date(year, month, 1);
  // Получаем последний день месяца
  const lastDay = new Date(year, month + 1, 0);

  return getWorkingDaysInPeriod(firstDay, lastDay);
}
