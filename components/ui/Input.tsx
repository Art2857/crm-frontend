import React, {
  InputHTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
} from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const baseClasses =
      'px-4 py-3 bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400';
    const errorClasses = error
      ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 text-red-900 placeholder-red-400'
      : '';
    const widthClass = fullWidth ? 'w-full' : '';
    const inputClasses = `${baseClasses} ${errorClasses} ${widthClass} ${className}`;
    const prevValueRef = useRef(props.value);

    // Создаем копию пропсов для безопасного изменения
    const inputProps = { ...props } as InputProps;

    // Обеспечиваем корректное преобразование значений для управляемого компонента
    if (
      'value' in inputProps &&
      inputProps.value !== undefined &&
      inputProps.value !== null
    ) {
      // Оставляем значение как есть, чтобы форма корректно работала с разными типами
      // Это особенно важно для числовых полей
      inputProps.value = inputProps.value;

      // Для числовых полей по умолчанию предотвращаем случайное изменение колёсиком/стрелками
      if (inputProps.type === 'number') {
        if (!inputProps.step) {
          (inputProps as any).step = '1';
        }

        const originalOnWheel = inputProps.onWheel as any;
        const originalOnKeyDown = inputProps.onKeyDown as any;

        (inputProps as any).onWheel = (
          e: React.WheelEvent<HTMLInputElement>
        ) => {
          // Блокируем изменение значения колёсиком, когда инпут в фокусе
          e.preventDefault();
          // Не продолжаем всплытие нативного изменения
          (e.currentTarget as HTMLInputElement).blur();
          if (typeof originalOnWheel === 'function') originalOnWheel(e);
        };

        (inputProps as any).onKeyDown = (
          e: React.KeyboardEvent<HTMLInputElement>
        ) => {
          // Блокируем ArrowUp/ArrowDown, чтобы не менять значение на +/-1 случайно
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
          if (typeof originalOnKeyDown === 'function') originalOnKeyDown(e);
        };
      }
    }

    // Отслеживаем реальные изменения значения для отладки
    useEffect(() => {
      prevValueRef.current = props.value;
    }, [props.value, props.name]);

    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = props.type === 'password';

    // Для полей пароля переключаем тип между password и text
    const inputType = isPasswordType
      ? showPassword
        ? 'text'
        : 'password'
      : props.type;

    // Добавляем padding справа для иконки глаза
    const finalInputClasses = `${inputClasses} ${
      isPasswordType ? 'pr-10' : ''
    }`;

    // Обновляем пропсы для инпута
    const finalInputProps = {
      ...inputProps,
      type: inputType,
      className: finalInputClasses,
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-mb font-medium text-gray-700 mb-2"
          >
            {label}
            {props.required && (
              <span aria-hidden="true" className="text-red-500 ml-1">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input ref={ref} {...finalInputProps} />
          {isPasswordType && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1} // Исключаем из навигации по Tab, чтобы не мешать быстрому вводу
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
