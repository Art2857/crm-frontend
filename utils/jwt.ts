/**
 * Утилиты для работы с JWT токенами
 */

import { Role } from '../types/user';

export function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Некорректный формат JWT токена');

    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);

    // Универсальное декодирование base64 для браузера и SSR
    const base64ToString = (b64: string): string => {
      if (typeof window === 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf-8');
      }
      // browser
      // atob ожидает base64 без url-safe символов
      const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(
        Array.prototype.map
          .call(
            atob(normalized),
            (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join('')
      );
    };

    const decodedPayload = base64ToString(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch (error) {
    // не логируем в продакшне чтобы не шуметь
    return null;
  }
}

export function getJwtExpiry(token: string): number | null {
  const payload = decodeJWT(token);
  if (payload && typeof payload.exp === 'number') return payload.exp; // seconds
  return null;
}

export function isJwtExpired(token: string, skewSeconds: number = 30): boolean {
  const exp = getJwtExpiry(token);
  if (!exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp - skewSeconds;
}

export function getRoleFromToken(token: string): Role | null {
  const payload = decodeJWT(token);
  if (payload && payload.role) {
    return payload.role as Role;
  }
  // Если роль не найдена в токене, возвращаем роль по умолчанию
  return Role.WORKER;
}
