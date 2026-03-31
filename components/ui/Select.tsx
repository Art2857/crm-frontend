import React, {
  SelectHTMLAttributes,
  forwardRef,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];
  error?: string;
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      children,
      error,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = props.disabled === true;
    const baseClasses =
      `px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200${isDisabled ? ' bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;
    const errorClasses = error
      ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 text-red-900'
      : '';
    const widthClass = fullWidth ? 'w-full' : '';
    const [isOpen, setIsOpen] = useState(false);

    // Обработка значения перед рендерингом
    const selectProps = { ...props };
    if (
      'value' in selectProps &&
      selectProps.value !== undefined &&
      selectProps.value !== null
    ) {
      selectProps.value = String(selectProps.value);
    }

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsOpen(false);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLSelectElement>) => {
      setIsOpen((prev) => !prev);
      if (props.onClick) {
        props.onClick(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIsOpen(false);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    // Добавляем обработку клавиатуры для улучшения UX
    const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }

      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    // Обновляем selectProps с нашими обработчиками
    selectProps.onBlur = handleBlur;
    selectProps.onClick = handleClick;
    selectProps.onChange = handleChange;
    selectProps.onKeyDown = handleKeyDown;

    // Добавляем appearance-none для скрытия дефолтной стрелки и pr-10 для отступа под иконку
    const selectClasses = `${baseClasses} appearance-none pr-10 ${errorClasses} ${widthClass} ${className}`;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {props.required && (
              <span aria-hidden="true" className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select ref={ref} className={selectClasses} {...selectProps}>
            {options
              ? // Если переданы опции в виде массива, рендерим их
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
              : // Иначе используем дочерние элементы
              children}
          </select>
          {!isDisabled && (
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''
                  }`}
              />
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
