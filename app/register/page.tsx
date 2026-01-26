'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  register as registerUser,
  getCurrentUser,
  setCredentials,
} from '../../store/slices/auth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Link from 'next/link';
import { authService } from '../../services/auth';
import accountNavigation from '../../utils/accountNavigation';

type RegisterFormData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
};

export default function RegisterPage() {
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
  } = useForm<RegisterFormData>();

  // Проверяем, авторизован ли пользователь при загрузке страницы
  useEffect(() => {
    // Добавляем небольшую задержку, чтобы AuthChecker успел обработать токен
    const timer = setTimeout(() => {
      // Если пользователь уже авторизован и не в режиме добавления аккаунта,
      // перенаправляем на дашборд
      if (isAuthenticated && !showBackButton && !isAddMode) {
        router.push('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [router, isAuthenticated, showBackButton, isAddMode]);

  // Очищаем флаг возврата при успешной регистрации
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

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError('');

      // Если мы в режиме добавления аккаунта, используем специальный метод
      if (isAddMode) {
        try {
          // Используем метод addAccountRegister, который не изменяет текущий токен
          const response = await authService.addAccountRegister(data);

          // Обновляем Redux store с данными нового аккаунта
          dispatch(
            setCredentials({
              user: response.user,
              token: response.access_token,
            })
          );

          // Загружаем полные данные пользователя
          await dispatch(getCurrentUser());

          // После успешной регистрации перенаправляем на страницу аккаунтов
          router.push('/accounts');
        } catch (error: any) {
          setServerError(
            error.response?.data?.message || 'Произошла ошибка при регистрации'
          );
        }
      } else {
        // Стандартный процесс регистрации через Redux
        const resultAction = await dispatch(registerUser(data));

        if (registerUser.fulfilled.match(resultAction)) {
          // Второй шаг - получить полные данные пользователя
          await dispatch(getCurrentUser());
          router.push('/profile');
        } else if (
          registerUser.rejected.match(resultAction) &&
          resultAction.payload
        ) {
          setServerError(resultAction.payload as string);
        }
      }
    } catch (error) {
      setServerError('Произошла ошибка при регистрации');
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
            ? 'Регистрация нового аккаунта'
            : 'Регистрация в системе'}
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
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Пароль обязателен',
                minLength: {
                  value: 8,
                  message: 'Пароль должен содержать минимум 8 символов',
                },
                validate: (value) => {
                  const hasUpper = /[A-Z]/.test(value);
                  const hasLower = /[a-z]/.test(value);
                  const hasNumber = /\d/.test(value);
                  const hasSpecial = /[^A-Za-z0-9]/.test(value);
                  const passedChecks = [
                    hasUpper,
                    hasLower,
                    hasNumber,
                    hasSpecial,
                  ].filter(Boolean).length;
                  return (
                    passedChecks >= 3 ||
                    'Пароль должен содержать минимум 3 из типов: заглавные, строчные, цифры, спецсимволы'
                  );
                },
              })}
            />

            <Input
              id="firstName"
              label="Имя"
              fullWidth
              error={errors.firstName?.message}
              {...register('firstName', {
                required: 'Имя обязательно',
              })}
            />

            <Input
              id="lastName"
              label="Фамилия"
              fullWidth
              error={errors.lastName?.message}
              {...register('lastName', {
                required: 'Фамилия обязательна',
              })}
            />

            <Input
              id="middleName"
              label="Отчество (при наличии)"
              fullWidth
              error={errors.middleName?.message}
              {...register('middleName')}
            />

            {(error || serverError) && (
              <div className="text-red-500 text-sm">{error || serverError}</div>
            )}

            <div>
              <Button type="submit" width="full" isLoading={isLoading}>
                Зарегистрироваться
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-sm text-center">
              <Link
                href={isAddMode ? '/login?mode=add' : '/login'}
                className="font-medium text-primary-600 hover:text-primary-500"
                onClick={() => {
                  // Если включен режим возврата к аккаунтам, сохраняем его при переходе на логин
                  if (showBackButton) {
                    accountNavigation.setReturnToAccounts(true);
                  }
                }}
              >
                Уже есть аккаунт? Войти
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
