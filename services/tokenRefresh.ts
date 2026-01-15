import { AuthResponse } from '../types/auth';
import { authApi } from './ApiClient';
import { AUTH_ENDPOINTS } from './endpoints';
import { tokenStorage } from './tokenStorage';

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
    return currentTime >= (expirationTime - bufferTime);
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
 * @returns AuthResponse with new tokens and user data
 * @throws Error if refresh fails
 */
export const refreshTokens = async (refreshToken: string): Promise<AuthResponse> => {
  if (!refreshToken) {
    throw new Error('Refresh token is missing');
  }

  try {
    const response = await authApi.post<AuthResponse>(
      AUTH_ENDPOINTS.refresh,
      { refreshToken }
    );

    const {
      access_token,
      refresh_token,
      access_token_expires_at,
      refresh_token_expires_at,
    } = response.data;

    // Update tokenStorage with new tokens and expiration dates
    tokenStorage.setAccessToken(access_token);
    if (refresh_token) {
      tokenStorage.setRefreshToken(refresh_token);
    }
    if (access_token_expires_at) {
      tokenStorage.setAccessTokenExpiresAt(access_token_expires_at);
    }
    if (refresh_token_expires_at) {
      tokenStorage.setRefreshTokenExpiresAt(refresh_token_expires_at);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to refresh tokens:', error);
    throw error;
  }
};
