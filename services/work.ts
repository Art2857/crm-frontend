import { 
  Work, 
  CreateWorkDto, 
  UpdateWorkDto,
  WorkExtended,
  CreateWorkExtendedDto,
  UpdateWorkExtendedDto,
  WorkHistory,
  WorkWithHistory
} from '../types/work';
import { privateApi } from './ApiClient';

// Сервис для работы с работами
export const workService = {
  // Получить все работы
  getAll: async (): Promise<Work[]> => {
    try {
      const response = await privateApi.get<Work[]>('/works');
      return response.data;
    } catch (error) {
      console.error('Error fetching works:', error);
      throw error;
    }
  },

  // Получить работы по пользователю (где пользователь является ответственным)
  getByUserId: async (userId: string): Promise<Work[]> => {
    try {
      const response = await privateApi.get<Work[]>(`/works/responsible/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching works for user ${userId}:`, error);
      throw error;
    }
  },



  // Получить одну работу с историей
  getById: async (id: string): Promise<WorkWithHistory> => {
    try {
      const response = await privateApi.get<WorkWithHistory>(`/works/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching work with ID ${id}:`, error);
      throw error;
    }
  },

  // Создать новую работу
  create: async (data: CreateWorkDto): Promise<Work> => {
    try {
      const response = await privateApi.post<Work>('/works', data);
      return response.data;
    } catch (error) {
      console.error('Error creating work:', error);
      throw error;
    }
  },



  // Создать расширенную работу
  createExtended: async (data: CreateWorkExtendedDto): Promise<WorkExtended> => {
    try {
      const response = await privateApi.post<WorkExtended>('/works/extended', data);
      return response.data;
    } catch (error) {
      console.error('Error creating extended work:', error);
      throw error;
    }
  },



  // Получить историю работы (исправленный путь)
  getHistory: async (id: string): Promise<WorkHistory[]> => {
    try {
      const response = await privateApi.get<WorkHistory[]>(`/work-history/work/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching history for work ${id}:`, error);
      throw error;
    }
  },

  // Обновить работу
  update: async (id: string, data: UpdateWorkDto): Promise<WorkHistory> => {
    try {
      const response = await privateApi.patch<WorkHistory>(`/works/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating work ${id}:`, error);
      throw error;
    }
  },

  // Обновить расширенную работу
  updateExtended: async (id: string, data: UpdateWorkExtendedDto): Promise<WorkExtended> => {
    try {
      const response = await privateApi.patch<WorkExtended>(`/works/extended/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating extended work ${id}:`, error);
      throw error;
    }
  },

  // Получение последней записи истории работы
  getLatestWorkHistory: async (workId: string): Promise<WorkHistory> => {
    try {
      const response = await privateApi.get<WorkHistory>(`/work-history/work/${workId}/latest`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching latest work history for work ${workId}:`, error);
      throw error;
    }
  },

  // Обновление записи истории работы
  updateWorkHistory: async (workHistoryId: string, data: { effectiveDate?: string }): Promise<WorkHistory> => {
    try {
      const response = await privateApi.patch<WorkHistory>(`/work-history/${workHistoryId}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating work history ${workHistoryId}:`, error);
      throw error;
    }
  },


}; 