import { privateApi } from './ApiClient';
import { User } from '../types/user';

// Сервис для работы с исполнителями работ
export const workExecuterService = {
  /** Получить пользователей, прикреплённых к работе */
  getByWorkId: async (workId: string): Promise<User[]> => {
    try {
      const response = await privateApi.get<User[]>(`/works/${workId}/executers`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching executers for work ${workId}`, error);
      throw error;
    }
  },
}; 