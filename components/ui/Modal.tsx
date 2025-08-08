import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  };
  className?: string;
  closeOnBackdropClick?: boolean;
}

// Функция для управления классом body, который блокирует прокрутку
const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (isLocked) {
      // Сохраняем текущую позицию прокрутки
      const scrollY = window.scrollY;
      // Блокируем прокрутку
      document.body.classList.add('modal-open');
      // Устанавливаем положение, чтобы избежать прыжка контента
      document.body.style.top = `-${scrollY}px`;
    } else {
      // Снимаем блокировку
      const scrollY = document.body.style.top 
        ? parseInt(document.body.style.top || '0', 10) * -1 
        : 0;
      
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      
      // Возвращаем прокрутку в исходное положение
      window.scrollTo(0, scrollY);
    }
    
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = originalStyle;
      document.body.style.top = '';
    };
  }, [isLocked]);
};

/**
 * Модальное окно, которое показывается поверх контента
 * и закрывается только при клике вне его
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  position,
  className = '',
  closeOnBackdropClick = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);
  
  // Блокируем прокрутку страницы при открытии модального окна
  useBodyScrollLock(isOpen);
  
  // Мемоизируем функцию закрытия модального окна
  const handleClose = useCallback(() => {
    // Введем задержку перед закрытием для избежания гонки событий
    setTimeout(() => {
      onClose();
    }, 50);
  }, [onClose]);

  // Обработчик клика на фон
  const handleBackdropClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (closeOnBackdropClick) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    }
  }, [closeOnBackdropClick, handleClose]);

  // Обработчик клика вне модального окна
  useEffect(() => {
    if (!isOpen) return;

    // Задержка для правильного рендеринга модального окна
    // перед добавлением обработчиков
    const timeoutId = setTimeout(() => {
      // При первом рендеринге делаем паузу подольше
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }
      
      // Функция для обработки нажатия Escape
      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleClose();
        }
      };

      // Регистрируем только обработчик клавиши Escape
      document.addEventListener('keydown', handleEscapeKey, { capture: true });

      // Очищаем обработчики при размонтировании
      return () => {
        document.removeEventListener('keydown', handleEscapeKey, { capture: true });
      };
    }, 100); // Увеличиваем задержку для правильного рендеринга

    return () => clearTimeout(timeoutId);
  }, [isOpen, handleClose]);

  // Если модальное окно закрыто, ничего не рендерим
  if (!isOpen) return null;

  // Формируем стили для позиционирования (мемоизируем на основе position)
  const modalStyle: React.CSSProperties = position ? {
    position: 'fixed',
    zIndex: 9999,
    ...position,
  } : {
    position: 'fixed',
    zIndex: 9999,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  const modalContent = (
    <>
      {/* Тёмный фон за модальным окном */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
        onClick={handleBackdropClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleBackdropClick(e);
        }}
      ></div>

      {/* Само модальное окно */}
      <div
        ref={modalRef}
        className={`bg-white rounded-md shadow-lg ${className}`}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );

  // Используем портал для рендеринга вне текущего DOM
  if (typeof window !== 'undefined') {
    // Находим или создаем контейнер для модальных окон
    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }

    return createPortal(modalContent, modalRoot);
  }

  // При серверном рендеринге возвращаем null
  return null;
};

export default Modal; 