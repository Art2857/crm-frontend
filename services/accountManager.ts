import { User } from '../types/user';
import { invalidateCurrentSession } from './authSession';
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
const EXPIRED_AT_FALLBACK = new Date(0).toISOString();

type AccountLike = {
  id?: string | null;
  user?: Partial<User> | null;
};

interface NormalizedAccountResult {
  account: SavedAccount | null;
  changed: boolean;
}

const normalizeTextValue = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null;

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const normalizeIdentityValue = (value?: string | null): string | null => {
  const normalizedValue = normalizeTextValue(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
};

const getCanonicalAccountId = (account: AccountLike): string | null => {
  return (
    normalizeTextValue(account.user?.id) ||
    normalizeTextValue(account.id) ||
    normalizeTextValue(account.user?.login) ||
    normalizeTextValue(account.user?.email) ||
    null
  );
};

const areAccountsEquivalent = (left: AccountLike, right: AccountLike): boolean => {
  const leftUserId = normalizeTextValue(left.user?.id);
  const rightUserId = normalizeTextValue(right.user?.id);

  if (leftUserId && rightUserId && leftUserId === rightUserId) {
    return true;
  }

  const leftLogin = normalizeIdentityValue(left.user?.login);
  const rightLogin = normalizeIdentityValue(right.user?.login);

  if (leftLogin && rightLogin && leftLogin === rightLogin) {
    return true;
  }

  const leftEmail = normalizeIdentityValue(left.user?.email);
  const rightEmail = normalizeIdentityValue(right.user?.email);

  if (leftEmail && rightEmail && leftEmail === rightEmail) {
    return true;
  }

  const leftId = normalizeTextValue(left.id);
  const rightId = normalizeTextValue(right.id);

  return Boolean(leftId && rightId && leftId === rightId);
};

const getLastUsedTimestamp = (account: SavedAccount): number => {
  const timestamp = new Date(account.lastUsed).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeAccounts = (primary: SavedAccount, secondary: SavedAccount): SavedAccount => {
  const freshestAccount =
    getLastUsedTimestamp(primary) >= getLastUsedTimestamp(secondary) ? primary : secondary;
  const oldestAccount = freshestAccount === primary ? secondary : primary;
  const canonicalId =
    getCanonicalAccountId(freshestAccount) ||
    getCanonicalAccountId(oldestAccount) ||
    freshestAccount.id;
  const canonicalLogin =
    normalizeTextValue(freshestAccount.user.login) ||
    normalizeTextValue(oldestAccount.user.login) ||
    normalizeTextValue(freshestAccount.user.email) ||
    normalizeTextValue(oldestAccount.user.email) ||
    canonicalId;

  return {
    ...oldestAccount,
    ...freshestAccount,
    id: canonicalId,
    user: {
      ...oldestAccount.user,
      ...freshestAccount.user,
      id: canonicalId,
      login: canonicalLogin,
    },
    token: freshestAccount.token || oldestAccount.token,
    refreshToken: freshestAccount.refreshToken || oldestAccount.refreshToken,
    accessTokenExpiresAt:
      freshestAccount.accessTokenExpiresAt || oldestAccount.accessTokenExpiresAt,
    refreshTokenExpiresAt:
      freshestAccount.refreshTokenExpiresAt || oldestAccount.refreshTokenExpiresAt,
    lastUsed:
      getLastUsedTimestamp(freshestAccount) >= getLastUsedTimestamp(oldestAccount)
        ? freshestAccount.lastUsed
        : oldestAccount.lastUsed,
  };
};

const normalizeSavedAccount = (rawAccount: unknown): NormalizedAccountResult => {
  if (!rawAccount || typeof rawAccount !== 'object') {
    return { account: null, changed: true };
  }

  const account = rawAccount as Partial<SavedAccount>;

  if (!account.user || typeof account.user !== 'object') {
    return { account: null, changed: true };
  }

  const canonicalId = getCanonicalAccountId(account);

  if (!canonicalId) {
    return { account: null, changed: true };
  }

  const normalizedLogin =
    normalizeTextValue(account.user.login) || normalizeTextValue(account.user.email) || canonicalId;
  const normalizedAccount: SavedAccount = {
    id: canonicalId,
    user: {
      ...(account.user as User),
      id: canonicalId,
      login: normalizedLogin,
    },
    token: typeof account.token === 'string' ? account.token : '',
    refreshToken: typeof account.refreshToken === 'string' ? account.refreshToken : '',
    accessTokenExpiresAt:
      typeof account.accessTokenExpiresAt === 'string'
        ? account.accessTokenExpiresAt
        : EXPIRED_AT_FALLBACK,
    refreshTokenExpiresAt:
      typeof account.refreshTokenExpiresAt === 'string'
        ? account.refreshTokenExpiresAt
        : EXPIRED_AT_FALLBACK,
    lastUsed: typeof account.lastUsed === 'string' ? account.lastUsed : new Date(0).toISOString(),
  };

  const changed =
    account.id !== normalizedAccount.id ||
    account.user.id !== normalizedAccount.user.id ||
    account.user.login !== normalizedAccount.user.login ||
    account.refreshToken !== normalizedAccount.refreshToken ||
    account.accessTokenExpiresAt !== normalizedAccount.accessTokenExpiresAt ||
    account.refreshTokenExpiresAt !== normalizedAccount.refreshTokenExpiresAt ||
    account.lastUsed !== normalizedAccount.lastUsed;

  return { account: normalizedAccount, changed };
};

const dedupeAccounts = (
  accounts: SavedAccount[],
  currentAccountId: string | null,
): {
  accounts: SavedAccount[];
  currentAccountId: string | null;
  changed: boolean;
} => {
  const dedupedAccounts: SavedAccount[] = [];
  let resolvedCurrentAccountId = currentAccountId;
  let changed = false;

  for (const account of accounts) {
    const existingIndex = dedupedAccounts.findIndex((savedAccount) =>
      areAccountsEquivalent(savedAccount, account),
    );

    if (existingIndex < 0) {
      dedupedAccounts.push(account);
      continue;
    }

    const existingAccount = dedupedAccounts[existingIndex];
    const mergedAccount = mergeAccounts(existingAccount, account);
    dedupedAccounts[existingIndex] = mergedAccount;
    changed = true;

    if (
      resolvedCurrentAccountId &&
      (resolvedCurrentAccountId === existingAccount.id ||
        resolvedCurrentAccountId === account.id ||
        resolvedCurrentAccountId === existingAccount.user.id ||
        resolvedCurrentAccountId === account.user.id)
    ) {
      resolvedCurrentAccountId = mergedAccount.id;
    }
  }

  if (
    resolvedCurrentAccountId &&
    !dedupedAccounts.some((account) => account.id === resolvedCurrentAccountId)
  ) {
    resolvedCurrentAccountId = dedupedAccounts[0]?.id ?? null;
    changed = true;
  }

  return {
    accounts: dedupedAccounts,
    currentAccountId: resolvedCurrentAccountId,
    changed,
  };
};

const persistAccounts = (accounts: SavedAccount[], currentAccountId: string | null): void => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

  if (currentAccountId) {
    localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, currentAccountId);
  } else {
    localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
  }
};

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
      const parsedAccounts = JSON.parse(accountsJson) as unknown[];
      const currentAccountId = localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);
      let changed = !Array.isArray(parsedAccounts);
      const normalizedAccounts = (Array.isArray(parsedAccounts) ? parsedAccounts : [])
        .map((account) => {
          const result = normalizeSavedAccount(account);
          changed = changed || result.changed;
          return result.account;
        })
        .filter((account): account is SavedAccount => account !== null);
      const deduped = dedupeAccounts(normalizedAccounts, currentAccountId);

      if (changed || deduped.changed) {
        persistAccounts(deduped.accounts, deduped.currentAccountId);
      }

      return deduped.accounts;
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
    setAsCurrent: boolean = true,
  ): SavedAccount {
    if (!user) {
      console.error('Attempts to save account with undefined user');
      throw new Error('User data is required to save account');
    }

    const accounts = this.getSavedAccounts();
    const account: SavedAccount = {
      id: user.id,
      user: {
        ...user,
        login: normalizeTextValue(user.login) || normalizeTextValue(user.email) || user.id,
      },
      token,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      lastUsed: new Date().toISOString(),
    };

    const matchingAccountIndices = accounts.reduce((indices: number[], savedAccount, index) => {
      if (areAccountsEquivalent(savedAccount, account)) {
        indices.push(index);
      }
      return indices;
    }, []);

    let nextAccounts = [...accounts];

    if (matchingAccountIndices.length > 0) {
      const firstMatchingIndex = matchingAccountIndices[0];
      nextAccounts = nextAccounts.filter((_, index) => !matchingAccountIndices.includes(index));
      nextAccounts.splice(firstMatchingIndex, 0, account);
    } else {
      nextAccounts.push(account);
    }

    const deduped = dedupeAccounts(
      nextAccounts,
      setAsCurrent ? account.id : this.getCurrentAccountId(),
    );
    persistAccounts(deduped.accounts, setAsCurrent ? account.id : deduped.currentAccountId);

    // Устанавливаем текущий аккаунт только если это требуется
    if (setAsCurrent) {
      this.setCurrentAccountId(user.id);
    }

    return account;
  },

  updateAccountUser(user: User): void {
    if (typeof window === 'undefined') return;

    const accounts = this.getSavedAccounts();
    const normalizedUser = {
      ...user,
      login: normalizeTextValue(user.login) || normalizeTextValue(user.email) || user.id,
    };
    const matchingAccountIndices = accounts.reduce((indices: number[], savedAccount, index) => {
      if (
        areAccountsEquivalent(savedAccount, {
          id: user.id,
          user: normalizedUser,
        })
      ) {
        indices.push(index);
      }
      return indices;
    }, []);

    if (matchingAccountIndices.length === 0) {
      return;
    }

    const updatedAccounts = accounts.map((savedAccount, index) => {
      if (!matchingAccountIndices.includes(index)) {
        return savedAccount;
      }

      return {
        ...savedAccount,
        id: normalizeTextValue(savedAccount.user.id) || user.id,
        user: {
          ...savedAccount.user,
          ...normalizedUser,
          id: normalizeTextValue(savedAccount.user.id) || user.id,
        },
      };
    });
    const deduped = dedupeAccounts(updatedAccounts, this.getCurrentAccountId());
    persistAccounts(deduped.accounts, deduped.currentAccountId);
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
              accountId: account.id,
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
            true,
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
          this.setCurrentAccountId(account.id);
          invalidateCurrentSession({ reason: 'account_switch_refresh_failed' });
          // If refresh fails, emit re-auth event
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('refreshTokenExpired', {
              detail: {
                login: account.user.login,
                accountId: account.id,
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
