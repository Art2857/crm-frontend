/**
 * Абстракция поверх localStorage для токенов и текущего аккаунта.
 * Упрощает тестирование и делает код чище (SRP).
 */

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'access_token_expires_at';
const REFRESH_TOKEN_EXPIRES_AT_KEY = 'refresh_token_expires_at';
const CURRENT_ACCOUNT_ID_KEY = 'crm_current_account_id';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
};

export const tokenStorage = {
  getAccessToken(): string | null {
    return safeGetItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string | null): void {
    safeSetItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return safeGetItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string | null): void {
    safeSetItem(REFRESH_TOKEN_KEY, token);
  },
  getCurrentAccountId(): string | null {
    return safeGetItem(CURRENT_ACCOUNT_ID_KEY);
  },
  getAccessTokenExpiresAt(): string | null {
    return safeGetItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  },
  setAccessTokenExpiresAt(expiresAt: string | null): void {
    safeSetItem(ACCESS_TOKEN_EXPIRES_AT_KEY, expiresAt);
  },
  getRefreshTokenExpiresAt(): string | null {
    return safeGetItem(REFRESH_TOKEN_EXPIRES_AT_KEY);
  },
  setRefreshTokenExpiresAt(expiresAt: string | null): void {
    safeSetItem(REFRESH_TOKEN_EXPIRES_AT_KEY, expiresAt);
  },
  clearAll(): void {
    this.setAccessToken(null);
    this.setRefreshToken(null);
    this.setAccessTokenExpiresAt(null);
    this.setRefreshTokenExpiresAt(null);
  },
};
