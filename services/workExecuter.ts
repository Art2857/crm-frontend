import { privateApi } from './ApiClient';
import { WORKS_ENDPOINTS } from './endpoints';
import { User } from '../types/user';
import { logger } from '../utils/logger';

// Сервис для работы с исполнителями работ
export const workExecuterService = {
  /** Получить пользователей, прикреплённых к работе */
  getByWorkId: async (workId: string): Promise<User[]> => {
    try {
      const response = await privateApi.get<User[]>(WORKS_ENDPOINTS.executers(workId));
      return response.data;
    } catch (error) {
      logger.error(`Error fetching executers for work ${workId}`, error);
      throw error;
    }
  },
};
