import React, { useState, useRef, useEffect } from 'react';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  className?: string;
}

/**
 * Компонент для отображения всплывающих подсказок
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 300,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Определяем, является ли устройство мобильным
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const showTip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleChildClick = (e: React.MouseEvent) => {
    // Сохраняем оригинальное событие onClick, если оно есть
    if (children.props.onClick) {
      children.props.onClick(e);
    }

    // Только на мобильных устройствах переключаем видимость подсказки
    if (isMobile) {
      setIsVisible(!isVisible);
    }
  };

  // Стили для разных позиций
  const getTooltipStyles = () => {
    const baseStyles =
      'absolute z-50 p-2 bg-gray-800 text-white text-sm rounded shadow-lg max-w-xs';

    let positionStyles = '';
    switch (placement) {
      case 'top':
        positionStyles = 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
        break;
      case 'bottom':
        positionStyles = 'top-full left-1/2 transform -translate-x-1/2 mt-1';
        break;
      case 'left':
        positionStyles = 'right-full top-1/2 transform -translate-y-1/2 mr-1';
        break;
      case 'right':
        positionStyles = 'left-full top-1/2 transform -translate-y-1/2 ml-1';
        break;
      default:
        positionStyles = 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
    }

    return `${baseStyles} ${positionStyles} ${className}`;
  };

  // Регулируем положение подсказки при необходимости
  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Проверка выхода за пределы экрана и корректировка позиции
      if (tooltipRect.right > viewportWidth) {
        tooltipRef.current.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
        tooltipRef.current.style.transform = 'none';
      }

      if (tooltipRect.left < 0) {
        tooltipRef.current.style.left = '10px';
        tooltipRef.current.style.transform = 'none';
      }

      if (tooltipRect.bottom > viewportHeight) {
        tooltipRef.current.style.top = 'auto';
        tooltipRef.current.style.bottom = `${tooltipRect.height + 10}px`;
      }

      if (tooltipRect.top < 0) {
        tooltipRef.current.style.top = '10px';
        tooltipRef.current.style.bottom = 'auto';
      }
    }
  }, [isVisible]);

  // Обработчик клика вне элемента для закрытия подсказки
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        isVisible &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        childRef.current &&
        !childRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isMobile) {
      document.addEventListener('click', handleOutsideClick);
    }

    return () => {
      if (isMobile) {
        document.removeEventListener('click', handleOutsideClick);
      }
    };
  }, [isVisible, isMobile]);

  // Клонируем дочерний элемент и добавляем события
  const childWithEvents = React.cloneElement(children, {
    onMouseEnter: isMobile ? undefined : showTip,
    onMouseLeave: isMobile ? undefined : hideTip,
    onClick: handleChildClick,
    ref: childRef,
    'aria-describedby': isVisible ? 'tooltip' : undefined,
  });

  return (
    <div className="relative inline-block">
      {childWithEvents}
      {isVisible && (
        <div
          className={getTooltipStyles()}
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-gray-800 transform rotate-45
              ${placement === 'top' ? 'bottom-0 left-1/2 -mb-1 -ml-1' : ''}
              ${placement === 'bottom' ? 'top-0 left-1/2 -mt-1 -ml-1' : ''}
              ${placement === 'left' ? 'right-0 top-1/2 -mr-1 -mt-1' : ''}
              ${placement === 'right' ? 'left-0 top-1/2 -ml-1 -mt-1' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
