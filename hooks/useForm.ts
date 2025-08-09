import { useState, useCallback, ChangeEvent } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validate?: (value: any) => boolean | string;
  isDate?: boolean;
}

interface FieldRules {
  [fieldName: string]: ValidationRule;
}

interface Errors {
  [fieldName: string]: string;
}

/**
 * Универсальный хук для работы с формами
 * @param initialValues - начальные значения формы
 * @param validationRules - правила валидации полей
 * @returns объект с методами и состоянием формы
 */
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: FieldRules = {}
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Валидирует дату в формате DD.MM.YYYY
   */
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return true; // Пустая дата считается валидной (если нет required)

    // Проверка формата DD.MM.YYYY
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
      return false;
    }

    // Разбивка на компоненты
    const parts = dateString.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Месяцы в JavaScript начинаются с 0
    const year = parseInt(parts[2], 10);

    // Создание и валидация объекта Date
    const date = new Date(year, month, day);
    const isValidDateObject =
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day;

    // Проверка, что дата не в будущем (для даты рождения)
    const today = new Date();
    const isFutureDate = date > today;

    // Дата считается невалидной, если она некорректна или находится в будущем
    return isValidDateObject && !isFutureDate;
  };

  /**
   * Проверяет значение на соответствие правилам валидации
   * @param name - имя поля
   * @param value - значение поля
   * @returns сообщение об ошибке или пустую строку, если ошибок нет
   */
  const validateField = useCallback(
    (name: string, value: any): string => {
      const rules = validationRules[name];
      if (!rules) return '';

      // Для строк автоматически удаляем пробелы при валидации
      const trimmedValue = typeof value === 'string' ? value.trim() : value;

      // Если поле пустое и не обязательное, не валидируем его дальше
      if (!trimmedValue && !rules.required) {
        return '';
      }

      if (
        rules.required &&
        (!trimmedValue ||
          (Array.isArray(trimmedValue) && trimmedValue.length === 0))
      ) {
        return 'Поле обязательно для заполнения';
      }

      if (
        rules.minLength &&
        typeof trimmedValue === 'string' &&
        trimmedValue.length < rules.minLength
      ) {
        return `Минимальная длина ${rules.minLength} символов`;
      }

      if (
        rules.maxLength &&
        typeof trimmedValue === 'string' &&
        trimmedValue.length > rules.maxLength
      ) {
        return `Максимальная длина ${rules.maxLength} символов`;
      }

      if (
        rules.min &&
        typeof trimmedValue === 'number' &&
        trimmedValue < rules.min
      ) {
        return `Минимальное значение ${rules.min}`;
      }

      if (
        rules.max &&
        typeof trimmedValue === 'number' &&
        trimmedValue > rules.max
      ) {
        return `Максимальное значение ${rules.max}`;
      }

      if (
        rules.pattern &&
        typeof trimmedValue === 'string' &&
        trimmedValue &&
        !rules.pattern.test(trimmedValue)
      ) {
        return 'Значение не соответствует формату';
      }

      if (rules.isDate && typeof trimmedValue === 'string' && trimmedValue) {
        // Проверяем, в каком формате пришла дата
        // HTML input type="date" возвращает дату в формате YYYY-MM-DD
        if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Если дата в формате YYYY-MM-DD, проверяем ее на валидность и дату в будущем
          try {
            const dateObj = new Date(trimmedValue);
            // Проверяем, что дата не в будущем
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Сбрасываем время

            if (dateObj > today) {
              return 'Дата рождения не может быть в будущем';
            }

            // Дата валидна, формат правильный
            return '';
          } catch (e) {
            return 'Некорректная дата рождения';
          }
        }
        // Для дат в формате DD.MM.YYYY используем существующую логику
        else if (!isValidDate(trimmedValue)) {
          // Проверяем, не является ли это датой в будущем для формата DD.MM.YYYY
          if (trimmedValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const parts = trimmedValue.split('.');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            const today = new Date();

            if (date > today) {
              return 'Дата рождения не может быть в будущем';
            }
          }
          return 'Некорректный формат даты. Используйте формат ДД.ММ.ГГГГ';
        }
      }

      if (rules.validate && trimmedValue) {
        const result = rules.validate(trimmedValue);
        if (typeof result === 'string') {
          return result;
        }
        if (result === false) {
          return 'Поле заполнено некорректно';
        }
      }

      return '';
    },
    [validationRules]
  );

  /**
   * Обработчик изменения поля формы
   * @param e - событие изменения
   */
  const handleChange = useCallback(
    (
      e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      const { name, value, type } = e.target;
      let parsedValue: any = value;

      // Преобразование значения в зависимости от типа поля
      if (type === 'number' || type === 'range') {
        parsedValue = value === '' ? '' : Number(value);
      } else if (type === 'checkbox') {
        parsedValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'file') {
        parsedValue = (e.target as HTMLInputElement).files;
      }

      // Обновляем значение поля без немедленной валидации для текстовых полей
      // чтобы дать пользователю возможность полностью ввести значение
      setValues((prev) => ({ ...prev, [name]: parsedValue }));
    },
    []
  );

  /**
   * Обработчик потери фокуса полем формы
   */
  const handleBlur = useCallback(
    (
      e: React.FocusEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name } = e.target;

      // Отмечаем поле как "тронутое"
      if (!touched[name]) {
        setTouched((prev) => ({ ...prev, [name]: true }));
      }

      // Валидируем поле только при потере фокуса
      const error = validateField(name, values[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [touched, validateField, values]
  );

  /**
   * Установка значения поля формы программным путем
   * @param name - имя поля
   * @param value - новое значение
   */
  const setValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Не выполняем валидацию при программной установке значения
  }, []);

  /**
   * Валидация всей формы
   * @returns true, если форма валидна
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Errors = {};
    let isValid = true;

    // Проверяем все поля с правилами валидации
    for (const fieldName in validationRules) {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    // Отмечаем все поля как "тронутые" при валидации формы
    const newTouched: Record<string, boolean> = {};
    for (const fieldName in validationRules) {
      newTouched[fieldName] = true;
    }
    setTouched((prev) => ({ ...prev, ...newTouched }));

    return isValid;
  }, [validateField, values, validationRules]);

  /**
   * Подготавливает данные формы к отправке, удаляя пробелы у строковых значений
   */
  const prepareValuesForSubmit = useCallback((): T => {
    const preparedValues = { ...values };

    for (const key in preparedValues) {
      if (typeof preparedValues[key] === 'string') {
        preparedValues[key] = preparedValues[key].trim();
      }
    }

    return preparedValues;
  }, [values]);

  /**
   * Обработчик отправки формы
   * @param onSubmit - функция, вызываемая при успешной валидации
   * @returns функция обработчик события submit
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const isValid = validateForm();
        if (isValid) {
          try {
            // Используем подготовленные данные с удаленными пробелами
            const preparedValues = prepareValuesForSubmit();
            await onSubmit(preparedValues);
          } catch (error) {
            console.error('Ошибка при отправке формы:', error);
          }
        }

        setIsSubmitting(false);
      };
    },
    [validateForm, prepareValuesForSubmit]
  );

  /**
   * Сброс формы к начальным значениям
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    setValue,
    validateForm,
    handleSubmit,
    resetForm,
  };
};
