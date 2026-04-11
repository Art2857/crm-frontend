import { useState, useCallback, useEffect, useRef } from 'react';
import { useErrorHandler, ErrorType, StructuredError } from './useErrorHandler';

/**
 * Параметры для хука загрузки данных
 */
interface UseDataLoaderParams<T> {
  /**
   * Функция для загрузки данных
   */
  loadData: () => Promise<T>;

  /**
   * Зависимости для повторной загрузки данных
   */
  dependencies?: any[];

  /**
   * Начальное значение данных
   */
  initialData?: T | null;

  /**
   * Флаг для отключения автоматической загрузки при монтировании
   */
  skipInitialLoad?: boolean;

  /**
   * Автоматически отображать ошибки через систему уведомлений
   */
  autoDisplayErrors?: boolean;
}

/**
 * Результат выполнения хука загрузки данных
 */
interface UseDataLoaderResult<T> {
  /**
   * Загруженные данные
   */
  data: T | null;

  /**
   * Флаг загрузки
   */
  isLoading: boolean;

  /**
   * Сообщение об ошибке
   */
  error: string | null;

  /**
   * Структурированная информация об ошибке
   */
  errorInfo: StructuredError | null;

  /**
   * Функция для повторной загрузки данных
   */
  reload: () => Promise<T | null>;

  /**
   * Функция для ручной установки данных
   */
  setData: React.Dispatch<React.SetStateAction<T | null>>;

  /**
   * Функция для очистки ошибки
   */
  clearError: () => void;
}

/**
 * Хук для загрузки данных с обработкой ошибок и состояний загрузки
 *
 * @example
 * const {
 *   data: users,
 *   isLoading,
 *   error,
 *   reload
 * } = useDataLoader({
 *   loadData: () => api.getUsers(),
 *   dependencies: [searchQuery]
 * });
 */
export const useDataLoader = <T>({
  loadData,
  dependencies = [],
  initialData = null,
  skipInitialLoad = false,
  autoDisplayErrors = false,
}: UseDataLoaderParams<T>): UseDataLoaderResult<T> => {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(!skipInitialLoad);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<StructuredError | null>(null);

  // Используем улучшенный обработчик ошибок
  const { handleError } = useErrorHandler(
    'Произошла ошибка при загрузке данных',
    autoDisplayErrors,
  );

  // Используем рефы для отслеживания состояния компонента
  const isMountedRef = useRef(true);
  const shouldLoadRef = useRef(!skipInitialLoad);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Очищает сообщение об ошибке
   */
  const clearError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  /**
   * Основная функция загрузки данных
   */
  const fetchDataInternal = useCallback(
    async (isReload = false): Promise<T | null> => {
      // Отменяем предыдущий запрос, если он был
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Создаем новый контроллер для отмены
      abortControllerRef.current = new AbortController();

      if (!isMountedRef.current) return null;

      setIsLoading(true);
      clearError();

      try {
        const result = await loadData();

        if (isMountedRef.current) {
          setData(result);
          setIsLoading(false);
          return result;
        }
        return null;
      } catch (err) {
        // Игнорируем ошибки отмены запроса
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }

        // Обрабатываем ошибку используя структурированный обработчик
        if (isMountedRef.current) {
          const structuredError = handleError(err);
          setErrorInfo(structuredError);

          setError(structuredError.message);

          setIsLoading(false);
          setData(null);
        }
        return null;
      }
    },
    [loadData, handleError, clearError],
  );

  /**
   * Инициирует принудительную перезагрузку данных
   */
  const reload = useCallback(async (): Promise<T | null> => {
    return fetchDataInternal(true);
  }, [fetchDataInternal]);

  // Загружаем данные при монтировании компонента или изменении зависимостей
  useEffect(() => {
    isMountedRef.current = true;

    if (shouldLoadRef.current) {
      shouldLoadRef.current = false;
      fetchDataInternal();
    }

    // Очистка при размонтировании
    return () => {
      isMountedRef.current = false;

      // Отменяем запрос при размонтировании
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipInitialLoad, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    errorInfo,
    reload,
    setData,
    clearError,
  };
};
