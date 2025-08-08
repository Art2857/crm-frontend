import React from 'react';
import Modal from './Modal';
import Button from './Button';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ButtonVariant;
}

/**
 * Компонент модального окна для подтверждения действий
 * Заменяет стандартный window.confirm
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'primary'
}) => {
  // Обработчик подтверждения
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        
        <div className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            size="sm" 
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal; 