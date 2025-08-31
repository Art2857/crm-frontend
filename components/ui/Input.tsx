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
      'px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 placeholder-gray-400';
    const errorClasses = error
      ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 text-red-900 placeholder-red-400'
      : '';
    const widthClass = fullWidth ? 'w-full' : '';
    const inputClasses = `${baseClasses} ${errorClasses} ${widthClass} ${className}`;
    const prevValueRef = useRef(props.value);

    // Создаем копию пропсов для безопасного изменения
    const inputProps = { ...props };

    // Обеспечиваем корректное преобразование значений для управляемого компонента
    if (
      'value' in inputProps &&
      inputProps.value !== undefined &&
      inputProps.value !== null
    ) {
      // Оставляем значение как есть, чтобы форма корректно работала с разными типами
      // Это особенно важно для числовых полей
      inputProps.value = inputProps.value;

      // Для поля зарплаты (salary) убираем ограничения на валидацию, чтобы разрешить любое значение
      if (inputProps.name === 'salary' && inputProps.type === 'number') {
        // Устанавливаем меньший шаг для более точного контроля
        inputProps.step = '1';
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
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
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
