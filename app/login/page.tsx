'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, getCurrentUser, setCredentials } from '../../store/slices/auth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Link from 'next/link';
import { authService } from '../../services/auth';
import accountNavigation from '../../utils/accountNavigation';

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get('mode') === 'add';
  const { isLoading, error, isAuthenticated, user } = useAppSelector(
    (state) => state.auth
  );
  const [serverError, setServerError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Проверяем, нужно ли показать кнопку "Вернуться назад"
  const [showBackButton, setShowBackButton] = useState(false);

  // Загружаем состояние флага возврата при монтировании компонента
  useEffect(() => {
    setShowBackButton(accountNavigation.shouldShowBackButton() || isAddMode);
  }, [isAddMode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  // Проверяем, авторизован ли пользователь при загрузке страницы
  useEffect(() => {
    // Если пользователь уже авторизован и не в режиме добавления аккаунта,
    // перенаправляем на дашборд

    if (isAuthenticated && !showBackButton && !isAddMode) {
      router.push('/dashboard');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router, isAuthenticated, showBackButton, isAddMode]);

  // Очищаем флаг возврата при успешном входе
  useEffect(() => {
    return () => {
      // При размонтировании компонента, если пользователь авторизован,
      // снимаем флаг возврата к аккаунтам
      if (isAuthenticated) {
        accountNavigation.setReturnToAccounts(false);
      }
    };
  }, [isAuthenticated]);

  // Обработчик возврата на страницу аккаунтов
  const handleBackToAccounts = () => {
    // Используем функцию из accountNavigation для принудительного перехода
    accountNavigation.returnToAccounts();
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError('');

      // Если мы в режиме добавления аккаунта, используем специальный метод
      if (isAddMode) {
        try {
          // Используем метод addAccountLogin, который не изменяет текущий токен
          const response = await authService.addAccountLogin(data);

          // Обновляем Redux store с данными нового аккаунта
          dispatch(
            setCredentials({
              user: response.user,
              token: response.access_token,
            })
          );

          // Загружаем полные данные пользователя
          await dispatch(getCurrentUser());

          // После успешного входа перенаправляем на страницу аккаунтов
          router.push('/accounts');
        } catch (error: any) {
          setServerError(
            error.response?.data?.message || 'Произошла ошибка при входе'
          );
        }
      } else {
        // Стандартный процесс входа через Redux
        const resultAction = await dispatch(login(data));

        if (login.fulfilled.match(resultAction)) {
          // Второй шаг - получить полные данные пользователя
          await dispatch(getCurrentUser());
          router.push('/dashboard');
        } else if (login.rejected.match(resultAction) && resultAction.payload) {
          setServerError(resultAction.payload as string);
        }
      }
    } catch (error) {
      setServerError('Произошла ошибка при входе');
    }
  };

  // Показываем загрузку, пока проверяем авторизацию
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isAddMode || showBackButton
            ? 'Вход в новый аккаунт'
            : 'Вход в систему'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          {showBackButton && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToAccounts}
                className="w-full"
              >
                ← Вернуться к управлению аккаунтами
              </Button>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="email"
              label="Email"
              type="email"
              fullWidth
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email обязателен',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Некорректный email',
                },
              })}
            />

            <Input
              id="password"
              label="Пароль"
              type="password"
              fullWidth
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Пароль обязателен',
                minLength: {
                  value: 6,
                  message: 'Пароль должен содержать минимум 6 символов',
                },
              })}
            />

            {(error || serverError) && (
              <div className="text-red-500 text-sm">{error || serverError}</div>
            )}

            <div>
              <Button type="submit" width="full" isLoading={isLoading}>
                Войти
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-sm text-center">
              <Link
                href={isAddMode ? '/register?mode=add' : '/register'}
                className="font-medium text-primary-600 hover:text-primary-500"
                onClick={() => {
                  // Если включен режим возврата к аккаунтам, сохраняем его при переходе на регистрацию
                  if (showBackButton) {
                    accountNavigation.setReturnToAccounts(true);
                  }
                }}
              >
                Еще нет аккаунта? Зарегистрироваться
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
