import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

/**
 * Компонент модального окна для информационных сообщений
 * Заменяет стандартный window.alert
 */
const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'ОК',
  variant = 'primary',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>

        <div className="flex justify-end">
          <Button variant={variant} size="sm" onClick={onClose}>
            {buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AlertModal;
