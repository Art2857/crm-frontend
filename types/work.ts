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
  salary: string; // Decimal represented as string (in base RUB for analytics)
  currency?: 'RUB' | 'USD'; // Сохраненная валюта работы
  releaseDate?: string; // Date as ISO string
  incomeFixationDate?: string; // Date as ISO string
  isArchived?: boolean; // Архивный статус работы
  createdAt: string;
  updatedAt: string;
  history?: WorkHistory[]; // Соответствие бэкенду
}

export interface WorkHistory {
  id: string;
  workId: string;
  name: string;
  responsibleUserId: string;
  salary: string; // Decimal represented as string
  currency?: 'RUB' | 'USD';
  effectiveDate?: string; // Date as ISO string
  updatedAt: string;
  createdAt?: string; // Добавляем поле для совместимости с бэкендом
  details?: DistributionDetail[]; // Соответствие бэкенду
}

export interface WorkArchiveStatus {
  canArchive: boolean;
  reasons: string[];
  activeAssignmentsCount: number;
  unpaidDutyDebtsCount: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkDto {
  name: string;
  responsibleUserId: string;
  salary: string; // Decimal represented as string
  releaseDate: string; // Date as ISO string
  currency?: 'RUB' | 'USD';
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
  releaseDate?: string; // Date as ISO string
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
