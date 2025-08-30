/**
 * Утилиты для работы с датами
 */

/**
 * Безопасное форматирование даты с проверкой валидности
 */
export const formatDateSafe = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = 'Неизвестно'
): string => {
  if (!date) {
    return fallback;
  }

  try {
    let validDate: Date;
    
    if (typeof date === 'string') {
      validDate = new Date(date);
    } else {
      validDate = date;
    }
    
    // Проверяем, что дата валидна
    if (isNaN(validDate.getTime())) {
      return fallback;
    }
    
    return new Intl.DateTimeFormat('ru-RU', options).format(validDate);
  } catch {
    return fallback;
  }
};

/**
 * Преобразование строковой даты в объект Date с проверкой валидности
 */
export const parseDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) {
    return null;
  }

  try {
    let parsedDate: Date;
    
    if (typeof date === 'string') {
      parsedDate = new Date(date);
    } else {
      parsedDate = date;
    }
    
    // Проверяем, что дата валидна
    if (isNaN(parsedDate.getTime())) {
      return null;
    }
    
    return parsedDate;
  } catch {
    return null;
  }
};

/**
 * Форматирование даты для отображения в интерфейсе
 */
export const formatDisplayDate = (date: Date | string | null | undefined): string => {
  return formatDateSafe(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Форматирование даты и времени для отображения в интерфейсе
 */
export const formatDisplayDateTime = (date: Date | string | null | undefined): string => {
  return formatDateSafe(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Проверка валидности даты
 */
export const isValidDate = (date: Date | string | null | undefined): boolean => {
  return parseDate(date) !== null;
};
