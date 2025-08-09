export enum Role {
  ADMIN = 'ADMIN',
  WORKER = 'WORKER',
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
}

export interface UpdateSensitiveDataDto {
  email?: string;
  role?: Role;
  salaryDay?: number | null;
}

export interface UserWithHistory extends User {
  history: UserHistory[];
}
