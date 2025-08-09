import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../store';
import { authService } from '../../services/auth';
import { SavedAccount } from '../../services/accountManager';
import { setCredentials, logout } from '../../store/slices/auth';
import Button from './Button';

interface AccountSwitcherProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

// Компонент для отображения содержимого через портал
const AccountSwitcherContent: React.FC<AccountSwitcherProps> = ({
  currentUserId,
  isOpen,
  onClose,
  isMobile = false,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();

      // Автоматически позиционируем меню относительно кнопки
      setTimeout(() => {
        const setMenuPosition = () => {
          const button = isMobile
            ? document.getElementById('mobile-account-menu-button')
            : document.getElementById('account-menu-button');

          if (button && dropdownRef.current) {
            const buttonRect = button.getBoundingClientRect();
            const menuRect = dropdownRef.current.getBoundingClientRect();

            // Для десктопной версии позиционируем справа
            if (!isMobile) {
              const right = window.innerWidth - buttonRect.right;
              dropdownRef.current.style.position = 'fixed';
              dropdownRef.current.style.top = `${buttonRect.bottom}px`;
              dropdownRef.current.style.right = `${right}px`;

              // Проверяем, поместится ли меню по высоте
              const spaceBelow = window.innerHeight - buttonRect.bottom;
              if (spaceBelow < menuRect.height) {
                dropdownRef.current.style.maxHeight = `${spaceBelow - 10}px`;
              }
            }
            // Для мобильной версии центрируем по кнопке
            else {
              dropdownRef.current.style.position = 'absolute';
              dropdownRef.current.style.width = `${buttonRect.width}px`;
              dropdownRef.current.style.top = '100%';
              dropdownRef.current.style.left = '0';
            }
          }
        };

        setMenuPosition();
        window.addEventListener('resize', setMenuPosition);

        return () => {
          window.removeEventListener('resize', setMenuPosition);
        };
      }, 0);
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    // Обработчик клика вне элемента для закрытия
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Обработчик клавиши Escape
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Используем capture phase чтобы перехватить события до того, как они дойдут до других элементов
      document.addEventListener('mousedown', handleOutsideClick, true);
      document.addEventListener('keydown', handleEscapeKey as any, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscapeKey as any, true);
    };
  }, [isOpen, onClose]);

  const loadAccounts = () => {
    const savedAccounts = authService.getSavedAccounts();
    setAccounts(savedAccounts);
  };

  const handleSwitchAccount = (accountId: string) => {
    if (accountId === currentUserId) {
      return;
    }

    setIsLoading(true);
    try {
      // Переключаем аккаунт через сервис
      const account = authService.switchAccount(accountId);
      if (account) {
        // Обновляем Redux store
        dispatch(
          setCredentials({
            user: account.user,
            token: account.token,
          })
        );

        // Закрываем меню
        onClose();

        // Переходим на страницу аккаунтов
        setTimeout(() => {
          router.push('/accounts');
        }, 100);
      }
    } catch (error) {
      console.error('Ошибка при переключении аккаунта:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string) => {
    // Предотвращаем всплытие события
    e.preventDefault();
    e.stopPropagation();

    authService.removeAccount(accountId);
    loadAccounts();
  };

  const navigateToLogin = () => {
    // Сначала закрываем меню
    onClose();

    // Затем выходим и переходим на страницу логина
    setTimeout(() => {
      dispatch(logout());
      router.push('/login?from=accounts');
    }, 50);
  };

  const navigateToAccounts = () => {
    // Сначала закрываем меню
    onClose();

    // Затем переходим на страницу управления аккаунтами
    setTimeout(() => {
      router.push('/accounts');
    }, 50);
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLLIElement>,
    accountId: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSwitchAccount(accountId);
    }
  };

  const dropdownClasses = `
    bg-white rounded-md shadow-lg z-[100] overflow-hidden
    ${isMobile ? 'w-full' : 'absolute right-0 mt-2 w-72'}
  `;

  return (
    <div
      ref={dropdownRef}
      className={dropdownClasses}
      style={{ position: isMobile ? 'relative' : 'absolute' }}
    >
      <div className="py-2 px-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">
          Переключение аккаунтов
        </h3>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center">
            Нет сохраненных аккаунтов
          </p>
        ) : (
          <ul className="py-1">
            {accounts.map((account) => (
              <li
                key={account.id}
                onClick={() => handleSwitchAccount(account.id)}
                onKeyDown={(e) => handleKeyDown(e, account.id)}
                tabIndex={0}
                role="button"
                aria-label={`Переключиться на аккаунт ${account.user.firstName} ${account.user.lastName}`}
                className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                  account.id === currentUserId ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">
                    {account.user.firstName || account.user.lastName
                      ? `${account.user.firstName || ''} ${account.user.lastName || ''}`.trim()
                      : account.user.email.split('@')[0]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {account.user.email}
                  </span>
                </div>
                {account.id !== currentUserId && (
                  <button
                    onClick={(e) => handleRemoveAccount(e, account.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Удалить аккаунт"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="py-2 px-4 border-t border-gray-200">
        <div className="flex flex-col space-y-2">
          {/* Используем div с обработчиками вместо Button компонента для большей надежности */}
          <div
            className="flex items-center justify-center px-4 py-2 text-xs font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer min-h-[44px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToLogin();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToLogin();
            }}
          >
            Войти в другой аккаунт
          </div>

          {/* Используем div с обработчиками вместо Button компонента для большей надежности */}
          <div
            className="flex items-center justify-center px-4 py-2 text-xs font-medium border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer min-h-[44px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToAccounts();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateToAccounts();
            }}
          >
            Управление аккаунтами
          </div>
        </div>
      </div>
    </div>
  );
};

// Основной компонент, использующий портал для вывода контента вне DOM-дерева
const AccountSwitcher: React.FC<AccountSwitcherProps> = (props) => {
  const { isOpen, onClose } = props;

  // Если меню закрыто, ничего не рендерим
  if (!isOpen) return null;

  // Если мы в браузере, используем портал для рендеринга вне текущего DOM-дерева
  if (typeof window !== 'undefined') {
    try {
      // Защищаем от ошибок в DOM
      // Получаем или создаем div для портала
      let portalRoot = document.getElementById('account-switcher-portal');
      if (!portalRoot) {
        portalRoot = document.createElement('div');
        portalRoot.id = 'account-switcher-portal';
        portalRoot.style.position = 'absolute';
        portalRoot.style.top = '0';
        portalRoot.style.left = '0';
        portalRoot.style.width = '100%';
        portalRoot.style.zIndex = '9999';
        document.body.appendChild(portalRoot);
      }

      // Добавляем обработчик клика на весь документ для закрытия меню
      // за пределами компонента
      const handleDocumentClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isClickInside = portalRoot?.contains(target);
        const isClickOnTrigger =
          document.getElementById('account-menu-button')?.contains(target) ||
          document
            .getElementById('mobile-account-menu-button')
            ?.contains(target);

        if (!isClickInside && !isClickOnTrigger) {
          onClose();
        }
      };

      document.addEventListener('click', handleDocumentClick, {
        capture: true,
        once: true,
      });

      // Рендерим через портал
      return createPortal(<AccountSwitcherContent {...props} />, portalRoot);
    } catch (error) {
      console.error('Ошибка при создании портала:', error);
      // В случае ошибки возвращаем обычный компонент
      return <AccountSwitcherContent {...props} />;
    }
  }

  // Для SSR возвращаем обычный компонент
  return <AccountSwitcherContent {...props} />;
};

export default AccountSwitcher;
