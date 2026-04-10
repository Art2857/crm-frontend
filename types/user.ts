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
  login: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthday: string | null;
  salaryDays: number[];
  role: Role;
  email?: string | null;
  timezone?: string | null;
  workStart?: string | null;
  workEnd?: string | null;
  status?: UserStatus;
  preferences?: string | null;
  characteristics?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserHistory {
  id: string;
  userId: string;
  login: string;
  email?: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  birthday: string | null;
  salaryDays: number[];
  role: Role;
  updatedAt: string;
}

export interface UpdateProfileDto {
  login?: string;
  email?: string | null;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthday?: string | null;
  timezone?: string;
  workStart?: string;
  workEnd?: string;
  status?: UserStatus;
  preferences?: string;
}

export interface UpdateSensitiveDataDto {
  login?: string;
  email?: string | null;
  role?: Role;
  salaryDays?: number[] | null;
  characteristics?: string;
}

export interface UserWithHistory extends User {
  history: UserHistory[];
}
