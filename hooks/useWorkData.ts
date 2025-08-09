import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../store';
import { useRouter } from 'next/navigation';
import { updateWork, fetchWorkById } from '../store/slices/works';
import { UpdateWorkDto } from '../types/work';
import { useNotification } from '../contexts/NotificationContext';
import { useErrorHandler } from './useErrorHandler';

interface UseWorkDataParams {
  id: string;
  initialData?: {
    name: string;
    responsibleUserId: string;
    salary: string;
    releaseDate?: string;
  };
  isAuthenticated: boolean;
}

/**
 * Функция для глубокого сравнения объектов
 */
const isEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
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
}: UseWorkDataParams) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const { handleError } = useErrorHandler();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateWorkDto>(initialData);

  // Используем ref для отслеживания, был ли уже инициализирован formData
  const initializedRef = useRef(false);

  // Обновляем форму при изменении initialData или включении режима редактирования
  useEffect(() => {
    // Инициализация данных формы если есть initialData
    if (initialData) {
      if (isEditing) {
        // При включении режима редактирования всегда обновляем данные
        const processedData = { ...initialData };

        // Обработка даты выхода - приводим к формату YYYY-MM-DD без учета TZ
        if (processedData.releaseDate) {
          const date = new Date(processedData.releaseDate);
          if (!isNaN(date.getTime())) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            processedData.releaseDate = `${y}-${m}-${d}`;
          } else {
            processedData.releaseDate = '';
          }
        }

        setFormData(processedData);
        initializedRef.current = true;
      } else {
        // Сбрасываем флаг инициализации при выключении режима редактирования
        initializedRef.current = false;
      }
    }
  }, [initialData, isEditing]);

  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Обработчик изменения полей формы
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      setFormData((prev) => {
        const newData = { ...prev };

        // Для числовых полей преобразуем значение к числу
        if (type === 'number' || name === 'salary') {
          newData[name] = value === '' ? 0 : Number(value);
        } else {
          newData[name] = value;
        }

        // Не логируем каждое изменение, только в особых случаях для отладки
        if (
          process.env.NODE_ENV !== 'production' &&
          name === 'responsibleUserId'
        ) {
          console.log('ResponsibleUserId updated:', newData[name]);
        }

        return newData;
      });
    },
    []
  );

  // Функция для принудительной перезагрузки данных работы
  const reload = useCallback(async () => {
    try {
      if (!id) return;
      console.log('🔄 Перезагрузка данных работы ID:', id);
      setIsLoading(true);
      const updatedWorkData = await dispatch(fetchWorkById(id)).unwrap();
      console.log('✅ Данные работы успешно обновлены:', updatedWorkData);
      setIsLoading(false);
      return updatedWorkData;
    } catch (error) {
      console.error('❌ Ошибка при перезагрузке данных работы:', error);
      setIsLoading(false);
      showError(handleError(error).message);
    }
  }, [id, dispatch, showError, handleError]);

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

        console.log('📝 Отправка данных работы:', dataToSubmit);

        const updatedWork = await dispatch(
          updateWork({ id, data: dataToSubmit })
        ).unwrap();
        console.log('✅ Работа успешно обновлена:', updatedWork);

        showSuccess('Работа успешно обновлена');
        setIsEditing(false);

        // Перезагружаем данные после обновления
        console.log('🔄 Запуск перезагрузки данных после обновления работы');
        await reload();
      } catch (error) {
        console.error('❌ Ошибка при обновлении работы:', error);
        showError(handleError(error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [formData, id, dispatch, showSuccess, showError, handleError, reload]
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
