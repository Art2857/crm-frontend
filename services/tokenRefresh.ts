import axios from 'axios';
import { env } from '../config/env';
import { AuthResponse } from '../types/auth';
import { invalidateCurrentSession } from './authSession';
import { tokenStorage } from './tokenStorage';

const API_URL = env.apiBaseUrl;
const REFRESH_LOCK_PREFIX = 'crm_refresh_lock:';
const REFRESH_EVENT_PREFIX = 'crm_refresh_event:';
const REFRESH_LOCK_TTL_MS = 15_000;
const REFRESH_WAIT_TIMEOUT_MS = REFRESH_LOCK_TTL_MS + 2_000;
const CURRENT_SCOPE = 'current-session';
const tabId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

type RefreshStatus = 'success' | 'auth_failure' | 'transient_failure';

interface SharedRefreshOptions {
  refreshToken?: string;
  scope?: string;
  persistToStorage?: boolean;
  invalidateSessionOnAuthFailure?: boolean;
}

interface RefreshCoordinationEvent {
  scope: string;
  sourceTabId: string;
  status: RefreshStatus;
  timestamp: number;
  response?: AuthResponse;
}

interface RefreshLockState {
  owner: string;
  expiresAt: number;
}

const sharedRefreshPromises = new Map<string, Promise<AuthResponse | null>>();

export class TransientRefreshError extends Error {
  originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'TransientRefreshError';
    this.originalError = originalError;
  }
}

export const isTransientRefreshError = (error: unknown): error is TransientRefreshError =>
  error instanceof TransientRefreshError;

const buildLockKey = (scope: string): string => `${REFRESH_LOCK_PREFIX}${scope}`;

const buildEventKey = (scope: string): string => `${REFRESH_EVENT_PREFIX}${scope}`;

const getScope = (scope?: string): string =>
  scope || tokenStorage.getCurrentAccountId() || CURRENT_SCOPE;

const readLockState = (scope: string): RefreshLockState | null => {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(buildLockKey(scope));
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as RefreshLockState;
    if (
      typeof parsed.owner === 'string' &&
      typeof parsed.expiresAt === 'number' &&
      parsed.expiresAt > 0
    ) {
      return parsed;
    }
  } catch {}

  return null;
};

const acquireRefreshLock = (scope: string): boolean => {
  if (typeof window === 'undefined') return true;

  const existingLock = readLockState(scope);
  const now = Date.now();

  if (existingLock && existingLock.owner !== tabId && existingLock.expiresAt > now) {
    return false;
  }

  const nextLock: RefreshLockState = {
    owner: tabId,
    expiresAt: now + REFRESH_LOCK_TTL_MS,
  };

  window.localStorage.setItem(buildLockKey(scope), JSON.stringify(nextLock));
  return readLockState(scope)?.owner === tabId;
};

const releaseRefreshLock = (scope: string): void => {
  if (typeof window === 'undefined') return;

  const currentLock = readLockState(scope);
  if (currentLock?.owner === tabId) {
    window.localStorage.removeItem(buildLockKey(scope));
  }
};

const publishRefreshEvent = (event: RefreshCoordinationEvent): void => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(buildEventKey(event.scope), JSON.stringify(event));
};

const parseRefreshEvent = (value: string | null): RefreshCoordinationEvent | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as RefreshCoordinationEvent;
    if (
      typeof parsed.scope === 'string' &&
      typeof parsed.sourceTabId === 'string' &&
      typeof parsed.status === 'string' &&
      typeof parsed.timestamp === 'number'
    ) {
      return parsed;
    }
  } catch {}

  return null;
};

const readAuthResponseFromStorage = (): AuthResponse | null => {
  const accessToken = tokenStorage.getAccessToken();

  if (!accessToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: tokenStorage.getRefreshToken() || undefined,
    access_token_expires_at: tokenStorage.getAccessTokenExpiresAt() || undefined,
    refresh_token_expires_at: tokenStorage.getRefreshTokenExpiresAt() || undefined,
  };
};

export const applyAuthResponseToStorage = (response: AuthResponse): void => {
  tokenStorage.setAccessToken(response.access_token);

  if (response.refresh_token) {
    tokenStorage.setRefreshToken(response.refresh_token);
  }

  if (response.access_token_expires_at) {
    tokenStorage.setAccessTokenExpiresAt(response.access_token_expires_at);
  }

  if (response.refresh_token_expires_at) {
    tokenStorage.setRefreshTokenExpiresAt(response.refresh_token_expires_at);
  }
};

const resolveRefreshEvent = (event: RefreshCoordinationEvent): AuthResponse | null => {
  if (event.status === 'success') {
    return event.response ?? readAuthResponseFromStorage();
  }

  if (event.status === 'auth_failure') {
    return null;
  }

  throw new TransientRefreshError('Refresh не удался в другой вкладке');
};

const waitForRefreshCompletion = (
  scope: string,
  startedAt: number,
): Promise<AuthResponse | null> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const finish = (resolver: () => void): void => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorage);
      resolver();
    };

    const handleEventValue = (rawValue: string | null): void => {
      const event = parseRefreshEvent(rawValue);
      if (!event || event.scope !== scope || event.timestamp < startedAt) {
        return;
      }

      finish(() => {
        try {
          resolve(resolveRefreshEvent(event));
        } catch (error) {
          reject(error);
        }
      });
    };

    const handleStorage = (event: StorageEvent): void => {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (event.key === buildEventKey(scope)) {
        handleEventValue(event.newValue);
      }

      if (event.key === buildLockKey(scope) && event.newValue === null) {
        handleEventValue(window.localStorage.getItem(buildEventKey(scope)));
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => {
        reject(new TransientRefreshError('Истекло ожидание завершения refresh в другой вкладке'));
      });
    }, REFRESH_WAIT_TIMEOUT_MS);

    const latestEvent = parseRefreshEvent(window.localStorage.getItem(buildEventKey(scope)));
    if (latestEvent && latestEvent.timestamp >= startedAt) {
      finish(() => {
        try {
          resolve(resolveRefreshEvent(latestEvent));
        } catch (error) {
          reject(error);
        }
      });
      return;
    }

    window.addEventListener('storage', handleStorage);
  });
};

const isAuthenticationRefreshError = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  error.response !== undefined &&
  (error.response.status === 400 || error.response.status === 401);

const performRefreshRequest = async (refreshToken: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { withCredentials: true },
  );

  return response.data;
};

/**
 * Check if an access token is expired based on expiration timestamp
 */
export const isAccessTokenExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return true;

  try {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    // Consider token expired if within 1 minute of expiration
    const bufferTime = 60 * 1000; // 1 minute buffer
    return currentTime >= expirationTime - bufferTime;
  } catch {
    return true;
  }
};

/**
 * Check if a refresh token is expired based on expiration timestamp
 */
export const isRefreshTokenExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return true;

  try {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    return currentTime >= expirationTime;
  } catch {
    return true;
  }
};

/**
 * Refresh access and refresh tokens using the refresh token
 * Updates tokenStorage with new tokens and expiration dates
 * @param refreshToken The refresh token to use
 * @returns AuthResponse with new tokens and optional user data
 * @throws Error if refresh fails
 */
export const refreshTokens = async (
  refreshToken: string,
  options: Omit<SharedRefreshOptions, 'refreshToken'> = {},
): Promise<AuthResponse> => {
  if (!refreshToken) {
    throw new Error('Refresh token is missing');
  }

  const response = await sharedRefreshTokens({
    ...options,
    refreshToken,
  });

  if (response === null) {
    throw new Error('Refresh token is invalid or expired');
  }

  return response;
};

// ─── Shared singleton refresh (дедупликация) ───

/**
 * Единая точка обновления токена с дедупликацией.
 * Все вызовы (ApiClient, authService, auth-checker) должны использовать
 * эту функцию, чтобы одновременно летел только один POST /auth/refresh.
 *
 * @returns новый access_token или null (если refresh не удался)
 */
export const sharedRefreshAccessToken = async (): Promise<string | null> => {
  const response = await sharedRefreshTokens();
  return response?.access_token ?? null;
};

export const sharedRefreshTokens = (
  options: SharedRefreshOptions = {},
): Promise<AuthResponse | null> => {
  const scope = getScope(options.scope);
  const existingPromise = sharedRefreshPromises.get(scope);

  if (existingPromise) {
    return existingPromise;
  }

  const refreshPromise = performSharedRefresh({
    ...options,
    scope,
  }).finally(() => {
    sharedRefreshPromises.delete(scope);
  });

  sharedRefreshPromises.set(scope, refreshPromise);
  return refreshPromise;
};

async function performSharedRefresh(options: SharedRefreshOptions): Promise<AuthResponse | null> {
  if (typeof window === 'undefined') return null;

  const scope = getScope(options.scope);
  const currentRefreshToken = options.refreshToken ?? tokenStorage.getRefreshToken();
  if (!currentRefreshToken) return null;

  const startedAt = Date.now();

  if (!acquireRefreshLock(scope)) {
    return waitForRefreshCompletion(scope, startedAt);
  }

  try {
    const response = await performRefreshRequest(currentRefreshToken);

    if (options.persistToStorage !== false) {
      applyAuthResponseToStorage(response);
    }

    publishRefreshEvent({
      scope,
      sourceTabId: tabId,
      status: 'success',
      timestamp: Date.now(),
      response: options.persistToStorage === false ? response : undefined,
    });

    return response;
  } catch (error) {
    if (isAuthenticationRefreshError(error)) {
      if (options.invalidateSessionOnAuthFailure !== false) {
        invalidateCurrentSession({ reason: 'refresh_failed' });
      }

      publishRefreshEvent({
        scope,
        sourceTabId: tabId,
        status: 'auth_failure',
        timestamp: Date.now(),
      });

      return null;
    }

    publishRefreshEvent({
      scope,
      sourceTabId: tabId,
      status: 'transient_failure',
      timestamp: Date.now(),
    });

    throw new TransientRefreshError('Не удалось обновить токены из-за сетевой ошибки', error);
  } finally {
    releaseRefreshLock(scope);
  }
}
