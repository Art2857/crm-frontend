/**
 * Утилиты для форматирования валютных значений
 */

/**
 * Базовая функция форматирования числа с разделителями разрядов
 *
 * @param value Числовое значение
 * @param decimals Количество знаков после запятой
 * @param useComma Использовать запятую вместо точки
 * @returns Отформатированная строка
 */
function formatNumber(
  value: number | null | undefined,
  decimals: number = 0,
  useComma: boolean = true
): string {
  // Обработка null/undefined и NaN
  if (value === null || value === undefined || isNaN(Number(value))) {
    return useComma
      ? '0' + (decimals > 0 ? ',' + '0'.repeat(decimals) : '')
      : '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
  }

  try {
    // Преобразуем в число
    const numValue = Number(value);

    // Форматируем с нужным количеством знаков после запятой
    const formatted = numValue.toFixed(decimals);

    // Разделяем целую и дробную часть
    const parts = formatted.split('.');

    // Добавляем разделители между разрядами в целой части
    if (parts[0].length > 3) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // Возвращаем с запятой или точкой в зависимости от флага
    return useComma ? parts.join(',') : parts.join('.');
  } catch (error) {
    console.error('Ошибка при форматировании числа:', error);
    return useComma
      ? '0' + (decimals > 0 ? ',' + '0'.repeat(decimals) : '')
      : '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
  }
}

/**
 * Форматирует денежное значение для отображения
 *
 * @param value Значение в рублях (число или строка)
 * @param showDecimals Показывать ли десятичную часть
 * @returns Отформатированная строка (например, "180 000 ₽" или "180 ₽")
 */
export function formatCurrency(
  value: number | string | null | undefined,
  showDecimals = true
): string {
  try {
    // Если передана строка, преобразуем в число
    let numValue: number | null | undefined;

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      numValue = isNaN(parsed) ? null : parsed;
    } else {
      numValue = value as number | null | undefined;
    }

    // Больше не делим на 1000, так как отображаем в рублях, а не в тыс. руб.
    // ВАЖНО: В базе данных хранятся значения в рублях, и теперь мы отображаем их напрямую

    const formattedValue = formatNumber(numValue, showDecimals ? 0 : 0, true);
    return `${formattedValue} ₽`;
  } catch (error) {
    console.error('Ошибка при форматировании валюты:', error);
    return '0 ₽';
  }
}

/**
 * Форматирует процентное значение для отображения
 *
 * @param value Процентное значение
 * @param showDecimals Показывать ли десятичную часть
 * @returns Отформатированная строка (например, "20,0000%" или "20%")
 */
export function formatPercentage(
  value: number | string | null | undefined,
  showDecimals = true
): string {
  try {
    // Преобразуем строковое значение в число
    let numValue: number | null | undefined;

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      numValue = isNaN(parsed) ? null : parsed;
    } else {
      numValue = value as number | null | undefined;
    }

    // Если нужно показать десятичную часть, используем 4 знака, иначе округляем
    const valueToFormat = showDecimals
      ? numValue
      : numValue !== null && numValue !== undefined
        ? Math.round(Number(numValue))
        : numValue;

    // Проверка на NaN после преобразования
    if (
      valueToFormat !== null &&
      valueToFormat !== undefined &&
      isNaN(Number(valueToFormat))
    ) {
      return '0%';
    }

    const formattedValue = formatNumber(
      valueToFormat,
      showDecimals ? 4 : 0,
      true
    );
    return `${formattedValue}%`;
  } catch (error) {
    console.error('Ошибка при форматировании процента:', error);
    return '0%';
  }
}

/**
 * Форматирует числовую сумму в указанной валюте.
 * Поддерживает как минимум RUB и USD.
 */
export function formatAmountWithCurrency(
  value: number | null | undefined,
  currency: 'RUB' | 'USD'
): string {
  try {
    const num = Number(value || 0);
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: currency === 'RUB' ? 0 : 2,
    }).format(num);
  } catch {
    const base = Math.round(Number(value || 0)).toLocaleString('ru-RU');
    return `${base} ${currency}`;
  }
}

/**
 * Форматирует полное представление оплаты с расчетом
 * Показывает фиксированную цену и процент в формате "14 000 ₽ + 20% = 50 000 ₽"
 * Если оба значения null, возвращает "Остаточная"
 *
 * @param price Фиксированная цена в рублях
 * @param percentage Процент
 * @param calculatedValue Итоговое значение суммы в рублях
 * @returns Отформатированная строка с наглядным расчетом
 */
export function formatPayment(
  price: number | null | undefined,
  percentage: number | null | undefined,
  calculatedValue: number | null | undefined
): string {
  try {
    if (price === null && percentage === null) return 'Остаточная';

    const parts: string[] = [];

    // Добавляем фиксированную цену, если указана
    if (price !== null && price !== undefined) {
      parts.push(formatCurrency(price, true));
    }

    // Добавляем процент, если указан
    if (percentage !== null && percentage !== undefined) {
      parts.push(formatPercentage(percentage, false));
    }

    // Собираем текст с компонентами расчета
    let text = parts.join(' + ');

    // Добавляем итоговое значение, если указано
    if (calculatedValue !== null && calculatedValue !== undefined) {
      text += ` = ${formatCurrency(calculatedValue, true)}`;
    }

    return text;
  } catch (error) {
    console.error('Ошибка при форматировании оплаты:', error);
    return 'Ошибка расчета';
  }
}
