import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { getCurrentUser } from '../store/slices/auth';

/**
 * Hook для отслеживания переключения между аккаунтами
 * @returns { refreshUserData } - функция для обновления данных пользователя
 */
export function useAccountSwitcher() {
  const [lastSwitchedAccountId, setLastSwitchedAccountId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Обновление данных пользователя
  const refreshUserData = () => {
    dispatch(getCurrentUser());
  };

  // Слушаем событие переключения аккаунта
  useEffect(() => {
    const handleAccountSwitch = (event: CustomEvent<{ accountId: string }>) => {
      const { accountId } = event.detail;
      setLastSwitchedAccountId(accountId);
      refreshUserData();
    };

    // Добавляем слушатель события
    window.addEventListener('accountSwitched', handleAccountSwitch as EventListener);

    // Очищаем слушатель при размонтировании
    return () => {
      window.removeEventListener('accountSwitched', handleAccountSwitch as EventListener);
    };
  }, [dispatch]);

  return {
    refreshUserData,
    lastSwitchedAccountId,
  };
}

export default useAccountSwitcher;
