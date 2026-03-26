import { privateApi } from './ApiClient';
import { DASHBOARD_ENDPOINTS } from './endpoints';
import { logger } from '../utils/logger';

export interface DutyData {
  name: string;
  calculatedValue: number;
  assignedAt: string;
  currency?: string;
  // Опциональные поля, доступные только для ответственного
  price?: string | null;
  percentage?: string | null;
}

export interface ResponsibleUser {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
}

export interface WorkData {
  name: string;
  createdAt: string;
  releaseDate?: string; // Date as ISO string
  isResponsible: boolean;
  // Опциональные поля, доступные только для ответственного
  salary?: number;
  salaryCurrency?: string;
  duties: DutyData[];
  // Информация об ответственном пользователе
  responsibleUser: ResponsibleUser | null;
}

export interface DashboardData {
  salary: number;
  works: WorkData[];
}

export const dashboardService = {
  // Получение данных главной страницы
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await privateApi.get<DashboardData>(DASHBOARD_ENDPOINTS.base);
      return response.data;
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  },
};
