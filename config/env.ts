/**
 * Централизованная работа с переменными окружения на фронтенде
 * Безопасно читает значения и задаёт дефолты для dev
 */

type AppEnv = {
  apiBaseUrl: string;
  ignoreSsl: boolean;
  nodeEnv: 'development' | 'production' | 'test' | string | undefined;
};

const getString = (value: string | undefined, fallback: string): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
};

const getBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
};

export const env: AppEnv = {
  apiBaseUrl: getString(
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:3000'
  ),
  ignoreSsl: getBoolean(process.env.NEXT_PUBLIC_IGNORE_SSL, false),
  nodeEnv: process.env.NODE_ENV,
};

export const isProduction = env.nodeEnv === 'production';
export const isDevelopment = env.nodeEnv !== 'production';
