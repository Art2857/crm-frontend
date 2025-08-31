import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchDistributionsByWorkId,
  createDistribution,
  clearWorkDistributions,
} from '../store/slices/duties';
import { DistributionWithDetails } from '../types/duty';
import { workService } from '../services/work';
import { Role } from '../types/user';

interface UseWorkDutiesProps {
  workId: string;
  workSalary?: string; // Обновляем тип на string
  role: Role; // Добавляем параметр role
}

export const useWorkDuties = ({
  workId,
  workSalary,
  role,
}: UseWorkDutiesProps) => {
  const dispatch = useAppDispatch();
  const {
    workDistributions,
    isLoading: storeLoading,
    error: storeError,
  } = useAppSelector((state) => state.duties);
  const [isEditingDuties, setIsEditingDuties] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Флаг для отслеживания, была ли выполнена начальная загрузка данных
  const [isInitiallyLoaded, setIsInitiallyLoaded] = useState(false);

  // Используем ref для хранения предыдущего workId и workSalary
  const prevWorkIdRef = useRef<string | null>(null);
  const prevWorkSalaryRef = useRef<string | undefined>(undefined);
  // Счетчик загрузок
  const loadCountRef = useRef(0);
  // Флаг, указывающий что загрузка активна
  const isLoadingRef = useRef(false);

  // Обновляем локальное состояние ошибки, когда меняется ошибка в store
  useEffect(() => {
    if (storeError) {
      setErrorMessage(storeError);
    }
  }, [storeError]);

  // Загрузка распределений обязанностей для работы
  const loadDistributions = useCallback(async () => {
    if (!workId || !role || isLoadingRef.current) {
      return null;
    }

    try {
      loadCountRef.current += 1;
      setIsLoading(true);
      isLoadingRef.current = true;

      // Сначала очищаем текущие распределения, чтобы избежать отображения устаревших данных
      dispatch(clearWorkDistributions());

      // Выполняем запрос
      try {
        const result = await dispatch(
          fetchDistributionsByWorkId({ role, workId })
        ).unwrap();

        setIsInitiallyLoaded(true);
        return result;
      } catch (error) {
        console.error('Ошибка при запросе распределений:', error);
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при загрузке распределений:', error);
      setErrorMessage('Не удалось загрузить распределения обязанностей');
      return null;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [dispatch, workId, role]);

  // Выполняем начальную загрузку данных при монтировании или смене workId
  useEffect(() => {
    // Сброс состояния при смене работы
    if (prevWorkIdRef.current !== workId) {
      setIsInitiallyLoaded(false);

      // Очищаем текущие распределения
      dispatch(clearWorkDistributions());

      prevWorkIdRef.current = workId;
    }

    if (workId && !isInitiallyLoaded) {
      loadDistributions();
    }
  }, [workId, isInitiallyLoaded, loadDistributions, dispatch]);

  // Отслеживаем изменение зарплаты работы и перезагружаем распределения
  useEffect(() => {
    // Только если зарплата определена, изменилась после инициализации и не происходит другой загрузки
    if (
      workSalary !== undefined &&
      prevWorkSalaryRef.current !== undefined &&
      workSalary !== prevWorkSalaryRef.current &&
      isInitiallyLoaded &&
      !isEditingDuties &&
      !isLoadingRef.current
    ) {
      // Очищаем текущие распределения и перезагружаем
      dispatch(clearWorkDistributions());
      loadDistributions();
    }

    // Обновляем предыдущее значение зарплаты
    prevWorkSalaryRef.current = workSalary;
  }, [
    workSalary,
    isInitiallyLoaded,
    isEditingDuties,
    loadDistributions,
    dispatch,
  ]);

  // Загружаем новые данные при выходе из режима редактирования
  useEffect(() => {
    // Только если уже была начальная загрузка и мы вышли из режима редактирования
    if (
      workId &&
      !isEditingDuties &&
      isInitiallyLoaded &&
      !isLoadingRef.current
    ) {
      // Проверяем, произошло ли действительное изменение режима (был в режиме редактирования, теперь вышли)
      const isEditModeChanged = !isEditingDuties && !isLoadingRef.current;
      if (isEditModeChanged) {
        loadDistributions();
      }
    }
  }, [workId, isEditingDuties, isInitiallyLoaded, loadDistributions]);

  // Получаем последнее (текущее) распределение
  const getCurrentDistribution = useCallback(() => {
    if (!workDistributions || workDistributions.length === 0) return null;

    return [...workDistributions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [workDistributions]);

  // Создание или обновление распределения обязанностей
  const createDistributionWithDetails = useCallback(
    async (
      duties: Array<{
        dutyId: string;
        userId: string;
        price: string | null;
        percentage: string | null;
      }>,
      effectiveDate?: string,
      workHistoryId?: string
    ) => {
      if (!workId) return null;

      setIsLoading(true);
      clearMessages(); // Очищаем предыдущие сообщения

      try {
        // Фильтруем элементы без обязательных полей
        const validDuties = duties.filter((duty) => duty.dutyId && duty.userId);

        // Проверяем, есть ли уже текущее распределение
        const currentDistribution = getCurrentDistribution();

        // Если есть workHistoryId в параметрах, используем его, иначе берем из текущего распределения
        // или запрашиваем новый
        let historyId = workHistoryId;

        if (!historyId && currentDistribution) {
          // Если есть текущее распределение, используем его historyId для обновления
          historyId = currentDistribution.workHistory.id;
        } else if (!historyId) {
          try {
            // Получаем последнюю запись истории работы
            const latestHistory = await workService.getLatestWorkHistory(
              role,
              workId
            );
            historyId = latestHistory.id;
          } catch (error) {
            console.error('Ошибка при получении истории работы:', error);
            throw new Error('Не удалось получить историю работы');
          }
        }

        // Проверяем, что у нас есть действительный ID истории работы
        if (!historyId) {
          throw new Error('Не удалось определить ID истории работы');
        }

        // Всегда создаём новое распределение (POST), независимо от наличия предыдущих
        const result = await dispatch(
          createDistribution({
            role,
            workHistoryId: historyId,
            details: validDuties, // допускается [] для обнуления
            effectiveDate,
          })
        ).unwrap();

        // Обновляем список распределений для текущей работы
        await dispatch(fetchDistributionsByWorkId({ role, workId })).unwrap();

        setIsEditingDuties(false);
        setSuccessMessage('Распределение обязанностей успешно сохранено');

        return result;
      } catch (error: any) {
        console.error('Ошибка при обработке распределения:', error);

        // Улучшенная обработка ошибок
        let errorMsg = 'Не удалось обновить распределение обязанностей';

        if (error.formattedMessage) {
          // Если есть отформатированное сообщение, используем его
          errorMsg = error.formattedMessage;
        } else if (error.message) {
          // Проверяем, есть ли структурированные ошибки валидации
          if (
            error.validationErrors &&
            error.errorMessages &&
            error.errorMessages.length > 0
          ) {
            // Используем первое сообщение из массива
            errorMsg = error.errorMessages[0];
          } else if (
            error.details &&
            Array.isArray(error.details) &&
            error.details.length > 0
          ) {
            // Если есть детализированные сообщения об ошибках
            errorMsg = error.details.join('\n');
          } else {
            // Просто используем сообщение ошибки
            errorMsg = error.message;
          }
        }

        setErrorMessage(errorMsg);



        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, workId, role, getCurrentDistribution]
  );

  // Очистка сообщений
  const clearMessages = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  // Явно перезагружаем данные распределений
  const forceReload = useCallback(() => {
    dispatch(clearWorkDistributions());
    return loadDistributions();
  }, [dispatch, workId, loadDistributions]);

  return {
    distributions: workDistributions || [],
    isEditingDuties,
    isLoading: isLoading || storeLoading,
    successMessage,
    errorMessage,
    setIsEditingDuties,
    loadDistributions,
    createDistribution: createDistributionWithDetails,
    clearMessages,
    forceReload,
  };
};
