import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';

// Типы для конфигурации модальных окон
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

// Интерфейс контекста
interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

// Создаем контекст с начальными значениями
const ModalContext = createContext<ModalContextType>({
  confirm: () => Promise.resolve(false),
  alert: () => Promise.resolve(),
});

// Хук для использования контекста в компонентах
export const useModal = () => useContext(ModalContext);

// Провайдер контекста
export const ModalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Состояние для модального окна подтверждения
  const [confirmConfig, setConfirmConfig] = useState<
    ConfirmOptions & { isOpen: boolean }
  >({
    isOpen: false,
    title: '',
    message: '',
  });

  // Состояние для информационного модального окна
  const [alertConfig, setAlertConfig] = useState<
    AlertOptions & { isOpen: boolean }
  >({
    isOpen: false,
    title: '',
    message: '',
  });

  // Состояние для хранения resolve-функции промиса
  const [confirmResolve, setConfirmResolve] = useState<
    ((value: boolean) => void) | null
  >(null);
  const [alertResolve, setAlertResolve] = useState<(() => void) | null>(null);

  // Функция для показа модального окна подтверждения
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmConfig({
        isOpen: true,
        ...options,
      });
      setConfirmResolve(() => resolve);
    });
  };

  // Функция для показа информационного модального окна
  const alert = (options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setAlertConfig({
        isOpen: true,
        ...options,
      });
      setAlertResolve(() => resolve);
    });
  };

  // Обработчики закрытия модальных окон
  const handleConfirmClose = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolve) {
      confirmResolve(false);
      setConfirmResolve(null);
    }
  };

  const handleConfirmConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolve) {
      confirmResolve(true);
      setConfirmResolve(null);
    }
  };

  const handleAlertClose = () => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    if (alertResolve) {
      alertResolve();
      setAlertResolve(null);
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Модальное окно подтверждения */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirmConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
      />

      {/* Информационное модальное окно */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={handleAlertClose}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        variant={alertConfig.variant}
      />
    </ModalContext.Provider>
  );
};

export default ModalProvider;
