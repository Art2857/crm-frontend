export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  HR = 'HR',
  WORKER = 'WORKER',
}

export enum UserStatus {
  WORKING = 'WORKING',
  AWAY = 'AWAY',
  LUNCH = 'LUNCH',
  SLEEP = 'SLEEP',
}

export interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthday: string | null;
  salaryDay: number | null;
  role: Role;
  email: string;
  timezone?: string | null;
  workStart?: string | null;
  workEnd?: string | null;
  status?: UserStatus;
  preferences?: Record<string, any> | null;
  characteristics?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserHistory {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthday: string | null;
  salaryDay: number | null;
  role: Role;
  updatedAt: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthday?: string | null;
  timezone?: string;
  workStart?: string;
  workEnd?: string;
  status?: UserStatus;
  preferences?: Record<string, any>;
}

export interface UpdateSensitiveDataDto {
  email?: string;
  role?: Role;
  salaryDay?: number | null;
  characteristics?: string;
}

export interface UserWithHistory extends User {
  history: UserHistory[];
}
