import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonWidth = 'auto' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  width?: ButtonWidth;
  isLoading?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      width = 'auto',
      isLoading = false,
      className = '',
      icon,
      iconPosition = 'left',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Базовые классы для всех кнопок
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-150 ease-in-out';

    // Классы для разных размеров
    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs rounded-md',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // Классы для разных вариантов
    const variantClasses = {
      primary:
        'text-white bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 disabled:bg-primary-300',
      secondary:
        'text-white bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-500 disabled:bg-gray-400',
      danger:
        'text-white bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-400',
      outline:
        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus-visible:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400',
    };

    // Класс для ширины
    const widthClass = width === 'full' ? 'w-full' : '';

    // Класс для состояния загрузки
    const loadingClass = isLoading ? 'opacity-75 cursor-not-allowed' : '';

    // Собираем все классы вместе
    const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${loadingClass} ${className}`;

    // Индикатор загрузки (спиннер)
    const spinner = (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    );

    // Touch target для мобильных устройств
    // Рекомендуемый размер - минимум 44px на 44px
    const touchTargetClasses = 'min-h-[44px] min-w-[44px]';

    return (
      <button
        type={type}
        className={`${buttonClasses} ${touchTargetClasses}`}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && spinner}
        {icon && iconPosition === 'left' && !isLoading && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && !isLoading && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  }
);

// Добавляем имя для отладки в React DevTools
Button.displayName = 'Button';

export default Button;
