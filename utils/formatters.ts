/**
 * Утилиты форматирования различных типов данных
 * Реализация следует принципам DRY (Don't Repeat Yourself) и SOLID
 */

// Импортируем необходимые типы и компоненты
import { WorkType, WorkPriority, WorkStatus } from '../types/work';
import { BadgeColor } from '../components/ui/Badge';

// Константы для форматирования
const DEFAULT_LOCALE = 'ru-RU';
const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
};
const DEFAULT_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE_FORMAT,
  hour: '2-digit',
  minute: '2-digit'
};

/**
 * Базовая функция форматирования с обработкой ошибок
 * @param formatter - функция форматирования
 * @param fallback - запасное значение
 * @returns отформатированное значение или запасное значение в случае ошибки
 */
function withErrorHandling<T, R>(
  formatter: () => R,
  fallback: R,
  errorMessage: string = 'Ошибка форматирования'
): R {
  try {
    return formatter();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return fallback;
  }
}

/**
 * Форматирует дату в локализованную строку
 * @param dateString - строка даты в формате ISO или объект Date
 * @param options - опции форматирования
 * @param includeTime - включать ли время в отформатированную дату
 * @returns отформатированная строка даты
 */
export const formatDate = (
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  includeTime: boolean = false
): string => {
  if (!dateString) return '-';
  
  const defaultOptions = includeTime ? DEFAULT_DATE_TIME_FORMAT : DEFAULT_DATE_FORMAT;
  const dateOptions = options ? { ...defaultOptions, ...options } : defaultOptions;
  
  return withErrorHandling(
    () => {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, dateOptions).format(date);
    },
    typeof dateString === 'string' ? dateString : dateString.toString(),
    'Ошибка при форматировании даты'
  );
};









// Интерфейс для меток статусов и типов
export interface Label {
  text: string;
  color: BadgeColor;
}

/**
 * Базовая функция для получения меток с защитой от неправильных значений
 * @param value - значение для отображения
 * @param mappings - карта соответствий значений и меток
 * @param defaultLabel - метка по умолчанию
 * @returns метка с текстом и цветом
 */
const getLabelFromMapping = <T extends string | number>(
  value: T | null | undefined,
  mappings: Record<string, Label>,
  defaultLabel: Label
): Label => {
  if (value === null || value === undefined) return defaultLabel;
  return mappings[value.toString()] || defaultLabel;
};

/**
 * Карта соответствий приоритетов работ
 */
const PRIORITY_LABELS: Record<string, Label> = {
  [WorkPriority.LOW]: { text: 'Низкий', color: 'blue' },
  [WorkPriority.MEDIUM]: { text: 'Средний', color: 'green' },
  [WorkPriority.HIGH]: { text: 'Высокий', color: 'orange' },
  [WorkPriority.CRITICAL]: { text: 'Критический', color: 'red' }
};

/**
 * Функция для отображения приоритета работы
 * @param priority - приоритет работы
 * @returns метка с текстом и цветом
 */
export const getPriorityLabel = (priority: WorkPriority | null | undefined): Label => {
  return getLabelFromMapping(
    priority,
    PRIORITY_LABELS,
    { text: 'Неизвестно', color: 'gray' }
  );
};

/**
 * Карта соответствий типов работ
 */
const TYPE_LABELS: Record<string, Label> = {
  [WorkType.BUG]: { text: 'Ошибка', color: 'red' },
  [WorkType.FEATURE]: { text: 'Функциональность', color: 'green' },
  [WorkType.TASK]: { text: 'Задача', color: 'blue' }
};

/**
 * Функция для отображения типа работы
 * @param type - тип работы
 * @returns метка с текстом и цветом
 */
export const getTypeLabel = (type: WorkType | null | undefined): Label => {
  return getLabelFromMapping(
    type,
    TYPE_LABELS,
    { text: 'Неизвестно', color: 'gray' }
  );
};

/**
 * Карта соответствий статусов работ
 */
const STATUS_LABELS: Record<string, Label> = {
  [WorkStatus.NEW]: { text: 'Новая', color: 'blue' },
  [WorkStatus.IN_PROGRESS]: { text: 'В работе', color: 'yellow' },
  [WorkStatus.TESTING]: { text: 'На тестировании', color: 'purple' },
  [WorkStatus.DONE]: { text: 'Завершена', color: 'green' },
  [WorkStatus.CANCELED]: { text: 'Отменена', color: 'red' }
};

/**
 * Функция для отображения статуса работы
 * @param status - статус работы
 * @returns метка с текстом и цветом
 */
export const getStatusLabel = (status: WorkStatus | null | undefined): Label => {
  return getLabelFromMapping(
    status,
    STATUS_LABELS,
    { text: 'Неизвестно', color: 'gray' }
  );
};