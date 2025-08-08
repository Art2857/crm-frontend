import React, { useEffect } from 'react';
import Alert from './Alert';

interface NotificationProps {
  successMessage: string | null;
  errorMessage: string | null;
  onClearSuccess?: () => void;
  onClearError?: () => void;
  autoHideDuration?: number; // Время в миллисекундах
}

/**
 * Компонент для отображения уведомлений (успех/ошибка)
 */
const Notification: React.FC<NotificationProps> = ({
  successMessage,
  errorMessage,
  onClearSuccess,
  onClearError,
  autoHideDuration = 5000 // По умолчанию 5 секунд для всех уведомлений
}) => {
  useEffect(() => {
    // Если есть сообщение об успехе и обработчик для очистки, устанавливаем таймер
    if (successMessage && onClearSuccess && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClearSuccess();
      }, autoHideDuration);
      
      // Очищаем таймер при размонтировании компонента или изменении сообщения
      return () => clearTimeout(timer);
    }
  }, [successMessage, onClearSuccess, autoHideDuration]);

  useEffect(() => {
    // Если есть сообщение об ошибке и обработчик для очистки, устанавливаем таймер
    if (errorMessage && onClearError && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClearError();
      }, autoHideDuration);
      
      // Очищаем таймер при размонтировании компонента или изменении сообщения
      return () => clearTimeout(timer);
    }
  }, [errorMessage, onClearError, autoHideDuration]);

  if (!successMessage && !errorMessage) {
    return null;
  }
  
  return (
    <div className="mb-4 space-y-2">
      {successMessage && (
        <Alert type="success">
          {successMessage}
          {onClearSuccess && (
            <button 
              onClick={onClearSuccess}
              className="float-right text-green-700 hover:text-green-900"
              aria-label="Закрыть уведомление об успехе"
            >
              ×
            </button>
          )}
        </Alert>
      )}
      
      {errorMessage && (
        <Alert type="error">
          {errorMessage}
          {onClearError && (
            <button 
              onClick={onClearError}
              className="float-right text-red-700 hover:text-red-900"
              aria-label="Закрыть уведомление об ошибке"
            >
              ×
            </button>
          )}
        </Alert>
      )}
    </div>
  );
};

export default Notification; 