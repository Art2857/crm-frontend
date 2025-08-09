import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../store';
import { authService } from '../../services/auth';
import { SavedAccount } from '../../services/accountManager';
import { setCredentials, logout } from '../../store/slices/auth';
import Modal from './Modal';
import accountNavigation from '../../utils/accountNavigation';
import { useModal } from '../../contexts/ModalContext';

interface AccountMenuProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

const AccountMenu: React.FC<AccountMenuProps> = ({
  currentUserId,
  isOpen,
  onClose,
  triggerRef,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { confirm } = useModal();

  // Загружаем аккаунты при открытии меню
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      updatePosition();
    }
  }, [isOpen]);

  // Обновляем положение меню при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, triggerRef]);

  // Функция для расчета положения меню
  const updatePosition = () => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    }
  };

  // Загрузка списка аккаунтов
  const loadAccounts = () => {
    const savedAccounts = authService.getSavedAccounts();
    setAccounts(savedAccounts);
  };

  // Переключение на другой аккаунт - мемоизированная функция для предотвращения повторного создания
  const handleSwitchAccount = useCallback(
    async (accountId: string, e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (accountId === currentUserId) {
        return;
      }

      setIsLoading(true);
      try {
        const account = authService.switchAccount(accountId);
        if (account) {
          // Сначала закрываем меню и применяем данные аккаунта
          onClose();

          // Затем обновляем состояние приложения
          dispatch(
            setCredentials({
              user: account.user,
              token: account.token,
            })
          );

          // И только после этого переходим на страницу аккаунтов с некоторой задержкой
          setTimeout(() => {
            router.push('/accounts');
          }, 150);
        }
      } catch (error) {
        console.error('Ошибка при переключении аккаунта:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentUserId, dispatch, onClose, router]
  );

  // Удаление аккаунта
  const handleRemoveAccount = useCallback(
    (e: React.MouseEvent, accountId: string) => {
      e.preventDefault();
      e.stopPropagation();

      authService.removeAccount(accountId);
      loadAccounts();
    },
    []
  );

  // Переход на страницу логина - мемоизированный обработчик
  const navigateToLogin = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Спрашиваем пользователя, хочет ли он добавить новый аккаунт
      const isConfirmed = await confirm({
        title: 'Добавление нового аккаунта',
        message:
          'Вы хотите добавить новый аккаунт? Для этого вам нужно будет войти в него, но вы останетесь в своем текущем аккаунте.',
        confirmText: 'Добавить',
        cancelText: 'Отмена',
      });

      if (isConfirmed) {
        // Сохраняем идентификатор текущего аккаунта для возможности восстановления
        accountNavigation.saveCurrentAccountId(currentUserId);

        // Сначала закрываем меню
        onClose();

        // Устанавливаем флаг возврата к аккаунтам
        accountNavigation.setReturnToAccounts(true);

        // Переходим на страницу логина без выхода из текущего аккаунта
        setTimeout(() => {
          router.push('/login?mode=add');
        }, 150);
      }
    },
    [dispatch, onClose, router, currentUserId, confirm]
  );

  // Переход на страницу управления аккаунтами - мемоизированный обработчик
  const navigateToAccounts = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Сначала закрываем меню
      onClose();

      // Затем с небольшой задержкой переходим на страницу аккаунтов
      setTimeout(() => {
        router.push('/accounts');
      }, 150);
    },
    [onClose, router]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      position={{
        top: position.top,
        right: position.right,
      }}
      className="w-72 overflow-hidden"
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
                className={`account-menu-item flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                  account.id === currentUserId ? 'bg-primary-50' : ''
                }`}
                onTouchStart={(e) => {
                  // Предотвращаем стандартное поведение тач-события
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (account.id !== currentUserId) {
                    handleSwitchAccount(account.id, e);
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (account.id !== currentUserId) {
                    handleSwitchAccount(account.id, e);
                  }
                }}
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
          <button
            className="account-menu-button"
            onTouchStart={(e) => {
              // Предотвращаем стандартное поведение тач-события
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Предотвращаем стандартное поведение и всплытие
              e.preventDefault();
              e.stopPropagation();
              navigateToLogin(e);
            }}
            onClick={(e) => {
              // Предотвращаем стандартное поведение и всплытие
              e.preventDefault();
              e.stopPropagation();
              navigateToLogin(e);
            }}
          >
            Добавить новый аккаунт
          </button>

          <button
            className="account-menu-button"
            onTouchStart={(e) => {
              // Предотвращаем стандартное поведение тач-события
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Предотвращаем стандартное поведение и всплытие
              e.preventDefault();
              e.stopPropagation();
              navigateToAccounts(e);
            }}
            onClick={(e) => {
              // Предотвращаем стандартное поведение и всплытие
              e.preventDefault();
              e.stopPropagation();
              navigateToAccounts(e);
            }}
          >
            Управление аккаунтами
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AccountMenu;
