import {
  Work,
  CreateWorkDto,
  UpdateWorkDto,
  WorkHistory,
  WorkWithHistory,
} from '../types/work';
import { privateApi } from './ApiClient';
import { WORKS_ENDPOINTS, WORK_HISTORY_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';

// Сервис для работы с работами
export const workService = {
  // Получить все работы
  getAll: async (): Promise<Work[]> => {
    try {
      const response = await privateApi.get<Work[]>(WORKS_ENDPOINTS.base);
      return response.data;
    } catch (error) {
      logger.error('Error fetching works:', error);
      throw error;
    }
  },

  // Получить работы по пользователю (где пользователь является ответственным)
  getByUserId: async (userId: string): Promise<Work[]> => {
    try {
      const response = await privateApi.get<Work[]>(
        WORKS_ENDPOINTS.responsible(userId)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching works for user ${userId}:`, error);
      throw error;
    }
  },

  // Получить одну работу с историей
  getById: async (id: string): Promise<WorkWithHistory> => {
    try {
      const response = await privateApi.get<WorkWithHistory>(
        WORKS_ENDPOINTS.byId(id)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching work with ID ${id}:`, error);
      throw error;
    }
  },

  // Создать новую работу
  create: async (data: CreateWorkDto): Promise<Work> => {
    try {
      const response = await privateApi.post<Work>(WORKS_ENDPOINTS.base, data);
      return response.data;
    } catch (error) {
      logger.error('Error creating work:', error);
      throw error;
    }
  },

  // Архивировать работу
  archive: async (id: string): Promise<Work> => {
    try {
      const response = await privateApi.post<Work>(
        `${WORKS_ENDPOINTS.byId(id)}/archive`
      );
      return response.data;
    } catch (error) {
      logger.error(`Error archiving work ${id}:`, error);
      throw error;
    }
  },

  // Восстановить работу
  restore: async (id: string): Promise<Work> => {
    try {
      const response = await privateApi.post<Work>(
        `${WORKS_ENDPOINTS.byId(id)}/restore`
      );
      return response.data;
    } catch (error) {
      logger.error(`Error restoring work ${id}:`, error);
      throw error;
    }
  },

  // Список архивных работ
  getArchived: async (): Promise<Work[]> => {
    try {
      const response = await privateApi.get<Work[]>(
        `${WORKS_ENDPOINTS.base}/archived/list`
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching archived works:', error);
      throw error;
    }
  },

  // createExtended/updateExtended удалены: в бэкенде нет /works/extended

  // Получить историю работы (исправленный путь)
  getHistory: async (id: string): Promise<WorkHistory[]> => {
    try {
      const response = await privateApi.get<WorkHistory[]>(
        WORK_HISTORY_ENDPOINTS.work(id)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching history for work ${id}:`, error);
      throw error;
    }
  },

  // Обновить работу
  update: async (id: string, data: UpdateWorkDto): Promise<WorkHistory> => {
    try {
      const response = await privateApi.patch<WorkHistory>(
        WORKS_ENDPOINTS.byId(id),
        data
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating work ${id}:`, error);
      throw error;
    }
  },

  // Получение последней записи истории работы
  getLatestWorkHistory: async (workId: string): Promise<WorkHistory> => {
    try {
      const response = await privateApi.get<WorkHistory>(
        WORK_HISTORY_ENDPOINTS.latest(workId)
      );
      return response.data;
    } catch (error) {
      logger.error(
        `Error fetching latest work history for work ${workId}:`,
        error
      );
      throw error;
    }
  },

  // Обновление записи истории работы
  updateWorkHistory: async (
    workHistoryId: string,
    data: { effectiveDate?: string }
  ): Promise<WorkHistory> => {
    try {
      const response = await privateApi.patch<WorkHistory>(
        WORK_HISTORY_ENDPOINTS.byId(workHistoryId),
        data
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating work history ${workHistoryId}:`, error);
      throw error;
    }
  },
};
