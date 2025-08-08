import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

// Типы уведомлений
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// Интерфейс для уведомления
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Интерфейс контекста
interface NotificationContextProps {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Создаем контекст
const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Генерация уникального ID
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Provider компонент
export const NotificationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Добавление нового уведомления
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = generateId();
    const newNotification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);

    // Авто-удаление через указанное время
    if (notification.duration !== undefined && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  // Удаление уведомления по ID
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Очистка всех уведомлений
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Хук для использования контекста
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  // Вспомогательные функции для удобства использования
  const showSuccess = useCallback((message: string, duration = 3000) => {
    return context.addNotification({ type: 'success', message, duration });
  }, [context]);
  
  const showError = useCallback((message: string, duration = 5000) => {
    // Обработка и дедупликация сообщений об ошибках
    let processedMessage = message;
    
    // Проверяем, содержит ли сообщение повторяющиеся строки
    if (message.includes('\n')) {
      // Разделяем сообщение на строки
      const lines = message.split('\n');
      // Удаляем дубликаты, сохраняя порядок
      const uniqueLines: string[] = [];
      const seenLines = new Set<string>();
      
      for (const line of lines) {
        // Обрабатываем случаи с "поле: сообщение поле: сообщение"
        if (line.includes(':')) {
          const parts = line.split(':').map(part => part.trim());
          const fieldName = parts[0];
          const errorText = parts.slice(1).join(':').trim();
          
          // Создаем уникальный ключ для этой ошибки
          const errorKey = `${fieldName}:${errorText}`;
          
          if (!seenLines.has(errorKey)) {
            seenLines.add(errorKey);
            uniqueLines.push(line);
          }
        } else if (!seenLines.has(line)) {
          seenLines.add(line);
          uniqueLines.push(line);
        }
      }
      
      processedMessage = uniqueLines.join('\n');
    }
    
    // Дополнительная обработка для текста вида "поле: ошибка поле: ошибка" в одной строке
    const fieldErrorPattern = /(\w+):\s+([^:]+?)(?=\s+\w+:|$)/g;
    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    
    // Вручную собираем все совпадения
    while ((match = fieldErrorPattern.exec(processedMessage)) !== null) {
      matches.push(match);
    }
    
    if (matches.length > 1) {
      const uniqueErrors = new Map<string, string>();
      
      for (const match of matches) {
        const [, field, error] = match;
        if (field && error && !uniqueErrors.has(`${field}:${error}`)) {
          uniqueErrors.set(`${field}:${error}`, `${field}: ${error}`);
        }
      }
      
      if (uniqueErrors.size > 0) {
        processedMessage = Array.from(uniqueErrors.values()).join('\n');
      }
    }
    
    return context.addNotification({ type: 'error', message: processedMessage, duration });
  }, [context]);
  
  const showInfo = useCallback((message: string, duration = 3000) => {
    return context.addNotification({ type: 'info', message, duration });
  }, [context]);
  
  const showWarning = useCallback((message: string, duration = 4000) => {
    return context.addNotification({ type: 'warning', message, duration });
  }, [context]);
  
  return {
    ...context,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };
}; 