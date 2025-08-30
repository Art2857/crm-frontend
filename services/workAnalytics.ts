import { WorkAnalyticsResponse, WorkAnalytics } from '../types/workAnalytics';
import { privateApi } from './ApiClient';
import { WORKS_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';
import { Role } from '../types/user';

/**
 * Сервис для работы с аналитикой работ
 */
export const workAnalyticsService = {
  /**
   * Получить аналитику всех работ, сгруппированную по ответственному
   */
  getAnalytics: async (
    role: Role,
    archived = false
  ): Promise<WorkAnalyticsResponse> => {
    try {
      const endpoint = archived
        ? WORKS_ENDPOINTS.analyticsArchived(role)
        : WORKS_ENDPOINTS.analytics(role);

      const response = await privateApi.get<WorkAnalyticsResponse>(endpoint);
      return response.data;
    } catch (error) {
      logger.error('Error fetching work analytics:', error);
      throw error;
    }
  },

  /**
   * Получить аналитику работ конкретного пользователя
   */
  getAnalyticsForUser: async (
    role: Role,
    userId: string
  ): Promise<WorkAnalytics[]> => {
    try {
      const response = await privateApi.get<WorkAnalytics[]>(
        WORKS_ENDPOINTS.analyticsUser(role, userId)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching work analytics for user ${userId}:`, error);
      throw error;
    }
  },
};
