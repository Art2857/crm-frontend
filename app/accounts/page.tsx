'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../store';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { authService } from '../../services/auth';
import { SavedAccount } from '../../services/accountManager';
import { setCredentials, logout } from '../../store/slices/auth';
import accountNavigation from '../../utils/accountNavigation';
import { useModal } from '../../contexts/ModalContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { confirm, alert } = useModal();
  const { showSuccess, showError, showInfo } = useNotification();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Загружаем список аккаунтов
    loadAccounts();

    // Очищаем флаг возврата, если он был установлен
    accountNavigation.setReturnToAccounts(false);
  }, [isAuthenticated, router]);

  const loadAccounts = () => {
    const savedAccounts = authService.getSavedAccounts();
    setAccounts(savedAccounts);
  };

  const handleSwitchAccount = async (accountId: string) => {
    if (!user || accountId === user.id) {
      return;
    }

    setIsLoading(true);
    try {
      const account = await authService.switchAccount(accountId);
      if (account) {
        dispatch(
          setCredentials({
            user: account.user,
            token: account.token,
          }),
        );
        showSuccess('Аккаунт успешно переключен');

        // Reload accounts list to show updated data
        loadAccounts();

        // Stay on accounts page
        router.push('/accounts');
      }
    } catch (error) {
      console.error('Error switching account:', error);

      if (error instanceof Error && error.message.includes('Re-authentication required')) {
        showInfo('Переключение аккаунта отменено');
      } else {
        showError('Не удалось переключить аккаунт. Попробуйте еще раз.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    // Нельзя удалить текущий аккаунт
    if (user && accountId === user.id) {
      await alert({
        title: 'Невозможно удалить аккаунт',
        message: 'Невозможно удалить текущий аккаунт. Сначала переключитесь на другой аккаунт.',
        variant: 'danger',
      });
      return;
    }

    authService.removeAccount(accountId);
    loadAccounts();
  };

  const handleAddNewAccount = async () => {
    // Спрашиваем пользователя, хочет ли он добавить новый аккаунт
    const isConfirmed = await confirm({
      title: 'Добавление нового аккаунта',
      message:
        'Вы хотите добавить новый аккаунт? Для этого вам нужно будет войти в него, но вы останетесь в своем текущем аккаунте.',
      confirmText: 'Добавить',
      cancelText: 'Отмена',
    });

    if (isConfirmed) {
      // Сохраняем идентификатор текущего аккаунта для возможности возврата
      if (user) {
        accountNavigation.saveCurrentAccountId(user.id);
      }

      // Устанавливаем флаг возврата к аккаунтам
      accountNavigation.setReturnToAccounts(true);

      // Перенаправляем на страницу входа (но не выходим из текущего аккаунта)
      router.push('/login?mode=add');
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 pb-8 pt-0">
        <h1 className="text-2xl font-bold mb-6">Управление аккаунтами</h1>

        <Card className="mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Ваши аккаунты</h2>
            <p className="text-sm text-gray-500 mt-1">
              Здесь вы можете управлять всеми сохраненными аккаунтами и быстро переключаться между
              ними.
            </p>
          </div>

          {accounts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">У вас пока нет сохраненных аккаунтов</p>
              <Button onClick={handleAddNewAccount}>Добавить аккаунт</Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className={`p-4 hover:bg-gray-50 ${account.id === user.id ? 'bg-primary-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {account.user.firstName || account.user.lastName
                          ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim()
                          : account.user.login}
                        {account.id === user.id && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Текущий
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {account.user.email || 'Email не указан'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Последний вход: {new Date(account.lastUsed).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {account.id !== user.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSwitchAccount(account.id)}
                            isLoading={isLoading}
                          >
                            Переключиться
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveAccount(account.id)}
                          >
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="p-4 border-t border-gray-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Button variant="primary" onClick={handleAddNewAccount}>
              Добавить новый аккаунт
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await authService.logoutFromServer();
                  // Обнулим состояние и отправим на логин
                  dispatch(logout());
                  router.push('/login');
                } catch (e) {
                  console.error('Ошибка при выходе со всех устройств', e);
                }
              }}
            >
              Выйти на всех устройствах
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
