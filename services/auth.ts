import { AuthResponse, LoginDto, RefreshTokenDto, RegisterDto } from '../types/auth';
import { publicApi, privateApi, authApi, ApiClient } from './ApiClient';
import { accountManagerService } from './accountManager';
import { User } from '../types/user';


export const authService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/auth/login', data);
    

    
    // Сохраняем токен в localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.access_token);
      
      // Сохраняем refresh token, если он есть
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Сохраняем аккаунт в менеджере аккаунтов
      accountManagerService.saveAccount(response.data.user, response.data.access_token);
    }
    
    return response.data;
  },
  
  // Метод для добавления нового аккаунта через логин без замены текущего
  addAccountLogin: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/auth/login', data);
    
    // Сохраняем аккаунт в менеджере и делаем его текущим
    if (typeof window !== 'undefined') {
      // Сохраняем refresh token, если он есть
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Сохраняем аккаунт в менеджере аккаунтов и устанавливаем его как текущий
      accountManagerService.saveAccount(response.data.user, response.data.access_token, true);
      localStorage.setItem('token', response.data.access_token);
    }
    
    return response.data;
  },
  
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/auth/register', data);
    
    // Сохраняем токен в localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.access_token);
      
      // Сохраняем refresh token, если он есть
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Сохраняем аккаунт в менеджере аккаунтов
      accountManagerService.saveAccount(response.data.user, response.data.access_token);
    }
    
    return response.data;
  },
  
  // Метод для добавления нового аккаунта через регистрацию без замены текущего
  addAccountRegister: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await authApi.post<AuthResponse>('/auth/register', data);
    
    // Сохраняем аккаунт в менеджере и делаем его текущим
    if (typeof window !== 'undefined') {
      // Сохраняем refresh token, если он есть
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Сохраняем аккаунт в менеджере аккаунтов и устанавливаем его как текущий
      accountManagerService.saveAccount(response.data.user, response.data.access_token, true); 
      localStorage.setItem('token', response.data.access_token);
    }
    
    return response.data;
  },
  
  logout: (): void => {
    if (typeof window !== 'undefined') {
      // Удаляем текущий аккаунт из менеджера аккаунтов
      const currentAccount = accountManagerService.getCurrentAccount();
      if (currentAccount) {
        accountManagerService.setCurrentAccountId(null);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  },
  
  // Метод для обновления токенов
  refreshTokens: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('Токен обновления отсутствует');
    }
    
    const data: RefreshTokenDto = { refreshToken };
    const response = await authApi.post<AuthResponse>('/auth/refresh', data);
    
    // Обновляем токены в localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.access_token);
      
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      // Обновляем данные в менеджере аккаунтов
      const userId = accountManagerService.getCurrentAccountId();
      if (userId) {
        const accounts = accountManagerService.getSavedAccounts();
        const currentAccount = accounts.find(account => account.id === userId);
        if (currentAccount && response.data.user) {
          accountManagerService.saveAccount(response.data.user, response.data.access_token);
        }
      }
    }
    
    return response.data;
  },
  
  // Метод для выхода со всех устройств (через сервер)
  logoutFromServer: async (): Promise<void> => {
    try {
      await privateApi.post('/auth/logout-all');
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
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  },
  
  // Получение текущего пользователя (по токену)
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await privateApi.get<User>('/users/me', {
        headers: ApiClient.getNoCacheHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка при получении текущего пользователя:', error);
      throw error;
    }
  },
  
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },
  
  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('token');
    }
    return false;
  },
  
  // Новые методы для работы с множественными аккаунтами
  
  getSavedAccounts: () => {
    return accountManagerService.getSavedAccounts();
  },
  
  switchAccount: (accountId: string) => {
    const account = accountManagerService.switchToAccount(accountId);
    return account;
  },
  
  removeAccount: (accountId: string) => {
    accountManagerService.removeAccount(accountId);
  },
  
  getCurrentAccountId: () => {
    return accountManagerService.getCurrentAccountId();
  }
};

// Используем authApi для запросов авторизации вместо publicApi или privateApi
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Ошибка при входе:', error);
    throw error;
  }
};

export const registerUser = async (userData: RegisterDto): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    throw error;
  }
};

export const refreshToken = async (refreshToken: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/auth/refresh', { refreshToken });
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    throw error;
  }
}; 