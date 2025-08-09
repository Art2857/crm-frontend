import { User } from '../types/user';
import { tokenStorage } from './tokenStorage';

export interface SavedAccount {
  id: string;
  user: User;
  token: string;
  lastUsed: string; // ISO timestamp
}

const ACCOUNTS_STORAGE_KEY = 'crm_saved_accounts';
const CURRENT_ACCOUNT_ID_KEY = 'crm_current_account_id';

// Сервис для управления сохраненными аккаунтами
export const accountManagerService = {
  // Получение всех сохраненных аккаунтов
  getSavedAccounts(): SavedAccount[] {
    if (typeof window === 'undefined') return [];

    const accountsJson = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!accountsJson) return [];

    try {
      return JSON.parse(accountsJson);
    } catch (error) {
      console.error('Ошибка при чтении сохраненных аккаунтов:', error);
      return [];
    }
  },

  // Сохранение нового аккаунта
  saveAccount(
    user: User,
    token: string,
    setAsCurrent: boolean = true
  ): SavedAccount {
    const accounts = this.getSavedAccounts();

    // Проверяем, существует ли уже аккаунт с таким email
    const existingAccountIndex = accounts.findIndex(
      (acc) => acc.user.email === user.email
    );

    const account: SavedAccount = {
      id: user.id,
      user,
      token,
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
    accounts = accounts.filter((acc) => acc.id !== accountId);
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
    return accounts.find((acc) => acc.id === accountId) || null;
  },

  // Установка текущего аккаунта
  setCurrentAccountId(accountId: string | null): void {
    if (accountId) {
      localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, accountId);

      // Обновляем время последнего использования
      const accounts = this.getSavedAccounts();
      const account = accounts.find((acc) => acc.id === accountId);
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
  switchToAccount(accountId: string): SavedAccount | null {
    const account = this.getAccountById(accountId);
    if (!account) return null;

    // Обновляем текущий аккаунт и токен
    this.setCurrentAccountId(accountId);
    tokenStorage.setAccessToken(account.token);

    // Dispatch a custom event to notify the app that the account has changed
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('accountSwitched', {
        detail: { accountId: accountId },
      });
      window.dispatchEvent(event);
    }

    return account;
  },

  // Очистка всех аккаунтов
  clearAllAccounts(): void {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
    localStorage.removeItem('token');
  },
};
