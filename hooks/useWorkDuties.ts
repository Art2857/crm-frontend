import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchDistributionsByWorkId, 
  createDistribution, 
  clearWorkDistributions 
} from '../store/slices/duties';
import { DistributionWithDetails } from '../types/duty';
import { workService } from '../services/work';

interface UseWorkDutiesProps {
  workId: string;
  workSalary?: string; // Обновляем тип на string
}

export const useWorkDuties = ({ workId, workSalary }: UseWorkDutiesProps) => {
  const dispatch = useAppDispatch();
  const { workDistributions, isLoading: storeLoading, error: storeError } = useAppSelector((state) => state.duties);
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
    if (!workId || isLoadingRef.current) return null;

    try {
      loadCountRef.current += 1;
      const loadId = loadCountRef.current;
      console.log(`🔄 [${loadId}] Начинаем загрузку распределений для работы ID=${workId}, зарплата=${workSalary}`);
      setIsLoading(true);
      isLoadingRef.current = true;
      
      // Сначала очищаем текущие распределения, чтобы избежать отображения устаревших данных
      dispatch(clearWorkDistributions());
      
      // Выполняем запрос
      try {
        const result = await dispatch(fetchDistributionsByWorkId(workId)).unwrap();
        console.log(`✅ [${loadId}] Загружены распределения для работы ID=${workId}:`, result);
        console.log('Количество записей:', result?.length || 0);
        
        setIsInitiallyLoaded(true);
        return result;
      } catch (error) {
        console.error('❌ Ошибка при запросе распределений:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке распределений:', error);
      setErrorMessage('Не удалось загрузить распределения обязанностей');
      return null;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [dispatch, workId]);

  // Выполняем начальную загрузку данных при монтировании или смене workId
  useEffect(() => {
    // Сброс состояния при смене работы
    if (prevWorkIdRef.current !== workId) {
      console.log(`🔄 ID работы изменился: ${prevWorkIdRef.current} -> ${workId}`);
      setIsInitiallyLoaded(false);
      
      // Очищаем текущие распределения
      dispatch(clearWorkDistributions());
      
      prevWorkIdRef.current = workId;
    }
    
    if (workId && !isInitiallyLoaded) {
      console.log('🔄 Выполняем начальную загрузку распределений для работы ID:', workId);
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
      console.log('🔔 Зарплата работы изменилась:', 
        prevWorkSalaryRef.current, '->', workSalary,
        'isInitiallyLoaded:', isInitiallyLoaded);
          
      // Очищаем текущие распределения и перезагружаем
      console.log('🔄 Перезагружаем распределения из-за изменения зарплаты');
      dispatch(clearWorkDistributions());
      loadDistributions();
    }
    
    // Обновляем предыдущее значение зарплаты
    prevWorkSalaryRef.current = workSalary;
  }, [workSalary, isInitiallyLoaded, isEditingDuties, loadDistributions, dispatch]);

  // Загружаем новые данные при выходе из режима редактирования
  useEffect(() => {
    // Только если уже была начальная загрузка и мы вышли из режима редактирования
    if (workId && !isEditingDuties && isInitiallyLoaded && !isLoadingRef.current) {
      // Проверяем, произошло ли действительное изменение режима (был в режиме редактирования, теперь вышли)
      const isEditModeChanged = !isEditingDuties && !isLoadingRef.current;
      if (isEditModeChanged) {
        console.log('🔄 Перезагружаем распределения после выхода из режима редактирования');
        loadDistributions();
      }
    }
  }, [workId, isEditingDuties, isInitiallyLoaded, loadDistributions]);

  // Получаем последнее (текущее) распределение
  const getCurrentDistribution = useCallback(() => {
    if (!workDistributions || workDistributions.length === 0) return null;
    
    return [...workDistributions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [workDistributions]);

  // Создание или обновление распределения обязанностей
  const createDistributionWithDetails = useCallback(async (duties: Array<{
    dutyId: string;
    userId: string;
    price: string | null;
    percentage: string | null;
  }>, effectiveDate?: string, workHistoryId?: string) => {
    if (!workId || duties.length === 0) return null;
    
    setIsLoading(true);
    clearMessages(); // Очищаем предыдущие сообщения
    
    try {
      console.log('📝 Обрабатываем обязанности для работы ID:', workId);
      
      // Фильтруем элементы без обязательных полей
      const validDuties = duties.filter(duty => duty.dutyId && duty.userId);
      
      if (validDuties.length === 0) {
        throw new Error('Необходимо указать обязанность и ответственного для каждого элемента');
      }
      
      // Проверяем, есть ли уже текущее распределение
      const currentDistribution = getCurrentDistribution();
      
      // Если есть workHistoryId в параметрах, используем его, иначе берем из текущего распределения
      // или запрашиваем новый
      let historyId = workHistoryId;
      
      if (!historyId && currentDistribution) {
        // Если есть текущее распределение, используем его historyId для обновления
        historyId = currentDistribution.workHistory.id;
        console.log('✅ Используем существующую историю работы для обновления:', historyId);
      } else if (!historyId) {
        try {
          // Получаем последнюю запись истории работы
          const latestHistory = await workService.getLatestWorkHistory(workId);
          historyId = latestHistory.id;
          console.log('✅ Получена последняя запись истории работы:', latestHistory);
        } catch (error) {
          console.error('❌ Ошибка при получении истории работы:', error);
          throw new Error('Не удалось получить историю работы');
        }
      }
      
      // Проверяем, что у нас есть действительный ID истории работы
      if (!historyId) {
        throw new Error('Не удалось определить ID истории работы');
      }
      
      // Всегда создаём новое распределение (POST), независимо от наличия предыдущих
      let result;
      console.log('🔄 Создаем новое распределение для ID:', historyId);
      result = await dispatch(createDistribution({
        workHistoryId: historyId,
        details: validDuties,
        effectiveDate
      })).unwrap();
      console.log('✅ Распределение успешно создано:', result);
      
      // Обновляем список распределений для текущей работы
      await dispatch(fetchDistributionsByWorkId(workId)).unwrap();
      
      setIsEditingDuties(false);
      setSuccessMessage('Распределение обязанностей успешно сохранено');
      
      return result;
    } catch (error: any) {
      console.error('❌ Ошибка при обработке распределения:', error);
      
      // Улучшенная обработка ошибок
      let errorMsg = 'Не удалось обновить распределение обязанностей';
      
      if (error.formattedMessage) {
        // Если есть отформатированное сообщение, используем его
        errorMsg = error.formattedMessage;
      } else if (error.message) {
        // Проверяем, есть ли структурированные ошибки валидации
        if (error.validationErrors && error.errorMessages && error.errorMessages.length > 0) {
          // Используем первое сообщение из массива
          errorMsg = error.errorMessages[0];
        } else if (error.details && Array.isArray(error.details) && error.details.length > 0) {
          // Если есть детализированные сообщения об ошибках
          errorMsg = error.details.join('\n');
        } else {
          // Просто используем сообщение ошибки
          errorMsg = error.message;
        }
      }
      
      setErrorMessage(errorMsg);
      
      // Если есть дополнительные детали, логируем их отдельно
      if (error.details) {
        console.log('Детали ошибки:', error.details);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, workId, getCurrentDistribution]);

  // Очистка сообщений
  const clearMessages = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  // Явно перезагружаем данные распределений
  const forceReload = useCallback(() => {
    console.log('🔄 Принудительная перезагрузка распределений для работы ID:', workId);
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
    forceReload
  };
}; 