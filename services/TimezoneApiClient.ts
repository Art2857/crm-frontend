/**
 * Расширение ApiClient для автоматической передачи timezone
 *
 * ПРИМЕЧАНИЕ: Timezone уже автоматически добавляется в ApiClient.ts (строки 189-204)
 * Здесь оставляем только утилиты и пустую инициализацию для совместимости
 */

import { TimezoneStorage } from '../contexts/TimezoneContext';

/**
 * Инициализация timezone interceptor
 * Timezone уже встроен в ApiClient, поэтому это пустая функция
 */
export const initializeTimezoneSupport = () => {
  // Timezone уже автоматически добавляется в ApiClient.ts
  // Никаких дополнительных действий не требуется
};

/**
 * Утилиты для работы с timezone в API
 */
export const TimezoneApiUtils = {
  /**
   * Получить текущий timezone пользователя
   */
  getCurrentTimezone(): string {
    return TimezoneStorage.get() || TimezoneStorage.default;
  },

  /**
   * Установить timezone и обновить его в API
   */
  setTimezone(timezone: string): void {
    TimezoneStorage.set(timezone);
    // При следующем запросе новый timezone будет автоматически добавлен
  },

  /**
   * Проверить поддерживается ли timezone
   */
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  },
};
