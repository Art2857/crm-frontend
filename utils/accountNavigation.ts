// Константа для ключа в localStorage
const RETURN_TO_ACCOUNTS_KEY = 'return_to_accounts';
const PREVIOUS_ACCOUNT_KEY = 'previous_account_id';

/**
 * Утилита для управления навигацией между страницами аккаунтов
 * с возможностью возврата назад
 */
export const accountNavigation = {
  /**
   * Проверяет, нужно ли показать кнопку возврата
   */
  shouldShowBackButton(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(RETURN_TO_ACCOUNTS_KEY) === 'true';
  },

  /**
   * Устанавливает флаг возврата
   */
  setReturnToAccounts(value: boolean): void {
    if (typeof window === 'undefined') return;
    if (value) {
      localStorage.setItem(RETURN_TO_ACCOUNTS_KEY, 'true');
    } else {
      localStorage.removeItem(RETURN_TO_ACCOUNTS_KEY);
    }
  },

  /**
   * Сохраняет идентификатор текущего аккаунта для возможности восстановления
   */
  saveCurrentAccountId(accountId: string | null): void {
    if (typeof window === 'undefined') return;
    if (accountId) {
      localStorage.setItem(PREVIOUS_ACCOUNT_KEY, accountId);
    } else {
      localStorage.removeItem(PREVIOUS_ACCOUNT_KEY);
    }
  },

  /**
   * Получает идентификатор сохраненного аккаунта
   */
  getSavedAccountId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(PREVIOUS_ACCOUNT_KEY);
  },

  /**
   * Проверяет, есть ли сохраненный аккаунт
   */
  hasSavedAccount(): boolean {
    return !!this.getSavedAccountId();
  },

  /**
   * Удаляет информацию о сохраненном аккаунте
   */
  clearSavedAccount(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PREVIOUS_ACCOUNT_KEY);
  },

  /**
   * Возвращает путь страницы-моста для возврата к аккаунтам
   */
  getReturnPath(): string {
    return '/account-return';
  },

  /**
   * Выполняет переход на страницу-мост
   * Эта функция должна быть вызвана только в обработчиках событий
   */
  returnToAccounts(): void {
    // Не сбрасываем флаг возврата, чтобы страница-мост могла проверить его

    // Перенаправляем на страницу-мост для возврата к аккаунтам
    window.location.href = this.getReturnPath();
  },
};

export default accountNavigation;
