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
      'block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';
    const errorClasses = error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
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
    useEffect(() => {
      if (process.env.NODE_ENV !== 'production') {
        if (isFirstRender.current) {
          // eslint-disable-next-line no-console
          console.log(
            'Select initialized with:',
            selectProps.name,
            selectProps.value
          );
          isFirstRender.current = false;
        }
      }
    }, [selectProps.name, selectProps.value]);

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1"
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
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
