import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../store';
import { useRouter } from 'next/navigation';
import { updateWork, fetchWorkById } from '../store/slices/works';
import { UpdateWorkDto } from '../types/work';
import { useNotification } from '../contexts/NotificationContext';
import { useErrorHandler } from './useErrorHandler';
import { Role } from '../types/user';

interface UseWorkDataParams {
  id: string;
  initialData?: {
    name: string;
    responsibleUserId: string;
    salary: string | number;
    currency?: 'RUB' | 'USD';
    releaseDate?: string;
  };
  isAuthenticated: boolean;
  role: Role; // Добавляем параметр role
}

/**
 * Функция для глубокого сравнения объектов
 */
const isEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * Хук для управления данными работы
 */
export const useWorkData = ({
  id,
  initialData = {
    name: '',
    responsibleUserId: '',
    salary: '',
    releaseDate: '',
  },
  isAuthenticated,
  role,
}: UseWorkDataParams) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const { handleError } = useErrorHandler();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateWorkDto>(() => {
    const defaultData = {
      name: '',
      responsibleUserId: '',
      salary: '',
      currency: 'RUB' as const,
      releaseDate: '',
    };

    if (!initialData) return defaultData;

    return {
      ...defaultData,
      ...initialData,
      salary:
        typeof initialData.salary === 'number' ? initialData.salary.toString() : initialData.salary,
    };
  });

  // Используем ref для отслеживания, был ли уже инициализирован formData
  const initializedRef = useRef(false);

  // Обновляем formData всякий раз, когда приходят новые initialData
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const processedData: UpdateWorkDto = {
        name: initialData.name,
        responsibleUserId: initialData.responsibleUserId,
        salary:
          typeof initialData.salary === 'number'
            ? initialData.salary.toString()
            : initialData.salary,
        currency: initialData.currency || 'RUB',
        releaseDate: initialData.releaseDate || '',
      };

      setFormData(processedData);
    }
  }, [initialData]);

  // Отслеживаем режим редактирования для сброса флага инициализации
  useEffect(() => {
    initializedRef.current = isEditing;
  }, [isEditing]);

  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Обработчик изменения полей формы
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      const newData = { ...prev };

      switch (name) {
        case 'salary':
          newData.salary = String(value === '' ? 0 : Number(value));
          break;
        case 'currency':
          newData.currency = value === 'USD' ? 'USD' : 'RUB';
          break;
        case 'name':
          newData.name = value;
          break;
        case 'responsibleUserId':
          newData.responsibleUserId = value;
          break;
        case 'releaseDate':
          newData.releaseDate = value;
          break;
        default:
          if (type === 'number') {
            newData.salary = String(value === '' ? 0 : Number(value));
          }
      }

      return newData;
    });
  }, []);

  // Функция для принудительной перезагрузки данных работы
  const reload = useCallback(async () => {
    try {
      if (!id) return;
      setIsLoading(true);
      const updatedWorkData = await dispatch(fetchWorkById({ role, workId: id })).unwrap();
      setIsLoading(false);
      return updatedWorkData;
    } catch (error) {
      console.error('Ошибка при перезагрузке данных работы:', error);
      setIsLoading(false);
      showError(handleError(error).message);
    }

    return undefined;
  }, [id, role, dispatch, showError, handleError]);

  // Обработчик отправки формы
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        // Проверяем и обрабатываем данные перед отправкой
        const dataToSubmit = {
          ...formData,
        };

        const updatedWork = await dispatch(updateWork({ role, id, data: dataToSubmit })).unwrap();

        showSuccess('Работа успешно обновлена');
        setIsEditing(false);

        // Перезагружаем данные после обновления
        await reload();
      } catch (error) {
        console.error('Ошибка при обновлении работы:', error);
        showError(handleError(error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, id, role, dispatch, showSuccess, showError, handleError, reload],
  );

  return {
    // Состояние
    isEditing,
    isLoading,
    formData,

    // Методы
    setIsEditing,
    setFormData,
    handleChange,
    handleSubmit,
    reload,
  };
};
