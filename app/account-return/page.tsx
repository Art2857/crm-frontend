'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import accountNavigation from '../../utils/accountNavigation';
import { authService } from '../../services/auth';

/**
 * Страница для возврата к управлению аккаунтами
 * Помогает решить проблему с перенаправлениями при переключении аккаунтов
 */
export default function AccountReturnPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [redirecting, setRedirecting] = useState(false);
  const [hasSavedAccounts, setHasSavedAccounts] = useState(false);

  // Проверяем наличие сохраненных аккаунтов при загрузке страницы
  useEffect(() => {
    const accounts = authService.getSavedAccounts();
    setHasSavedAccounts(accounts.length > 0);
  }, []);

  // Проверяем статус авторизации и перенаправляем соответственно
  useEffect(() => {
    // Если пользователь авторизован или есть сохраненные аккаунты,
    // перенаправляем на страницу аккаунтов
    if (isAuthenticated || hasSavedAccounts) {
      setRedirecting(true);
      // Сбрасываем флаг возврата
      accountNavigation.setReturnToAccounts(false);
      // Перенаправляем на страницу аккаунтов
      setTimeout(() => {
        router.push('/accounts');
      }, 100);
    }
  }, [isAuthenticated, hasSavedAccounts, router]);

  // Обработчик возврата к списку аккаунтов
  const handleLogin = () => {
    router.push('/login');
  };

  // Обработчик продолжения с добавлением нового аккаунта
  const handleContinue = () => {
    // Перенаправляем пользователя на страницу логина
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Управление аккаунтами
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {redirecting
            ? 'Перенаправление на страницу аккаунтов...'
            : hasSavedAccounts
              ? 'У вас уже есть сохраненные аккаунты, перенаправление...'
              : 'Для возврата к списку аккаунтов необходимо войти в один из ваших аккаунтов'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          {redirecting ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="text-sm text-gray-500">
                {hasSavedAccounts ? (
                  <p>Перенаправление на страницу управления аккаунтами...</p>
                ) : (
                  <p>
                    У вас нет активных аккаунтов. Чтобы увидеть список ваших
                    аккаунтов, необходимо сначала войти в один из них.
                  </p>
                )}
              </div>

              {!hasSavedAccounts && (
                <div className="space-y-3">
                  <Button width="full" onClick={handleLogin}>
                    Войти в аккаунт
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={handleContinue}
                      className="text-sm font-medium text-primary-600 hover:text-primary-500"
                    >
                      Продолжить вход в новый аккаунт
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
