'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { getCurrentUser } from '../store/slices/auth';
import { authService } from '../services/auth';
import { tokenStorage } from '../services/tokenStorage';
import { logger } from '../utils/logger';
import { isJwtExpired, getRoleFromToken } from '../utils/jwt';

export default function AuthChecker({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const {
    isAuthenticated,
    user,
    isLoading: authLoading,
  } = useAppSelector((state) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);
  const initializationRef = useRef(false); // Предотвращаем множественные инициализации

  useEffect(() => {
    // Если уже инициализируется, не запускаем повторно
    if (initializationRef.current) {
      return;
    }

    // Проверяем наличие токена в localStorage
    const checkAuthentication = async () => {
      initializationRef.current = true;

      try {
        const hasToken = authService.isAuthenticated();
        const token = tokenStorage.getAccessToken();

        logger.debug('AuthChecker: проверка аутентификации', {
          hasToken,
          isAuthenticated,
          hasUser: !!user,
          authLoading,
        });

        // Если токен есть, но истёк — попробуем рефрешнуть заранее
        if (token && isJwtExpired(token)) {
          try {
            logger.info('🔄 AuthChecker: access token истёк, пробуем refresh');
            await authService.refreshTokens();
          } catch (e) {
            logger.warn('❌ AuthChecker: refresh не удался, выходим');
            // Очистка и редирект
            tokenStorage.clearAll();
            if (typeof window !== 'undefined') {
              localStorage.setItem(
                'redirectAfterLogin',
                window.location.pathname
              );
              window.location.href = '/login';
              return;
            }
          }
        }

        if (hasToken && (!isAuthenticated || !user)) {
          // Если токен есть в localStorage, но состояние не аутентифицировано
          // или данные пользователя не загружены - получаем текущего пользователя
          logger.debug('AuthChecker: загружаем данные пользователя');

          // Получаем роль из токена, если пользователь не загружен
          const currentToken = tokenStorage.getAccessToken();
          const role =
            user?.role ||
            (currentToken ? getRoleFromToken(currentToken) : null);

          if (role) {
            await dispatch(getCurrentUser()).unwrap();
          } else {
            // Если не можем определить роль, очищаем состояние
            logger.warn('AuthChecker: не удалось определить роль пользователя');
            tokenStorage.clearAll();
          }
        } else if (!hasToken && isAuthenticated) {
          // Если токена нет, но состояние показывает аутентификацию - очищаем состояние
          logger.debug(
            'AuthChecker: токен отсутствует, но состояние аутентифицировано - очищаем'
          );
          tokenStorage.clearAll();
        }
      } catch (error: any) {
        logger.error('AuthChecker: ошибка при проверке аутентификации:', error);

        // Игнорируем отмененные запросы
        if (error.message === 'REQUEST_CANCELLED') {
          // Тихо игнорируем отмену
          return;
        }

        // Если произошла ошибка при проверке токена, очищаем localStorage
        tokenStorage.clearAll();
      } finally {
        // Завершаем инициализацию в любом случае
        setIsInitializing(false);
      }
    };

    checkAuthentication();
  }, [dispatch, isAuthenticated, user, authLoading]);

  // На переключение вкладки/возврат в приложение — проверяем срок действия токена
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const token = tokenStorage.getAccessToken();
      if (!token) return;
      if (isJwtExpired(token)) {
        try {
          logger.info(
            '🔄 AuthChecker: вкладка активирована, token истёк — refresh'
          );
          await authService.refreshTokens();
        } catch (e) {
          tokenStorage.clearAll();
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'redirectAfterLogin',
              window.location.pathname
            );
            window.location.href = '/login';
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Если инициализация еще не завершена, показываем индикатор загрузки
  if (isInitializing || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <span className="ml-4 text-gray-600">Проверка аутентификации...</span>
      </div>
    );
  }

  return <>{children}</>;
}
