import { tokenStorage } from './tokenStorage';

const ACCOUNTS_STORAGE_KEY = 'crm_saved_accounts';
const CURRENT_ACCOUNT_ID_KEY = 'crm_current_account_id';

interface InvalidateSessionOptions {
  reason?: string;
  removeCurrentAccount?: boolean;
}

interface StoredAccount {
  id?: string;
}

export const invalidateCurrentSession = ({
  reason,
  removeCurrentAccount = true,
}: InvalidateSessionOptions = {}): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentAccountId = window.localStorage.getItem(CURRENT_ACCOUNT_ID_KEY);

    tokenStorage.clearAll();

    if (!removeCurrentAccount || !currentAccountId) {
      return;
    }

    const rawAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsedAccounts = rawAccounts ? (JSON.parse(rawAccounts) as StoredAccount[]) : [];
    const nextAccounts = Array.isArray(parsedAccounts)
      ? parsedAccounts.filter((account) => account?.id !== currentAccountId)
      : [];

    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));

    if (nextAccounts.length > 0 && typeof nextAccounts[0]?.id === 'string') {
      window.localStorage.setItem(CURRENT_ACCOUNT_ID_KEY, nextAccounts[0].id);
    } else {
      window.localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
    }

    if (reason) {
      window.dispatchEvent(
        new CustomEvent('authSessionInvalidated', {
          detail: {
            reason,
            removedAccountId: currentAccountId,
          },
        }),
      );
    }
  } catch {
    tokenStorage.clearAll();
    window.localStorage.removeItem(CURRENT_ACCOUNT_ID_KEY);
  }
};
