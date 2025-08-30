/**
 * Логгер с поддержкой отключения в продакшене
 */

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  info(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: any) {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, error?: any) {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error);
    }
  }

  debug(message: string, data?: any) {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
}

export const logger = new Logger();