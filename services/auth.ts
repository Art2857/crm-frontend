import {
  AuthResponse,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '../types/auth';
import { privateApi, authApi, ApiClient } from './ApiClient';
import { AUTH_ENDPOINTS, USERS_ENDPOINTS } from './endpoints';
import { accountManagerService, SavedAccount } from './accountManager';
import { User } from '../types/user';
import { tokenStorage } from './tokenStorage';

export const authService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>(
      AUTH_ENDPOINTS.login,
      data
    );

    // Сохраняем токены
    tokenStorage.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      tokenStorage.setRefreshToken(response.data.refresh_token);
    }
    if (response.data.access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(response.data.access_token_expires_at);
    }
    if (response.data.refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(response.data.refresh_token_expires_at);
    }
    // Сохраняем аккаунт в менеджере аккаунтов
    if (typeof window !== 'undefined') {
      accountManagerService.saveAccount(
        response.data.user,
        response.data.access_token,
        response.data.refresh_token,
        response.data.access_token_expires_at,
        response.data.refresh_token_expires_at
      );
    }

    return response.data;
  },

  // Метод для добавления нового аккаунта через логин без замены текущего
  addAccountLogin: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>(
      AUTH_ENDPOINTS.login,
      data
    );

    // Сохраняем токены и аккаунт в менеджере и делаем его текущим
    tokenStorage.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      tokenStorage.setRefreshToken(response.data.refresh_token);
    }
    if (response.data.access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(response.data.access_token_expires_at);
    }
    if (response.data.refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(response.data.refresh_token_expires_at);
    }
    if (typeof window !== 'undefined') {
      accountManagerService.saveAccount(
        response.data.user,
        response.data.access_token,
        response.data.refresh_token,
        response.data.access_token_expires_at,
        response.data.refresh_token_expires_at,
        true
      );
    }

    return response.data;
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const token = tokenStorage.getAccessToken();
    const client = token ? privateApi : authApi;
    const response = await client.post<AuthResponse>(AUTH_ENDPOINTS.register, data);

    tokenStorage.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      tokenStorage.setRefreshToken(response.data.refresh_token);
    }
    if (response.data.access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(response.data.access_token_expires_at);
    }
    if (response.data.refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(response.data.refresh_token_expires_at);
    }
    if (typeof window !== 'undefined') {
      accountManagerService.saveAccount(
        response.data.user,
        response.data.access_token,
        response.data.refresh_token,
        response.data.access_token_expires_at,
        response.data.refresh_token_expires_at
      );
    }

    return response.data;
  },

  // Метод для добавления нового аккаунта через регистрацию без замены текущего
  addAccountRegister: async (data: RegisterDto): Promise<AuthResponse> => {
    const token = tokenStorage.getAccessToken();
    const client = token ? privateApi : authApi;
    const response = await client.post<AuthResponse>(AUTH_ENDPOINTS.register, data);

    tokenStorage.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      tokenStorage.setRefreshToken(response.data.refresh_token);
    }
    if (response.data.access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(response.data.access_token_expires_at);
    }
    if (response.data.refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(response.data.refresh_token_expires_at);
    }
    if (typeof window !== 'undefined') {
      accountManagerService.saveAccount(
        response.data.user,
        response.data.access_token,
        response.data.refresh_token,
        response.data.access_token_expires_at,
        response.data.refresh_token_expires_at,
        true
      );
    }

    return response.data;
  },

  logout: (): void => {
    // Удаляем текущий аккаунт из менеджера аккаунтов
    if (typeof window !== 'undefined') {
      const currentAccount = accountManagerService.getCurrentAccount();
      if (currentAccount) {
        accountManagerService.setCurrentAccountId(null);
      }
    }
    tokenStorage.clearAll();
  },

  // Метод для обновления токенов
  refreshTokens: async (): Promise<AuthResponse> => {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('Токен обновления отсутствует');
    }

    const data: RefreshTokenDto = { refreshToken };
    const response = await authApi.post<AuthResponse>(
      AUTH_ENDPOINTS.refresh,
      data
    );

    tokenStorage.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      tokenStorage.setRefreshToken(response.data.refresh_token);
    }
    if (response.data.access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(response.data.access_token_expires_at);
    }
    if (response.data.refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(response.data.refresh_token_expires_at);
    }
    // Обновляем данные в менеджере аккаунтов
    if (typeof window !== 'undefined') {
      const userId = accountManagerService.getCurrentAccountId();
      if (userId) {
        const accounts = accountManagerService.getSavedAccounts();
        const currentAccount = accounts.find(
          (account: SavedAccount) => account.id === userId
        );
        if (currentAccount && response.data.user) {
          accountManagerService.saveAccount(
            response.data.user,
            response.data.access_token,
            response.data.refresh_token,
            response.data.access_token_expires_at,
            response.data.refresh_token_expires_at
          );
        }
      }
    }

    return response.data;
  },

  // Метод для выхода со всех устройств (через сервер)
  logoutFromServer: async (): Promise<void> => {
    try {
      await privateApi.post(AUTH_ENDPOINTS.logoutAll);
    } catch (error) {
      console.error('Ошибка при выходе со всех устройств:', error);
    } finally {
      // Локально выходим в любом случае
      authService.logoutFromAllAccounts();
    }
  },

  logoutFromAllAccounts: (): void => {
    if (typeof window !== 'undefined') {
      // Очищаем все сохраненные аккаунты
      accountManagerService.clearAllAccounts();
      tokenStorage.clearAll();
    }
  },

  // Получение текущего пользователя (по токену)
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await privateApi.get<User>(USERS_ENDPOINTS.me, {
        headers: ApiClient.getNoCacheHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('❌ Ошибка при получении текущего пользователя:', error);
      throw error;
    }
  },

  getToken: (): string | null => {
    return tokenStorage.getAccessToken();
  },

  getRefreshToken: (): string | null => {
    return tokenStorage.getRefreshToken();
  },

  isAuthenticated: (): boolean => {
    return !!tokenStorage.getAccessToken();
  },

  // Новые методы для работы с множественными аккаунтами

  getSavedAccounts: () => {
    return accountManagerService.getSavedAccounts();
  },

  switchAccount: async (accountId: string) => {
    const account = await accountManagerService.switchToAccount(accountId);
    return account;
  },

  removeAccount: (accountId: string) => {
    accountManagerService.removeAccount(accountId);
  },

  getCurrentAccountId: () => {
    return accountManagerService.getCurrentAccountId();
  },
};

// Используем authApi для запросов авторизации вместо publicApi или privateApi
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>(AUTH_ENDPOINTS.login, {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при входе:', error);
    throw error;
  }
};

export const registerUser = async (
  userData: RegisterDto
): Promise<AuthResponse> => {
  try {
    const token = tokenStorage.getAccessToken();
    const client = token ? privateApi : authApi;
    const response = await client.post<AuthResponse>(AUTH_ENDPOINTS.register, userData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    throw error;
  }
};

export const refreshToken = async (
  refreshToken: string
): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>(AUTH_ENDPOINTS.refresh, {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    throw error;
  }
};
