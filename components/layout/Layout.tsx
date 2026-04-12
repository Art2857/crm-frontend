'use client';

import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import Link from 'next/link';
import { Role } from '../../types/user';
import { logout } from '../../store/slices/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useModal } from '../../contexts/ModalContext';
import Avatar from '../profile/Avatar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { confirm } = useModal();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user?.role === Role.ADMIN;
  const isManager = user?.role === Role.MANAGER;

  // Мемоизируем обработчик выхода из системы
  const handleLogout = useCallback(async () => {
    // Спрашиваем подтверждение выхода
    const isConfirmed = await confirm({
      title: 'Выход из системы',
      message: 'Вы уверены, что хотите выйти из системы?',
      confirmText: 'Выйти',
      cancelText: 'Отмена',
      variant: 'danger',
    });

    if (isConfirmed) {
      dispatch(logout());
      router.push('/login');
    }
  }, [dispatch, router, confirm]);

  const navigation = [
    { name: 'Главная', href: '/dashboard', visible: isAuthenticated },
    { name: 'Работы', href: '/works', visible: isAuthenticated },
    { name: 'Выплаты', href: '/payments', visible: isAuthenticated },
    {
      name: 'Котировки валют',
      href: '/exchange-rates',
      visible: isAuthenticated,
    },
    {
      name: 'Пользователи',
      href: '/admin/users',
      visible: isAuthenticated && (isAdmin || isManager),
    },
    {
      name: 'Обязанности',
      href: '/admin/duties',
      visible: isAuthenticated && (isAdmin || isManager),
    },
    { name: 'Аккаунты', href: '/accounts', visible: isAuthenticated },
  ];

  // Обработчик клика вне меню для закрытия мобильного меню
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Проверяем, был ли клик вне мобильного меню
      if (!target.closest('.mobile-menu') && !target.closest('button[aria-expanded]')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-primary-600">
                  CRM Система
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation
                  .filter((item) => item.visible)
                  .map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      {item.name}
                    </Link>
                  ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <span className="sr-only">Профиль</span>
                    {user && <Avatar user={user} size="tiny" className="shadow-sm" />}
                    <span className="text-sm font-medium hidden sm:block">
                      {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
                        user?.email ||
                        'Пользователь'}
                    </span>
                  </Link>

                  <button
                    type="button"
                    className="ml-4 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={handleLogout}
                  >
                    <span className="sr-only">Выйти</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                type="button"
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                aria-expanded="false"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Открыть меню</span>
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное меню */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:hidden mobile-menu`}>
          <div className="pt-2 pb-3 space-y-1">
            {navigation
              .filter((item) => item.visible)
              .map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                >
                  {item.name}
                </Link>
              ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <Link
              href="/profile"
              className="flex items-center px-4 hover:bg-gray-50 transition-colors py-2"
            >
              <div className="flex-shrink-0">{user && <Avatar user={user} size="small" />}</div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
                    user?.email ||
                    'Пользователь'}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </Link>
            <div className="mt-3 space-y-1">
              <button
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
