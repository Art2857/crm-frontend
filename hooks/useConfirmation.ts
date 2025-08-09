import { useCallback } from 'react';
import { useModal } from '../contexts/ModalContext';

type ConfirmAction<T> = (params: T) => Promise<void>;

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

interface UseConfirmationResult<T> {
  /**
   * Выполняет действие с запросом подтверждения
   */
  confirmAndExecute: (
    params: T,
    message: string,
    options?: ConfirmOptions
  ) => Promise<void>;
}

/**
 * Хук для выполнения действий с предварительным подтверждением
 * Использует модальные окна вместо стандартного window.confirm
 * @param action Функция, которая будет выполнена после подтверждения
 */
export const useConfirmation = <T = void>(
  action: ConfirmAction<T>
): UseConfirmationResult<T> => {
  const { confirm } = useModal();

  const confirmAndExecute = useCallback(
    async (
      params: T,
      message: string,
      options?: ConfirmOptions
    ): Promise<void> => {
      // Запрашиваем подтверждение у пользователя через модальное окно
      const isConfirmed = await confirm({
        title: options?.title || 'Подтверждение действия',
        message,
        confirmText: options?.confirmText || 'Подтвердить',
        cancelText: options?.cancelText || 'Отмена',
        variant: options?.variant || 'primary',
      });

      // Если пользователь подтвердил действие, выполняем его
      if (isConfirmed) {
        await action(params);
      }
    },
    [action, confirm]
  );

  return { confirmAndExecute };
};
