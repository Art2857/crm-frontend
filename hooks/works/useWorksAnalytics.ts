import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../../store';
import { workAnalyticsService } from '../../services/workAnalytics';
import { WorkAnalyticsResponse } from '../../types/workAnalytics';
import { logger } from '../../utils/logger';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Хук для работы с аналитикой работ
 */
export function useWorksAnalytics(showArchived = false) {
  const [data, setData] = useState<WorkAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);
  const notification = useNotification();

  /**
   * Загружает аналитические данные
   */
  const loadAnalytics = useCallback(
    async (archived = false) => {
      if (!user?.role) {
        setError('Пользователь не аутентифицирован');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        logger.debug(`Загружаем аналитику работ (архив: ${archived})...`);
        const analyticsData = await workAnalyticsService.getAnalytics(archived);
        setData(analyticsData);
        logger.debug('Аналитика работ загружена успешно');
      } catch (err) {
        const errorMessage = 'Не удалось загрузить аналитику работ';
        logger.error(errorMessage, err);
        setError(errorMessage);
        // Убираем notification из зависимостей, чтобы избежать бесконечных перерендеров
        try {
          notification.showError(errorMessage);
        } catch (notifErr) {
          logger.warn('Не удалось показать уведомление об ошибке:', notifErr);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.role],
  ); // Убираем notification из зависимостей

  /**
   * Обновляет данные
   */
  const refresh = useCallback(
    (archived = false) => {
      return loadAnalytics(archived);
    },
    [loadAnalytics],
  );

  // Автоматическая загрузка при монтировании компонента
  useEffect(() => {
    if (user?.role) {
      loadAnalytics(showArchived);
    }
  }, [user?.role, showArchived, loadAnalytics]); // Зависимость от роли пользователя и архивного статуса

  return {
    data,
    isLoading,
    error,
    refresh,
    // Вычисленные значения для удобства
    grouped: data?.grouped || [],
    grandTotals: data?.grandTotals || {
      totalSalary: 0,
      totalExpenses: 0,
      totalIncome: 0,
      worksCount: 0,
      responsibleCount: 0,
    },
    isEmpty: !data || data.grouped.length === 0,
  };
}
