import { useState, useCallback, useEffect } from 'react';
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
    releaseDate?: string;
  };
  isAuthenticated: boolean;
}

/**
 * Хук для управления данными работы
 */
export const useWorkData = ({
  id,
  initialData = {
    name: '',
    responsibleUserId: '',
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
  const [formData, setFormData] = useState<UpdateWorkDto>(() => {
    const defaultData = {
      name: '',
      responsibleUserId: '',
      releaseDate: '',
    };

    if (!initialData) return defaultData;

    return {
      ...defaultData,
      ...initialData,
    };
  });

  // Обновляем formData всякий раз, когда приходят новые initialData
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const processedData: UpdateWorkDto = {
        name: initialData.name,
        responsibleUserId: initialData.responsibleUserId,
        releaseDate: initialData.releaseDate || '',
      };

      setFormData(processedData);
    }
  }, [initialData]);

  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Обработчик изменения полей формы
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const newData = { ...prev };

      switch (name) {
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
          break;
      }

      return newData;
    });
  }, []);

  // Функция для принудительной перезагрузки данных работы
  const reload = useCallback(async () => {
    try {
      if (!id) return;
      setIsLoading(true);
      const updatedWorkData = await dispatch(fetchWorkById({ workId: id })).unwrap();
      setIsLoading(false);
      return updatedWorkData;
    } catch (error) {
      console.error('Ошибка при перезагрузке данных работы:', error);
      setIsLoading(false);
      showError(handleError(error).message);
    }

    return undefined;
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

        await dispatch(updateWork({ id, data: dataToSubmit })).unwrap();

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
    [formData, id, dispatch, showSuccess, showError, handleError, reload],
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
