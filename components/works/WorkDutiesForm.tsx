import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Tooltip from '../ui/Tooltip';
import { Duty, DistributionWithDetails } from '../../types/duty';
import { User } from '../../types/user';
import { formatAmountWithCurrency } from '../../utils/currency';
import { getCurrentDateISO } from '../../utils/date';
import CurrencySwitch from '../ui/CurrencySwitch';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';

// Вспомогательная функция для преобразования строковых значений в числовые
const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

// Округление до decimals знаков с удалением лишних нулей в конце
const toFixedTrim = (value: number, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(Number(value))) return '';
  const str = Number(value).toFixed(decimals);
  // Удаляем конечные нули, потом возможные конечные точки
  return str.replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '');
};

// Проверка, что строковое значение пустое (null/undefined/пустая строка после trim)
const isEmpty = (v?: string | null) => v == null || v.trim() === '';

// Преобразование в целое число (проценты), округляя до ближайшего целого
const toIntString = (value: number): string => {
  if (value === null || value === undefined || isNaN(Number(value))) return '';
  return String(Math.round(Number(value)));
};

interface DutyFormItem {
  dutyId: string;
  userId: string;
  price: string;
  percentage: string;
  currency: 'RUB' | 'USD';
}

interface SalaryDistribution {
  label: string;
  value: number;
  color: string;
}

interface WorkDutiesFormProps {
  workId: string;
  workHistoryId?: string;
  duties: Duty[];
  users: User[];
  currentDistribution: DistributionWithDetails | null;
  onSubmit: (
    duties: Array<{
      dutyId: string;
      userId: string;
      price: string | null;
      percentage: string | null;
      currency: 'RUB' | 'USD';
    }>,
    effectiveDate?: string
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
  workSalary?: string;
  workCurrency?: 'RUB' | 'USD';
  releaseDate?: string;
}

// Генерация разных цветов для диаграммы
const generateColor = (index: number): string => {
  const colors = [
    '#4299E1', // синий
    '#48BB78', // зеленый
    '#F56565', // красный
    '#ED8936', // оранжевый
    '#9F7AEA', // фиолетовый
    '#38B2AC', // голубой
    '#F687B3', // розовый
    '#667EEA', // индиго
  ];
  return colors[index % colors.length];
};

const WorkDutiesForm: React.FC<WorkDutiesFormProps> = ({
  workId,
  workHistoryId,
  duties,
  users,
  currentDistribution,
  onSubmit,
  onCancel,
  isLoading = false,
  workSalary = '',
  workCurrency = 'RUB',
  releaseDate,
}) => {
  const [dutyItems, setDutyItems] = useState<DutyFormItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSalaryPreview, setShowSalaryPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] =
    useState<string>(getCurrentDateISO());
  const [convertingIndex, setConvertingIndex] = useState<number | null>(null);
  
  const { convert, convertSync, rate: exchangeRate, isLoading: isLoadingRate } = useCurrencyConversion({
    date: releaseDate,
  });

  // Преобразуем workSalary в число один раз для использования по всему компоненту
  const numericSalary = useMemo(() => toNumber(workSalary) || 0, [workSalary]);

  /**
   * Конвертирует сумму в валюту работы работы для расчёта долей
   * Использует синхронную конвертацию (по дате) если курс уже загружен
   */
  const convertToWorkCurrency = useCallback((
    amount: number,
    fromCurrency: 'RUB' | 'USD'
  ): number => {
    if (fromCurrency === workCurrency) {
      return amount;
    }
    
    // Пробуем синхронную конвертацию (по дате)
    const converted = convertSync(amount, fromCurrency, workCurrency);
    if (converted !== null) {
      return converted;
    }
    
    // Если курс ещё не загружен, возвращаем исходную сумму
    // (будет пересчитано после загрузки курса)
    return amount;
  }, [workCurrency, convertSync]);

  // Рассчитываем общий процент для индикатора прогресса
  // Все суммы конвертируются в валюту работы работы перед суммированием
  const totalPercentage = useMemo(() => {
    // Если нет зарплаты работы, возвращаем только сумму процентов от должностей
    if (!numericSalary) {
      let total = 0;
      dutyItems.forEach((item) => {
        if (item.percentage) {
          const percentValue = toNumber(item.percentage) || 0;
          total += percentValue;
        }
      });
      return total;
    }

    // Рассчитываем общую сумму всех обязанностей в валюте работы
    let totalDutiesAmount = 0;

    dutyItems.forEach((item) => {
      // Фиксированная сумма (конвертируется в валюту работы)
      if (item.price && item.price !== '') {
        const priceInDutyCurrency = toNumber(item.price) || 0;
        // Конвертируем в валюту работы работы
        const priceInWorkCurrency = convertToWorkCurrency(priceInDutyCurrency, item.currency);
        totalDutiesAmount += priceInWorkCurrency;
      }

      // Процентная часть (всегда в валюте работы работы)
      if (item.percentage && item.percentage !== '' && numericSalary) {
        const percentage = toNumber(item.percentage) || 0;
        totalDutiesAmount += (percentage / 100) * numericSalary;
      }
    });

    // Вычисляем процент от зарплаты работы
    const percentage = (totalDutiesAmount / numericSalary) * 100;

    return percentage;
  }, [dutyItems, numericSalary, convertToWorkCurrency]);

  // Проверяем, превышает ли сумма процентов 100%
  const exceedsWorkSalary = useMemo(() => {
    return totalPercentage > 100;
  }, [totalPercentage]);

  // Получаем список доступных (неиспользованных) обязанностей для добавления
  const unusedDutiesExist = useMemo(() => {
    return duties.some(
      (duty) => !dutyItems.some((item) => item.dutyId === duty.id)
    );
  }, [duties, dutyItems]);

  // Инициализация формы с текущими данными распределения
  useEffect(() => {
    if (currentDistribution) {

      const items = currentDistribution.details.map((detail) => ({
        dutyId: detail.duty.id,
        userId: detail.user.id,
        price: detail.price !== null ? detail.price.toString() : '',
        percentage:
          detail.percentage !== null ? detail.percentage.toString() : '',
        // Используем валюту из duty или валюту работы
        currency: (detail.currency || detail.duty.currency || workCurrency) as 'RUB' | 'USD',
      }));

      setDutyItems(items);
    } else {
      setDutyItems([]);
    }
  }, [currentDistribution, workCurrency]);

  // Получение стандартных значений для обязанности
  const getDefaultValuesForDuty = (dutyId: string) => {
    const selectedDuty = duties.find((duty) => duty.id === dutyId);
    return {
      price:
        selectedDuty?.basePrice !== null &&
        selectedDuty?.basePrice !== undefined
          ? selectedDuty.basePrice.toString()
          : '',
      percentage:
        selectedDuty?.basePercentage !== null &&
        selectedDuty?.basePercentage !== undefined
          ? selectedDuty.basePercentage.toString()
          : '',
      currency: (selectedDuty?.currency || workCurrency) as 'RUB' | 'USD',
    };
  };

  /**
   * Конвертирует сумму обязанности при переключении валюты
   * Использует курс на дату releaseDate работы
   */
  const handleCurrencyChange = useCallback(async (
    index: number,
    newCurrency: 'RUB' | 'USD'
  ) => {
    const item = dutyItems[index];
    if (!item || item.currency === newCurrency) return;

    const oldCurrency = item.currency;
    const priceValue = toNumber(item.price);

    // Если цена не указана, просто меняем валюту
    if (priceValue === null || priceValue === 0) {
      const newItems = [...dutyItems];
      newItems[index] = { ...newItems[index], currency: newCurrency };
      setDutyItems(newItems);
      return;
    }

    setConvertingIndex(index);

    try {
      // Конвертируем цену в новую валюту
      const convertedPrice = await convert(priceValue, oldCurrency, newCurrency);

      const newItems = [...dutyItems];
      newItems[index] = {
        ...newItems[index],
        currency: newCurrency,
        // Округляем до 2 знаков, без лишних нулей
        price: toFixedTrim(convertedPrice, 2),
      };
      setDutyItems(newItems);

      // Сбрасываем ошибку валидации при изменении валюты
      if (validationError) {
        setValidationError(null);
      }
    } catch (error) {
      console.error('Ошибка конвертации валюты:', error);
      setValidationError('Не удалось сконвертировать валюту. Попробуйте ещё раз.');
    } finally {
      setConvertingIndex(null);
    }
  }, [dutyItems, convert, validationError]);

  // Вычисляем данные для пропорционального отображения распределения зарплаты
  // Все суммы конвертируются в валюту работы работы
  const salaryDistributionData = useMemo(() => {
    const numericSalaryValue =
      typeof workSalary === 'string' ? Number(workSalary) : 0;
    if (!numericSalaryValue) return [];

    // Создаем ключ для группировки обязанностей по сотруднику и обязанности
    type DutyKey = string; // "dutyId:userId"
    const dutyMap = new Map<
      DutyKey,
      {
        dutyId: string;
        userId: string;
        dutyName: string;
        userName: string;
        fixedAmount: number;
        percentageAmount: number;
        percentage: number | null;
      }
    >();

    let totalAmount = 0;

    // Обрабатываем все элементы и группируем их
    dutyItems.forEach((item) => {
      const key = `${item.dutyId}:${item.userId}`;
      const dutyName =
        duties.find((d) => d.id === item.dutyId)?.name || 'Неизвестно';
      const userName =
        users.find((u) => u.id === item.userId)?.lastName || 'Пользователь';

      if (!dutyMap.has(key)) {
        dutyMap.set(key, {
          dutyId: item.dutyId,
          userId: item.userId,
          dutyName,
          userName,
          fixedAmount: 0,
          percentageAmount: 0,
          percentage: null,
        });
      }

      const dutyData = dutyMap.get(key)!;

      // Добавляем фиксированную сумму, если она есть (конвертируем в валюту работы работы)
      if (item.price && item.price !== '') {
        const priceInDutyCurrency = Number(item.price);
        // Конвертируем в валюту работы работы
        const priceInWorkCurrency = convertToWorkCurrency(priceInDutyCurrency, item.currency);
        dutyData.fixedAmount += priceInWorkCurrency;
        totalAmount += priceInWorkCurrency;
      }

      // Добавляем процентную часть, если она есть (всегда в валюте работы)
      if (item.percentage && item.percentage !== '' && numericSalaryValue) {
        const percentage = Number(item.percentage);
        const amount = (percentage / 100) * numericSalaryValue;
        dutyData.percentageAmount += amount;
        dutyData.percentage = percentage;
        totalAmount += amount;
      }
    });

    // Преобразуем сгруппированные данные в массив для диаграммы
    const data: SalaryDistribution[] = [];
    let index = 0;

    dutyMap.forEach((item) => {
      const totalValue = item.fixedAmount + item.percentageAmount;
      const label = `${item.dutyName} (${item.userName})`;

      data.push({
        label,
        value: totalValue,
        color: generateColor(index++),
      });
    });

    // Добавляем оставшуюся часть зарплаты (если есть)
    const remaining = numericSalaryValue - totalAmount;
    if (remaining > 0) {
      data.push({
        label: 'Нераспределённая зарплата',
        value: remaining,
        color: '#CBD5E0', // серый цвет для нераспределенных средств
      });
    }

    return data;
  }, [dutyItems, workSalary, duties, users, convertToWorkCurrency]);

  // Получаем расчеты для каждой обязанности
  const dutyCalculations = useMemo(() => {
    const calculations = new Map<
      string,
      {
        dutyId: string;
        dutyName: string;
        total: number;
        minValue: number | null;
        maxValue: number | null;
        percentComplete: number | null;
        isExceeded: boolean;
        status: 'ok' | 'warning' | 'error' | 'below-min';
      }
    >();

    if (!workSalary) return calculations;

    dutyItems.forEach((item) => {
      const dutyId = item.dutyId;
      const selectedDuty = duties.find((d) => d.id === dutyId);

      if (!selectedDuty) return;

      let fixedAmount = 0;
      let percentageAmount = 0;

      // Добавляем фиксированную сумму, если она есть (конвертируем в валюту работы работы)
      if (item.price && item.price !== '') {
        const priceInDutyCurrency = Number(item.price) || 0;
        fixedAmount = convertToWorkCurrency(priceInDutyCurrency, item.currency);
      }

      // Добавляем процентную часть, если она есть
      if (item.percentage && item.percentage !== '' && workSalary) {
        const percentage = Number(item.percentage) || 0;
        const numericSalary = Number(workSalary);
        percentageAmount = (percentage / 100) * numericSalary;
      }

      const totalAmount = fixedAmount + percentageAmount;

      if (calculations.has(dutyId)) {
        // Если запись для этой обязанности уже есть, обновляем сумму
        const existing = calculations.get(dutyId)!;
        existing.total += totalAmount;

        // Обновляем статус
        if (existing.maxValue !== null && existing.total > existing.maxValue) {
          existing.status = 'error';
          existing.isExceeded = true;
          existing.percentComplete = 100;
        } else if (
          existing.minValue !== null &&
          existing.total < existing.minValue
        ) {
          existing.status = 'below-min';
          existing.percentComplete =
            existing.minValue === 0
              ? 0
              : (existing.total / existing.minValue) * 100;
          existing.isExceeded = false;
        } else if (existing.maxValue !== null) {
          const percentage =
            existing.minValue !== null
              ? ((existing.total - existing.minValue) /
                  (existing.maxValue - existing.minValue)) *
                100
              : (existing.total / existing.maxValue) * 100;

          existing.percentComplete = percentage;
          existing.status = percentage > 80 ? 'warning' : 'ok';
          existing.isExceeded = false;
        }
      } else {
        // Создаем новую запись
        let status: 'ok' | 'warning' | 'error' | 'below-min' = 'ok';
        let percentComplete: number | null = null;
        let isExceeded = false;

      // Конвертируем минимумы максимумы и максимумы для обязанности сравнения в соответствии с валютой работы
      const minOriginal = toNumber(selectedDuty.minValue);
      const maxOriginal = toNumber(selectedDuty.maxValue);
      const dutyCurrency = (selectedDuty.currency as 'RUB' | 'USD') || workCurrency;
      const minValueNumeric =
        minOriginal !== null ? convertToWorkCurrency(minOriginal, dutyCurrency) : null;
      const maxValueNumeric =
        maxOriginal !== null ? convertToWorkCurrency(maxOriginal, dutyCurrency) : null;

        if (maxValueNumeric !== null && totalAmount > maxValueNumeric) {
          status = 'error';
          isExceeded = true;
          percentComplete = 100;
        } else if (minValueNumeric !== null && totalAmount < minValueNumeric) {
          status = 'below-min';
          percentComplete =
            minValueNumeric === 0 ? 0 : (totalAmount / minValueNumeric) * 100;
        } else if (maxValueNumeric !== null) {
          const percentage =
            minValueNumeric !== null
              ? ((totalAmount - minValueNumeric) /
                  (maxValueNumeric - minValueNumeric)) *
                100
              : (totalAmount / maxValueNumeric) * 100;

          percentComplete = percentage;
          status = percentage > 80 ? 'warning' : 'ok';
        }

        calculations.set(dutyId, {
          dutyId,
          dutyName: selectedDuty.name,
          total: totalAmount,
          minValue: minValueNumeric,
          maxValue: maxValueNumeric,
          percentComplete,
          isExceeded,
          status,
        });
      }
    });

    return calculations;
  }, [dutyItems, duties, workSalary, convertToWorkCurrency, workCurrency]);

  // Обработчик изменения поля
  const handleChange = (
    index: number,
    field: keyof DutyFormItem,
    value: string
  ) => {
    // Создаем копию массива
    const newItems = [...dutyItems];

    // Если меняется dutyId, получаем стандартные значения для этой обязанности
    if (field === 'dutyId' && value !== newItems[index].dutyId) {
      const defaultValues = getDefaultValuesForDuty(value);
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        price: defaultValues.price,
        percentage: defaultValues.percentage,
        currency: defaultValues.currency,
      };
    } else {
      // Для других полей просто обновляем значение
      newItems[index] = { ...newItems[index], [field]: value };
    }

    // Ранее тут обнуляли второе поле при вводе одного из значений (фикс/процент).
    // По новой логике разрешаем указывать одновременно фиксированную сумму И процент.

    // Обновляем состояние
    setDutyItems(newItems);

    // Сбрасываем ошибку валидации при изменении данных
    if (validationError) {
      setValidationError(null);
    }
  };

  // Добавление новой обязанности
  const handleAddDuty = () => {
    // Находим обязанности, которые еще не добавлены
    const unusedDuties = duties.filter(
      (duty) => !dutyItems.some((item) => item.dutyId === duty.id)
    );

    if (unusedDuties.length === 0) {
      return; // Все обязанности уже добавлены
    }

    const defaultUser = users.length > 0 ? users[0].id : '';
    const defaultDuty = unusedDuties[0].id;

    // Получаем стандартные значения для выбранной обязанности
    const { price, percentage, currency } = getDefaultValuesForDuty(defaultDuty);

    setDutyItems([
      ...dutyItems,
      {
        dutyId: defaultDuty,
        userId: defaultUser,
        price,
        percentage,
        currency,
      },
    ]);
  };

  // Удаление обязанности
  const handleRemoveDuty = async (index: number) => {
    setIsRemoving(index);
    try {
      if (confirm('Вы уверены, что хотите удалить эту обязанность?')) {
        // Имитация задержки для демонстрации индикатора загрузки
        await new Promise((resolve) => setTimeout(resolve, 300));

        const newItems = [...dutyItems];
        newItems.splice(index, 1);
        setDutyItems(newItems);

        // Сбрасываем ошибку валидации при удалении
        setValidationError(null);
      }
    } finally {
      setIsRemoving(null);
    }
  };

  // Проверка валидности формы
  const validateForm = () => {
    // Разрешаем сохранять пустое распределение (обнуление обязанностей)
    if (dutyItems.length === 0) {
      setValidationError(null);
      return true;
    }

    // Проверяем, что у каждой непустой записи заполнены обязательные поля
    const invalidDuties = dutyItems.some(
      (item) =>
        !item.dutyId ||
        !item.userId ||
        (isEmpty(item.price) && isEmpty(item.percentage))
    );

    if (invalidDuties) {
      setValidationError(
        'Для каждой обязанности необходимо указать обязанность, ответственного и стоимость или процент'
      );
      return false;
    }

    // Проверка распределения может превышать 100%

    setValidationError(null);
    return true;
  };

  // Определение цвета для индикатора прогресса
  const getProgressColor = (percentage: number) => {
    if (percentage <= 80) return 'bg-green-500';
    if (percentage <= 95) return 'bg-yellow-500';
    if (percentage <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Функция для получения цвета статуса
  const getStatusColor = (status: 'ok' | 'warning' | 'error' | 'below-min') => {
    switch (status) {
      case 'ok':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'below-min':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Формируем данные для отправки
      // Цена и валюта сохраняются как есть — в той валюте, которую выбрал пользователь
      const formattedDuties = dutyItems.map((item) => ({
        dutyId: item.dutyId,
        userId: item.userId,
        price: !isEmpty(item.price) ? item.price : null,
        percentage: !isEmpty(item.percentage) ? item.percentage : null,
        // Сохраняем валюту, выбранную пользователем для этой обязанности
        currency: item.currency,
      }));

      // Имитация задержки для демонстрации индикатора загрузки
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Вызываем функцию из пропсов для сохранения распределения
      await onSubmit(formattedDuties, effectiveDate || undefined);
    } catch (error) {
      console.error('Ошибка при сохранении распределения:', error);
      setValidationError(
        'Произошла ошибка при сохранении. Пожалуйста, попробуйте еще раз.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Рендеринг круговой диаграммы для визуализации распределения зарплаты
  const renderPieChart = () => {
    const total = salaryDistributionData.reduce(
      (sum, item) => sum + item.value,
      0
    );
    if (total === 0) return null;

    let startAngle = 0;

    return (
      <div className="flex flex-col items-center mt-4">
        <h4 className="text-md font-medium text-gray-700 mb-2">
          Предварительный просмотр распределения
        </h4>
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {salaryDistributionData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const endAngle = startAngle + (percentage / 100) * 360;

              // Вычисляем точки для дуги
              const x1 =
                50 + 40 * Math.cos(((startAngle - 90) * Math.PI) / 180);
              const y1 =
                50 + 40 * Math.sin(((startAngle - 90) * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((endAngle - 90) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((endAngle - 90) * Math.PI) / 180);

              // Определяем какую дугу рисовать (большую или малую)
              const largeArcFlag = percentage > 50 ? 1 : 0;

              const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              const result = (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );

              startAngle = endAngle;
              return result;
            })}
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
          {salaryDistributionData.map((item, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-4 h-4 mr-2"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm truncate">{item.label}</span>
              <span className="text-sm font-medium ml-1">
                {formatAmountWithCurrency(item.value, workCurrency)}{' '}
                {(toNumber(workSalary) ?? 0) > 0
                  ? `(${Math.round((item.value / (toNumber(workSalary) ?? 1)) * 100)}%)`
                  : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Редактирование обязанностей
            </h3>

            {dutyItems.length === 0 ? (
              <p className="text-gray-500 italic mb-4">
                Нет назначенных обязанностей
              </p>
            ) : (
              dutyItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row gap-3 mb-6 md:mb-4 items-end border-b pb-4 md:pb-2 last:border-b-0"
                >
                  <div className="flex-1 md:w-1/4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Обязанность
                    </label>
                    <select
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={item.dutyId}
                      onChange={(e) =>
                        handleChange(index, 'dutyId', e.target.value)
                      }
                      disabled={isLoading}
                      tabIndex={0}
                    >
                      {duties.map((duty) => {
                        const dutyCurrency: 'RUB' | 'USD' =
                          ((duty.currency as 'RUB' | 'USD') || workCurrency || 'RUB');
                        const minLabel =
                          duty.minValue !== null && duty.minValue !== undefined
                            ? formatAmountWithCurrency(Number(duty.minValue || 0), dutyCurrency)
                            : null;
                        const maxLabel =
                          duty.maxValue !== null && duty.maxValue !== undefined
                            ? formatAmountWithCurrency(Number(duty.maxValue || 0), dutyCurrency)
                            : null;
                        let range = '';
                        if (minLabel && maxLabel) range = ` (${minLabel} - ${maxLabel})`;
                        else if (minLabel) range = ` (мин: ${minLabel})`;
                        else if (maxLabel) range = ` (макс: ${maxLabel})`;
                        return (
                          <option key={duty.id} value={duty.id}>
                            {duty.name}
                            {range}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex-1 md:w-1/4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ответственный
                    </label>
                    <select
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={item.userId}
                      onChange={(e) =>
                        handleChange(index, 'userId', e.target.value)
                      }
                      disabled={isLoading}
                      tabIndex={0}
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {`${user.lastName || ''} ${user.firstName || ''}`.trim() ||
                            user.email ||
                            'Пользователь'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 md:w-1/6">
                    <div className="flex items-center justify-between mb-1">
                      <Tooltip
                        content={`Цена обязанности в ${item.currency === 'USD' ? 'долларах' : 'рублях'}. При переключении валюты сумма автоматически пересчитается по курсу на дату релиза.`}
                        placement="top"
                      >
                        <label className="block text-sm font-medium text-gray-700 cursor-help">
                          Цена ({item.currency === 'USD' ? '$' : '₽'})
                        </label>
                      </Tooltip>
                      {/* CurrencySwitch для каждой обязанности */}
                      <CurrencySwitch
                        value={item.currency}
                        onChange={(newCurrency) => handleCurrencyChange(index, newCurrency)}
                        size="sm"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${convertingIndex === index ? 'opacity-50' : ''}`}
                        placeholder="Цена"
                        value={item.price}
                        onChange={(e) =>
                          handleChange(index, 'price', e.target.value)
                        }
                        disabled={isLoading || convertingIndex === index}
                        tabIndex={0}
                      onBlur={(e) => {
                        if (e.target.value !== '') {
                          const valueNum = Number(e.target.value);
                          if (!isNaN(valueNum)) {
                            handleChange(index, 'price', toFixedTrim(valueNum, 2));
                          }
                        }
                      }}
                        aria-label={`Цена в ${item.currency === 'USD' ? 'долларах' : 'рублях'}`}
                      />
                      {convertingIndex === index && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 md:w-1/6">
                    <Tooltip
                      content="Процент от общей суммы зарплаты за работу. Все проценты в сумме не должны превышать 100%"
                      placement="top"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1 cursor-help">
                        Процент (%)
                      </label>
                    </Tooltip>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Процент"
                      value={item.percentage}
                      onChange={(e) =>
                        handleChange(index, 'percentage', e.target.value)
                      }
                      disabled={isLoading}
                      tabIndex={0}
                      onBlur={(e) => {
                        if (e.target.value !== '') {
                          const value = Number(e.target.value);
                          if (!isNaN(value)) {
                            // Всегда сохраняем как целое число (проценты)
                            const bounded = Math.max(0, Math.min(100, value));
                            handleChange(index, 'percentage', toIntString(bounded));
                          }
                        }
                      }}
                      aria-label="Процент от суммы зарплаты"
                    />
                  </div>

                  <div className="flex-1 md:w-1/6">
                    <Tooltip
                      content="Итоговая сумма: базовая цена + процент от зарплаты"
                      placement="top"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1 cursor-help">
                        Итого
                      </label>
                    </Tooltip>
                    {(() => {
                      // Вычисляем сумму обязанности
                      // totalWork — в валюте работы (для сравнения лимитов)
                      // totalDisplay — в валюте обязанности (для отображения)
                      let totalWork = 0;
                      let totalDisplay = 0;

                      // Фиксированная сумма
                      if (item.price && item.price !== '') {
                        const priceInDutyCurrency = Number(item.price) || 0;
                        totalWork += convertToWorkCurrency(
                          priceInDutyCurrency,
                          item.currency
                        );
                        totalDisplay += priceInDutyCurrency;
                      }

                      // Процентная часть
                      if (
                        item.percentage &&
                        item.percentage !== '' &&
                        numericSalary
                      ) {
                        const percentage = Number(item.percentage) || 0;
                        const percentAmountWork =
                          (percentage / 100) * numericSalary;
                        totalWork += percentAmountWork;
                        const percentAmountItem =
                          convertSync(
                            percentAmountWork,
                            workCurrency,
                            item.currency
                          ) ?? percentAmountWork;
                        totalDisplay += percentAmountItem;
                      }

                      // Получаем выбранную обязанность
                      const selectedDuty = duties.find(
                        (duty) => duty.id === item.dutyId
                      );

                      // Конвертируем минимумы максимумы и максимумы в соответствующую валюту в валюту работы работы для сравнения лимитов
                      const minOriginal = toNumber(selectedDuty?.minValue);
                      const maxOriginal = toNumber(selectedDuty?.maxValue);
                      const dutyCurrency = (selectedDuty?.currency as 'RUB' | 'USD') || workCurrency;
                      const minValueNumeric =
                        minOriginal !== null
                          ? convertToWorkCurrency(minOriginal, dutyCurrency)
                          : null;
                      const maxValueNumeric =
                        maxOriginal !== null
                          ? convertToWorkCurrency(maxOriginal, dutyCurrency)
                          : null;

                      // Проверяем, соответствует ли сумма ограничениям
                      const isBelow =
                        minValueNumeric !== null && totalWork < minValueNumeric;
                      const isAbove =
                        maxValueNumeric !== null && totalWork > maxValueNumeric;

                      // Проверяем, активна ли обязанность (заполнены ли поля)
                      const isActive =
                        (item.price && item.price !== '') ||
                        (item.percentage && item.percentage !== '');

                      // Функция для автоматической корректировки суммы обязанности
                      const adjustDutyAmount = () => {
                        // Если обязанность не выбрана, не выполняем операцию
                        if (!selectedDuty) return;

                        // Преобразуем зарплату работы в число
                        const numericSalary = toNumber(workSalary) || 0;

                        // Если сумма ниже минимального значения, увеличиваем до минимума
                        if (isBelow && minValueNumeric !== null) {
                          // Конвертируем минимальную сумму в валюту текущей обязанности для корректного отображения
                          const minInItemCurrency =
                            minOriginal !== null
                              ? convertSync(
                                  minOriginal,
                                  dutyCurrency,
                                  item.currency
                                ) ?? minOriginal
                              : null;
                          handleChange(
                            index,
                            'price',
                            (minInItemCurrency ?? minValueNumeric).toString()
                          );
                        }
                        // Если сумма выше максимального значения, уменьшаем до максимума
                        else if (isAbove && maxValueNumeric !== null) {
                          const maxInItemCurrency =
                            maxOriginal !== null
                              ? convertSync(
                                  maxOriginal,
                                  dutyCurrency,
                                  item.currency
                                ) ?? maxOriginal
                              : null;
                          handleChange(
                            index,
                            'price',
                            (maxInItemCurrency ?? maxValueNumeric).toString()
                          );
                        }
                        // В противном случае, устанавливаем 10% от зарплаты работы
                        else if (numericSalary > 0) {
                          const percentValue = 10;
                          handleChange(
                            index,
                            'percentage',
                            percentValue.toString()
                          );
                        }
                      };

                      // Определяем стиль и класс в зависимости от ограничений
                      const amountClass = isBelow
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : isAbove
                          ? 'bg-orange-50 border-orange-300 text-orange-600'
                          : 'bg-green-50 border-green-300 text-green-600';

                      // Создаем текст подсказки
                      const tooltipText = isBelow
                        ? `Сумма ниже минимального ограничения (${selectedDuty?.minValue != null ? formatAmountWithCurrency(Number(selectedDuty?.minValue || 0), dutyCurrency) : ''}). Нажмите, чтобы исправить.`
                        : isAbove
                          ? `Сумма превышает максимальное ограничение (${selectedDuty?.maxValue != null ? formatAmountWithCurrency(Number(selectedDuty?.maxValue || 0), dutyCurrency) : ''}). Нажмите, чтобы исправить.`
                          : '';

                      // Стиль курсора для интерактивных элементов
                      const cursorStyle =
                        isBelow || isAbove ? { cursor: 'pointer' } : {};

                      const handleAmountClick = () => {
                        if (isBelow || isAbove) {
                          adjustDutyAmount();
                        }
                      };

                      return (
                        <div
                          className={`mt-1 py-2 px-3 rounded-md border text-center ${isActive ? amountClass : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                          onClick={
                            isBelow || isAbove ? handleAmountClick : undefined
                          }
                          title={tooltipText}
                          style={cursorStyle}
                        >
                          {isActive
                            ? formatAmountWithCurrency(totalDisplay, item.currency)
                            : '—'}
                          {isBelow && (
                            <div className="text-xs text-red-500 mt-1">
                              Мин: {formatAmountWithCurrency(Number(selectedDuty?.minValue || 0), (selectedDuty?.currency === 'USD' ? 'USD' : 'RUB'))}
                            </div>
                          )}
                          {isAbove && (
                            <div className="text-xs text-orange-500 mt-1">
                              Макс: {formatAmountWithCurrency(Number(selectedDuty?.maxValue || 0), (selectedDuty?.currency === 'USD' ? 'USD' : 'RUB'))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="md:self-stretch flex items-end md:pb-0">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleRemoveDuty(index)}
                      disabled={isLoading || isRemoving === index}
                      isLoading={isRemoving === index}
                      className="w-full"
                      aria-label="Удалить обязанность"
                      tabIndex={0}
                    >
                      {isRemoving !== index && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}

            {/* Блок с ошибкой валидации */}
            {validationError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586l-1.293-1.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{validationError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Индикатор прогресса процентов */}
            {dutyItems.some(
              (item) =>
                (item.percentage && item.percentage !== '') ||
                (item.price && item.price !== '')
            ) && (
              <div className="mt-4 mb-6">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Распределено от зарплаты ({workCurrency}):{' '}
                    {numericSalary > 0
                      ? `${formatAmountWithCurrency((totalPercentage * numericSalary) / 100, workCurrency)} (${Math.round(totalPercentage)}%)`
                      : `${Math.min(totalPercentage, 9999.9999).toFixed(4)}%`}
                  </span>
                  <span
                    className={`inline-block w-auto px-2 py-1 rounded ${
                      exceedsWorkSalary
                        ? 'bg-red-100 text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {exceedsWorkSalary
                      ? 'Превышено!'
                      : numericSalary > 0
                        ? `Осталось: ${formatAmountWithCurrency(((100 - totalPercentage) * numericSalary) / 100, workCurrency)} (${Math.round(100 - totalPercentage)}%)`
                        : `Осталось: 0.0000%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressColor(totalPercentage)}`}
                    style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                  ></div>
                </div>
                {totalPercentage > 100 && (
                  <div className="w-full bg-red-200 rounded-full h-2.5 mt-1 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-red-500"
                      style={{
                        width: `${Math.min((totalPercentage - 100) * 5, 100)}%`,
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddDuty}
                disabled={isLoading || !unusedDutiesExist}
                tabIndex={0}
              >
                Добавить обязанность
              </Button>

              {numericSalary > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSalaryPreview(!showSalaryPreview)}
                  disabled={isLoading}
                  tabIndex={0}
                >
                  {showSalaryPreview
                    ? 'Скрыть предпросмотр'
                    : 'Показать предпросмотр'}
                </Button>
              )}

              <span className="text-sm text-gray-500 ml-auto">
                {!unusedDutiesExist &&
                  dutyItems.length > 0 &&
                  '(Все обязанности уже добавлены)'}
              </span>
            </div>

            {/* Визуализация распределения зарплаты */}
            {showSalaryPreview && salaryDistributionData.length > 0 && (
              <div className="mt-4 border-t pt-4">{renderPieChart()}</div>
            )}
          </div>

          {/* Поле для выбора даты вступления в силу */}
          <div className="mt-6 border-t pt-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата вступления в силу
              </label>
              <input
                type="date"
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={isLoading || isSubmitting}
                tabIndex={0}
              />
              <p className="mt-1 text-sm text-gray-500">
                Если не указана, будет использована текущая дата
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading || isSubmitting}
              isLoading={isLoading}
              tabIndex={0}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isSubmitting || !!validationError}
              isLoading={isLoading || isSubmitting}
              tabIndex={0}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default WorkDutiesForm;
