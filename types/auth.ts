import { User } from './user';

export interface LoginDto {
  login: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterDto {
  login: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  access_token_expires_at?: string; // ISO timestamp
  refresh_token_expires_at?: string; // ISO timestamp
  user?: User;
}

export interface AuthResponseWithUser extends AuthResponse {
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
