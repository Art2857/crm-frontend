import { useCallback, useContext } from 'react';
import { useNotification } from '../contexts/NotificationContext';

/**
 * Типы ошибок для категоризации
 */
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Структурированная ошибка с типом и сообщением
 */
export interface StructuredError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  details?: unknown;
  shouldDisplay: boolean;
}

/**
 * Функция для обработки ошибок
 */
export type ErrorHandler = (error: unknown) => StructuredError;

/**
 * Функция для отображения ошибок пользователю
 */
export type ErrorDisplayer = (error: StructuredError) => void;

/**
 * Хук для обработки ошибок запросов с категоризацией и опциональным автоматическим отображением
 * @param defaultMessage Сообщение по умолчанию, если ошибка не распознана
 * @param autoDisplay Флаг для автоматического отображения ошибок через уведомления
 */
export const useErrorHandler = (
  defaultMessage: string = 'Произошла ошибка при выполнении операции',
  autoDisplay: boolean = false,
): {
  handleError: ErrorHandler;
  displayError: ErrorDisplayer;
} => {
  const notification = useNotification();

  /**
   * Определяет тип ошибки на основе её содержимого
   */
  const determineErrorType = useCallback((error: unknown): ErrorType => {
    // Ошибки сети
    if (error instanceof TypeError && error.message.includes('Network')) {
      return ErrorType.NETWORK;
    }

    // Обработка HTTP ошибок по статус-кодам
    if (typeof error === 'object' && error !== null) {
      // Проверка на наличие статус-кода
      if ('status' in error) {
        const status = (error as { status: number }).status;
        if (status === 401) return ErrorType.AUTHENTICATION;
        if (status === 403) return ErrorType.AUTHORIZATION;
        if (status === 404) return ErrorType.NOT_FOUND;
        if (status >= 400 && status < 500) return ErrorType.VALIDATION;
        if (status >= 500) return ErrorType.SERVER;
      }

      // Проверка наличия признаков валидационной ошибки
      if ('validationErrors' in error || 'validation' in error) {
        return ErrorType.VALIDATION;
      }
    }

    return ErrorType.UNKNOWN;
  }, []);

  /**
   * Извлекает сообщение из ошибки в зависимости от её структуры
   */
  const extractErrorMessage = useCallback(
    (error: unknown, errorType: ErrorType): string => {
      // Если ошибка - строка, возвращаем её
      if (typeof error === 'string') {
        return error;
      }

      // Если ошибка - стандартный объект Error, возвращаем сообщение
      if (error instanceof Error) {
        return error.message;
      }

      // Обработка ошибок в виде объектов с различными форматами
      if (typeof error === 'object' && error !== null) {
        // Случай со свойством message
        if ('message' in error) {
          const errorWithMessage = error as { message: unknown };
          if (typeof errorWithMessage.message === 'string') {
            return errorWithMessage.message;
          }
        }

        // Случай с вложенными ошибками
        if ('error' in error) {
          const errorWithError = error as { error: unknown };
          if (typeof errorWithError.error === 'string') {
            return errorWithError.error;
          }

          // Рекурсивно извлекаем сообщение из вложенной ошибки
          if (typeof errorWithError.error === 'object' && errorWithError.error !== null) {
            return extractErrorMessage(errorWithError.error, errorType);
          }
        }

        // Проверка на наличие statusText
        if ('statusText' in error) {
          const errorWithStatusText = error as { statusText: unknown };
          if (typeof errorWithStatusText.statusText === 'string') {
            return errorWithStatusText.statusText;
          }
        }

        // Проверка на валидационные ошибки
        if ('validationErrors' in error) {
          const validationError = error as {
            validationErrors: Record<string, string[]>;
          };
          // Объединяем все сообщения об ошибках
          const allErrors: string[] = [];
          const processedErrors = new Set<string>(); // Для отслеживания уникальных ошибок

          for (const field in validationError.validationErrors) {
            const fieldErrors = validationError.validationErrors[field];
            // Добавляем только уникальные сообщения
            for (const errMsg of fieldErrors) {
              const fullError = `${field}: ${errMsg}`;
              if (!processedErrors.has(fullError)) {
                processedErrors.add(fullError);
                allErrors.push(fullError);
              }
            }
          }

          if (allErrors.length > 0) {
            return allErrors.join('. ');
          }
        }
      }

      // Возвращаем дефолтное сообщение в зависимости от типа ошибки
      switch (errorType) {
        case ErrorType.NETWORK:
          return 'Не удалось подключиться к серверу. Проверьте подключение к интернету.';
        case ErrorType.AUTHENTICATION:
          return 'Требуется авторизация. Войдите в систему.';
        case ErrorType.AUTHORIZATION:
          return 'У вас нет доступа к этому ресурсу.';
        case ErrorType.NOT_FOUND:
          return 'Запрашиваемый ресурс не найден.';
        case ErrorType.VALIDATION:
          return 'Проверьте правильность введенных данных.';
        case ErrorType.SERVER:
          return 'Произошла ошибка на сервере. Попробуйте позже.';
        default:
          return defaultMessage;
      }
    },
    [defaultMessage],
  );

  /**
   * Отображает структурированную ошибку пользователю
   */
  const displayError = useCallback(
    (structuredError: StructuredError): void => {
      if (structuredError.shouldDisplay && structuredError.message) {
        notification.showError(structuredError.message);
      }
    },
    [notification],
  );

  /**
   * Основная функция обработки ошибок с категоризацией
   */
  const handleError = useCallback(
    (error: unknown): StructuredError => {
      // Игнорируем отмененные запросы - не показываем их пользователю
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        console.log('Игнорируем отмененный запрос в обработчике ошибок');
        return {
          message: '', // Пустое сообщение для отмененных запросов
          type: ErrorType.UNKNOWN,
          details: null,
          shouldDisplay: false, // Флаг что ошибку не нужно показывать
        };
      }

      const errorType = determineErrorType(error);
      const message = extractErrorMessage(error, errorType);

      const structuredError: StructuredError = {
        message,
        type: errorType,
        details: error,
        shouldDisplay: true,
      };

      // Автоматически отображаем ошибку, если включено
      if (autoDisplay) {
        displayError(structuredError);
      }

      return structuredError;
    },
    [determineErrorType, extractErrorMessage, autoDisplay, displayError],
  );

  return {
    handleError,
    displayError,
  };
};
