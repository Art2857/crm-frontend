'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { getCurrentUser } from '../store/slices/auth';
import { authService } from '../services/auth';

export default function AuthChecker({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useAppSelector((state) => state.auth);
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
        
        console.log('AuthChecker: проверка аутентификации', { 
          hasToken, 
          isAuthenticated, 
          hasUser: !!user,
          authLoading 
        });
        
        if (hasToken && (!isAuthenticated || !user)) {
          // Если токен есть в localStorage, но состояние не аутентифицировано 
          // или данные пользователя не загружены - получаем текущего пользователя
          console.log('AuthChecker: загружаем данные пользователя');
          await dispatch(getCurrentUser()).unwrap();
        } else if (!hasToken && isAuthenticated) {
          // Если токена нет, но состояние показывает аутентификацию - очищаем состояние
          console.log('AuthChecker: токен отсутствует, но состояние аутентифицировано - очищаем');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refresh_token');
          }
        }
      } catch (error: any) {
        console.error('AuthChecker: ошибка при проверке аутентификации:', error);
        
        // Игнорируем отмененные запросы
        if (error.message === 'REQUEST_CANCELLED') {
          console.log('AuthChecker: запрос был отменен, игнорируем');
          return;
        }
        
        // Если произошла ошибка при проверке токена, очищаем localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refresh_token');
        }
      } finally {
        // Завершаем инициализацию в любом случае
        setIsInitializing(false);
      }
    };

    checkAuthentication();
  }, [dispatch, isAuthenticated, user, authLoading]);

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