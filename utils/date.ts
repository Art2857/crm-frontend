/**
 * Утилиты для работы с датами
 * Реализация следует принципам DRY (Don't Repeat Yourself) и SOLID
 */

/**
 * Константы для форматирования дат
 */
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  RU_DATE: 'DD.MM.YYYY',
  RU_DATE_TIME: 'DD.MM.YYYY HH:mm',
};

/**
 * Локали для форматирования дат
 */
const LOCALES = {
  RU: 'ru-RU',
};

/**
 * Конвертирует строку или объект Date в объект Date
 * @param date Строка с датой или объект Date
 * @returns Объект Date или null если передано невалидное значение
 */
export const toDateObject = (
  date: string | Date | null | undefined
): Date | null => {
  if (!date) return null;

  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }

  try {
    // Проверяем, является ли строка датой в российском формате DD.MM.YYYY
    if (typeof date === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      console.log('🗓️ Обнаружен российский формат даты:', date);

      // Парсим российскую дату напрямую
      const parts = date.split('.');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Месяцы в JavaScript начинаются с 0
      const year = parseInt(parts[2], 10);

      const russianDate = new Date(year, month, day);

      // Проверяем валидность даты
      if (
        russianDate.getFullYear() === year &&
        russianDate.getMonth() === month &&
        russianDate.getDate() === day
      ) {
        console.log('🗓️ Результат парсинга российской даты:', russianDate);
        return russianDate;
      } else {
        console.error('🗓️ Невалидная российская дата:', date);
        return null;
      }
    }

    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  } catch (e) {
    console.error('Invalid date format', e);
    return null;
  }
};

/**
 * Форматирует дату в формат 'YYYY-MM-DD'
 * @param date Дата для форматирования
 * @returns Строка с датой в формате ISO или пустая строка, если дата невалидна
 */
export const formatDateToISO = (
  date: Date | string | null | undefined
): string => {
  const dateObj = toDateObject(date);
  if (!dateObj) return '';

  // Гарантируем «дату без времени» независимо от TZ браузера
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Возвращает текущую дату в формате 'YYYY-MM-DD'
 * @returns Текущая дата в формате ISO
 */
export const getCurrentDateISO = (): string => {
  return formatDateToISO(new Date());
};

// Кэш для хранения отформатированных дат
interface DateFormatCache {
  withTime: Record<string, string>;
  withoutTime: Record<string, string>;
}

// Создаем простой кэш для хранения результатов форматирования дат
const dateFormatCache: DateFormatCache = {
  withTime: {}, // кэш для дат с временем
  withoutTime: {}, // кэш для дат без времени
};

// Максимальный размер кэша
const MAX_CACHE_SIZE = 500;

/**
 * Очищает кэш, если он превысил максимальный размер
 * @param cache Объект с кэшем для очистки
 */
const cleanupCacheIfNeeded = (cache: Record<string, string>): void => {
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_SIZE) {
    // Удаляем половину записей (самые старые)
    const keysToRemove = keys.slice(0, MAX_CACHE_SIZE / 2);
    keysToRemove.forEach((key) => {
      delete cache[key];
    });
  }
};

/**
 * Форматирует дату для отображения пользователю в локальном формате
 * @param dateString Строка с датой или объект Date
 * @param includeTime Нужно ли включать время
 * @returns Отформатированная строка с датой
 */
export const formatDateForDisplay = (
  dateString: string | Date | null | undefined,
  includeTime: boolean = false
): string => {
  if (!dateString) return '';

  // Нормализуем строку с датой для использования в качестве ключа кэша
  let normalizedKey: string;
  try {
    if (typeof dateString === 'string') {
      normalizedKey = dateString;
    } else if (dateString instanceof Date) {
      // Проверяем, что дата валидна перед вызовом toISOString
      if (isNaN(dateString.getTime())) {
        normalizedKey = 'invalid_date';
        // Завершаем функцию, так как дата невалидная
        return '';
      } else {
        normalizedKey = dateString.toISOString();
      }
    } else {
      normalizedKey = String(dateString);
    }
  } catch (error) {
    console.error('Ошибка при нормализации даты:', error);
    normalizedKey = 'error_' + String(dateString);
    // При ошибке возвращаем пустую строку вместо падения
    return '';
  }

  // Проверяем, есть ли результат в кэше
  const cacheKey = includeTime ? 'withTime' : 'withoutTime';
  if (dateFormatCache[cacheKey][normalizedKey]) {
    return dateFormatCache[cacheKey][normalizedKey];
  }

  // Если нет в кэше, преобразуем в объект Date
  const dateObj = toDateObject(dateString);
  if (!dateObj) return '';

  let result: string;

  // Форматируем дату
  try {
    if (includeTime) {
      result = dateObj.toLocaleString(LOCALES.RU, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      result = dateObj.toLocaleDateString(LOCALES.RU);
    }
  } catch (error) {
    console.error('Ошибка при форматировании даты:', error);
    return '';
  }

  // Очищаем кэш, если он слишком большой
  cleanupCacheIfNeeded(dateFormatCache[cacheKey]);

  // Сохраняем в кэш
  dateFormatCache[cacheKey][normalizedKey] = result;

  return result;
};

/**
 * Проверяет строку на соответствие формату DD.MM.YYYY
 * @param dateString Строка с датой для проверки
 * @returns true если дата в формате DD.MM.YYYY и является валидной, иначе false
 */
export const isValidRussianDateFormat = (dateString: string): boolean => {
  if (!dateString) return true; // Пустая строка считается валидной (если нет требования обязательности)

  // Проверка формата DD.MM.YYYY
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
    return false;
  }

  // Разбивка на компоненты
  const parts = dateString.split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Месяцы в JavaScript начинаются с 0
  const year = parseInt(parts[2], 10);

  // Создание и валидация объекта Date
  const date = new Date(year, month, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
};

/**
 * Конвертирует дату из формата DD.MM.YYYY в объект Date
 * @param dateString Строка с датой в формате DD.MM.YYYY
 * @returns Объект Date или null если передано невалидное значение
 */
export const russianDateToDate = (dateString: string): Date | null => {
  if (!dateString || !isValidRussianDateFormat(dateString)) {
    return null;
  }

  const parts = dateString.split('.');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Месяцы в JavaScript начинаются с 0
  const year = parseInt(parts[2], 10);

  return new Date(year, month, day);
};

export const formatedDateToDateObject = (date: string): Date =>
  typeof date === 'string' && date.includes('.')
    ? new Date(date.split('.').reverse().join('-'))
    : new Date(date);
