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

        (inputProps as any).onWheel = (e: React.WheelEvent<HTMLInputElement>) => {
          // Блокируем изменение значения колёсиком, когда инпут в фокусе
          e.preventDefault();
          // Не продолжаем всплытие нативного изменения
          (e.currentTarget as HTMLInputElement).blur();
          if (typeof originalOnWheel === 'function') originalOnWheel(e);
        };

        (inputProps as any).onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-mb font-medium text-gray-700 mb-2"
          >
            {label}
            {props.required && (
              <span aria-hidden="true" className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}
        <input ref={ref} className={inputClasses} {...inputProps} />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
