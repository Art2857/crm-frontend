import { User } from '../types/user';
import { tokenStorage } from './tokenStorage';
import { isAccessTokenExpired, isRefreshTokenExpired, refreshTokens } from './tokenRefresh';

export interface SavedAccount {
  id: string;
  user: User;
  token: string;
  refreshToken?: string; // Refresh token
  accessTokenExpiresAt?: string; // ISO timestamp
  refreshTokenExpiresAt?: string; // ISO timestamp
  lastUsed: string; // ISO timestamp
}

const ACCOUNTS_STORAGE_KEY = 'crm_saved_accounts';
const CURRENT_ACCOUNT_ID_KEY = 'crm_current_account_id';

// Сервис для управления сохраненными аккаунтами
export const accountManagerService = {
  _isSwitching: false,

  isSwitching(): boolean {
    return this._isSwitching;
  },

  // Получение всех сохраненных аккаунтов
  getSavedAccounts(): SavedAccount[] {
    if (typeof window === 'undefined') return [];

    const accountsJson = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!accountsJson) return [];

    try {
      const accounts = JSON.parse(accountsJson);
      // Migration: mark accounts without expiration dates as expired
      return accounts.map((account: SavedAccount) => {
        if (!account || !account.user) return null;

        if (!account.refreshToken || !account.accessTokenExpiresAt || !account.refreshTokenExpiresAt || !account.user.login) {
          return {
            ...account,
            user: {
              ...account.user,
              login: account.user.login || account.user.email || account.id,
            },
            refreshToken: account.refreshToken || '',
            accessTokenExpiresAt: account.accessTokenExpiresAt || new Date(0).toISOString(),
            refreshTokenExpiresAt: account.refreshTokenExpiresAt || new Date(0).toISOString(),
          };
        }
        return account;
      }).filter(Boolean);
    } catch (error) {
      console.error('Ошибка при чтении сохраненных аккаунтов:', error);
      return [];
    }
  },

  // Сохранение нового аккаунта
  saveAccount(
    user: User,
    token: string,
    refreshToken?: string,
    accessTokenExpiresAt?: string,
    refreshTokenExpiresAt?: string,
    setAsCurrent: boolean = true
  ): SavedAccount {
    if (!user) {
      console.error('Attempts to save account with undefined user');
      throw new Error('User data is required to save account');
    }

    const accounts = this.getSavedAccounts();

    // Проверяем, существует ли уже аккаунт с таким login
    const existingAccountIndex = accounts.findIndex(
      (acc: SavedAccount) => acc?.user?.login === user.login
    );

    const account: SavedAccount = {
      id: user.id,
      user,
      token,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      lastUsed: new Date().toISOString(),
    };

    // Обновляем существующий аккаунт или добавляем новый
    if (existingAccountIndex >= 0) {
      accounts[existingAccountIndex] = account;
    } else {
      accounts.push(account);
    }

    // Сохраняем обновленный список
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    // Устанавливаем текущий аккаунт только если это требуется
    if (setAsCurrent) {
      this.setCurrentAccountId(user.id);
    }

    return account;
  },

  // Удаление аккаунта
  removeAccount(accountId: string): void {
    let accounts = this.getSavedAccounts();
    accounts = accounts.filter((acc: SavedAccount) => acc.id !== accountId);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    // Если удалили текущий аккаунт, выберем другой или очистим
    const currentAccountId = this.getCurrentAccountId();
    if (currentAccountId === accountId) {
      const newCurrent = accounts.length > 0 ? accounts[0].id : null;
      this.setCurrentAccountId(newCurrent);
    }
  },

  // Получение аккаунта по ID
  getAccountById(accountId: string): SavedAccount | null {
    const accounts = this.getSavedAccounts();
    return accounts.find((acc: SavedAccount) => acc.id === accountId) || null;
  },

  // Установка текущего аккаунта
  setCurrentAccountId(accountId: string | null): void {
    if (accountId) {
      localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, accountId);

      // Обновляем время последнего использования
      const accounts = this.getSavedAccounts();
      const account = accounts.find((acc: SavedAccount) => acc.id === accountId);
      if (account) {
        account.lastUsed = new Date().toISOString();
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
      }
    } else {
      localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
    }
  },

  // Получение ID текущего аккаунта
  getCurrentAccountId(): string | null {
    return localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);
  },

  // Получение текущего аккаунта
  getCurrentAccount(): SavedAccount | null {
    const currentId = this.getCurrentAccountId();
    if (!currentId) return null;

    return this.getAccountById(currentId);
  },

  // Переключение на другой аккаунт
  async switchToAccount(accountId: string): Promise<SavedAccount | null> {
    if (this._isSwitching) {
      console.warn('Account switch already in progress');
      return null;
    }

    this._isSwitching = true;

    try {
      const account = this.getAccountById(accountId);
      if (!account) return null;

      // Check if access token is expired
      const accessExpired = isAccessTokenExpired(account.accessTokenExpiresAt);
      const refreshExpired = isRefreshTokenExpired(account.refreshTokenExpiresAt);

      // If refresh token is expired, emit event for re-auth popup
      if (refreshExpired) {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('refreshTokenExpired', {
            detail: {
              login: account.user.login,
              accountId: account.id
            },
          });
          window.dispatchEvent(event);
        }
        throw new Error('Refresh token expired. Re-authentication required.');
      }

      // If access token is expired but refresh token is valid, refresh tokens
      if (accessExpired && account.refreshToken) {
        try {
          const response = await refreshTokens(account.refreshToken);

          // Update account with new tokens
          // IMPORTANT: Use response.user if available, otherwise fallback to existing account.user
          // because refresh endpoint might not return user object
          const updatedAccount = this.saveAccount(
            response.user || account.user,
            response.access_token,
            response.refresh_token,
            response.access_token_expires_at,
            response.refresh_token_expires_at,
            true
          );

          // Dispatch account switched event
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('accountSwitched', {
              detail: { accountId: accountId },
            });
            window.dispatchEvent(event);
          }

          return updatedAccount;
        } catch (error) {
          console.error('Failed to refresh tokens during account switch:', error);
          // If refresh fails, emit re-auth event
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('refreshTokenExpired', {
              detail: {
                login: account.user.login,
                accountId: account.id
              },
            });
            window.dispatchEvent(event);
          }
          throw new Error('Failed to refresh tokens. Re-authentication required.');
        }
      }

      // Tokens are valid, proceed with switch
      this.setCurrentAccountId(accountId);
      tokenStorage.setAccessToken(account.token);
      if (account.refreshToken) {
        tokenStorage.setRefreshToken(account.refreshToken);
      }
      if (account.accessTokenExpiresAt) {
        tokenStorage.setAccessTokenExpiresAt(account.accessTokenExpiresAt);
      }
      if (account.refreshTokenExpiresAt) {
        tokenStorage.setRefreshTokenExpiresAt(account.refreshTokenExpiresAt);
      }

      // Dispatch a custom event to notify the app that the account has changed
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('accountSwitched', {
          detail: { accountId: accountId },
        });
        window.dispatchEvent(event);
      }

      return account;
    } finally {
      this._isSwitching = false;
    }
  },

  // Очистка всех аккаунтов
  clearAllAccounts(): void {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
    localStorage.removeItem('token');
  },
};
