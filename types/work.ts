// Ссылка на тип DistributionDetail из duty.ts
import { DistributionDetail } from './duty';

/**
 * Тип работы
 */
export enum WorkType {
  BUG = 'BUG',
  FEATURE = 'FEATURE',
  TASK = 'TASK',
}

/**
 * Приоритет работы
 */
export enum WorkPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Статус работы
 */
export enum WorkStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  TESTING = 'TESTING',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
}

export interface Work {
  id: string;
  name: string;
  responsibleUserId: string;
  salary: string; // Decimal represented as string
  releaseDate?: Date; // Date объект
  isArchived?: boolean; // Архивный статус работы
  createdAt: Date;
  updatedAt: Date;
  history?: WorkHistory[]; // Соответствие бэкенду
}

export interface WorkHistory {
  id: string;
  workId: string;
  name: string;
  responsibleUserId: string;
  salary: string; // Decimal represented as string
  effectiveDate?: Date; // Date объект
  updatedAt: Date;
  createdAt?: Date; // Добавляем поле для совместимости с бэкендом
  details?: DistributionDetail[]; // Соответствие бэкенду
}

/**
 * Расширенная модель работы
 */
export interface WorkExtended {
  id: string;
  title: string;
  description: string;
  type: WorkType;
  priority: WorkPriority;
  status: WorkStatus;
  estimatedHours: number;
  actualHours?: number;
  initiatorId: string;
  assigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkDto {
  name: string;
  responsibleUserId: string;
  salary: string; // Decimal represented as string
  releaseDate: Date; // Date объект
}

/**
 * DTO для создания новой работы (расширенная версия)
 */
export interface CreateWorkExtendedDto {
  title: string;
  description: string;
  type: WorkType;
  priority: WorkPriority;
  estimatedHours: number;
  initiatorId?: string;
  assigneeId?: string;
}

export interface UpdateWorkDto {
  name?: string;
  responsibleUserId?: string;
  salary?: string; // Decimal represented as string
  releaseDate?: Date; // Date объект
}

/**
 * DTO для обновления работы (расширенная версия)
 */
export interface UpdateWorkExtendedDto {
  title?: string;
  description?: string;
  type?: WorkType;
  priority?: WorkPriority;
  status?: WorkStatus;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string;
}

export interface WorkWithHistory extends Work {
  history: WorkHistory[];
}
