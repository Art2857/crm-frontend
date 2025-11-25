import React, {
  SelectHTMLAttributes,
  forwardRef,
  useRef,
  useEffect,
} from 'react';

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
    const baseClasses =
      'px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200';
    const errorClasses = error
      ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 text-red-900'
      : '';
    const widthClass = fullWidth ? 'w-full' : '';
    const selectClasses = `${baseClasses} ${errorClasses} ${widthClass} ${className}`;
    const isFirstRender = useRef(true);

    // Обработка значения перед рендерингом
    const selectProps = { ...props };
    if (
      'value' in selectProps &&
      selectProps.value !== undefined &&
      selectProps.value !== null
    ) {
      selectProps.value = String(selectProps.value);
    }

    // Логируем только при первом рендере или реальном изменении значения


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
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
