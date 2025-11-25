import {
  Duty,
  CreateDutyDto,
  UpdateDutyDto,
  Distribution,
  DistributionDetail,
  CreateDistributionDto,
  DistributionWithDetails,
} from '../types/duty';
import { privateApi } from './ApiClient';
import {
  DUTIES_ENDPOINTS,
  DISTRIBUTIONS_ENDPOINTS,
  DISTRIBUTION_DETAILS_ENDPOINTS,
} from './endpoints';
import { logger } from '../utils/logger';

export const dutyService = {
  // Получение всех обязанностей
  getAll: async (): Promise<Duty[]> => {
    try {
      const response = await privateApi.get<Duty[]>(
        DUTIES_ENDPOINTS.base
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching duties:', error);
      throw error;
    }
  },

  // Получение обязанности по ID
  getById: async (id: string): Promise<Duty> => {
    try {
      const response = await privateApi.get<Duty>(
        DUTIES_ENDPOINTS.byId(id)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching duty with ID ${id}:`, error);
      throw error;
    }
  },

  // Создание новой обязанности
  create: async (data: CreateDutyDto): Promise<Duty> => {
    try {
      const response = await privateApi.post<Duty>(
        DUTIES_ENDPOINTS.base,
        data
      );
      return response.data;
    } catch (error) {
      logger.error('Error creating duty:', error);
      throw error;
    }
  },

  // Обновление обязанности
  update: async (
    id: string,
    data: UpdateDutyDto
  ): Promise<Duty> => {
    try {
      const response = await privateApi.patch<Duty>(
        DUTIES_ENDPOINTS.byId(id),
        data
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating duty with ID ${id}:`, error);
      throw error;
    }
  },

  // Удаление обязанности
  delete: async (id: string): Promise<void> => {
    try {
      await privateApi.delete(DUTIES_ENDPOINTS.byId(id));
    } catch (error) {
      logger.error(`Error deleting duty with ID ${id}:`, error);
      throw error;
    }
  },

  // Получение всех распределений
  getAllDistributions: async (): Promise<Distribution[]> => {
    try {
      const response = await privateApi.get<Distribution[]>(
        DISTRIBUTIONS_ENDPOINTS.base
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching distributions:', error);
      throw error;
    }
  },

  // Получение распределения по ID с деталями
  getDistributionById: async (
    id: string
  ): Promise<DistributionWithDetails> => {
    try {
      const response = await privateApi.get<DistributionWithDetails>(
        DISTRIBUTIONS_ENDPOINTS.byId(id)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching distribution with ID ${id}:`, error);
      throw error;
    }
  },

  // Создание нового распределения
  async createDistribution(
    data: {
      workHistoryId: string;
      effectiveDate?: string;
      details: {
        dutyId: string;
        userId: string;
        price?: number | null;
        percentage?: number | null;
      }[];
    }
  ): Promise<DistributionWithDetails> {
    try {
      logger.debug('Отправляем запрос на создание распределения:', data);

      // Преобразуем данные в формат, ожидаемый API
      const requestData: CreateDistributionDto = {
        workHistoryId: data.workHistoryId,
        effectiveDate: data.effectiveDate,
        details: data.details.map((detail) => ({
          dutyId: detail.dutyId,
          userId: detail.userId,
          price: detail.price?.toString() || null,
          percentage: detail.percentage?.toString() || null,
        })),
      };

      logger.debug('Преобразованные данные для API:', requestData);

      const response = await privateApi.post<DistributionWithDetails>(
        DISTRIBUTIONS_ENDPOINTS.base,
        requestData
      );

      logger.debug('Ответ от API при создании распределения:', response.data);

      return response.data;
    } catch (error) {
      logger.error('Ошибка при создании распределения:', error);
      throw error;
    }
  },

  // Получение распределения по workHistoryId
  getDistributionsByWorkHistoryId: async (
    workHistoryId: string
  ): Promise<DistributionWithDetails | null> => {
    try {
      const response = await privateApi.get<DistributionWithDetails>(
        DISTRIBUTIONS_ENDPOINTS.byWorkHistoryId(workHistoryId)
      );
      return response.data;
    } catch (error) {
      logger.error(
        `Error fetching distribution for work history ${workHistoryId}:`,
        error
      );
      // Если распределение не найдено, возвращаем null вместо ошибки
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Получение всех распределений по workId (для работы)
  getDistributionsByWorkId: async (
    workId: string
  ): Promise<DistributionWithDetails[]> => {
    try {
      const response = await privateApi.get<DistributionWithDetails[]>(
        DISTRIBUTIONS_ENDPOINTS.byWorkId( workId)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching distributions for work ${workId}:`, error);
      // Если распределения не найдены, возвращаем пустой массив
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Обновление распределения
  async updateDistribution(
    workHistoryId: string,
    data: {
      details: {
        dutyId: string;
        userId: string;
        price?: string | null;
        percentage?: string | null;
      }[];
      effectiveDate?: string;
    }
  ): Promise<DistributionWithDetails> {
    try {
      logger.debug('Отправляем запрос на обновление распределения:', {
        workHistoryId,
        details: data.details,
        effectiveDate: data.effectiveDate,
      });

      // Преобразуем данные в формат, ожидаемый API
      const requestData = {
        workHistoryId: workHistoryId,
        details: data.details,
        effectiveDate: data.effectiveDate,
      };

      logger.debug('Преобразованные данные для API:', requestData);

      const response = await privateApi.patch<DistributionWithDetails>(
        DISTRIBUTIONS_ENDPOINTS.byId(workHistoryId),
        requestData
      );

      logger.debug('Ответ от API при обновлении распределения:', response.data);

      return response.data;
    } catch (error) {
      logger.error('Ошибка при обновлении распределения:', error);
      throw error;
    }
  },

  // Получение детали распределения по ID
  getDistributionDetailById: async (
    id: string
  ): Promise<DistributionDetail> => {
    try {
      const response = await privateApi.get<DistributionDetail>(
        DISTRIBUTION_DETAILS_ENDPOINTS.byId(id)
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching distribution detail with ID ${id}:`, error);
      throw error;
    }
  },

  // Создание детали распределения
  createDistributionDetail: async (
    data: {
      workHistoryId: string;
      dutyId: string;
      userId: string;
      price?: string | null;
      percentage?: string | null;
    }
  ): Promise<DistributionDetail> => {
    try {
      const response = await privateApi.post<DistributionDetail>(
        DISTRIBUTION_DETAILS_ENDPOINTS.base,
        data
      );
      return response.data;
    } catch (error) {
      logger.error('Error creating distribution detail:', error);
      throw error;
    }
  },

  // Обновление детали распределения
  updateDistributionDetail: async (
    id: string,
    data: {
      price?: string | null;
      percentage?: string | null;
    }
  ): Promise<DistributionDetail> => {
    try {
      const response = await privateApi.patch<DistributionDetail>(
        DISTRIBUTION_DETAILS_ENDPOINTS.byId(id),
        data
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating distribution detail with ID ${id}:`, error);
      throw error;
    }
  },
};
