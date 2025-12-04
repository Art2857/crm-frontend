// Утилиты для системы выплат

export type CurrencyType = 'RUB' | 'USD';

export const formatCurrency = (
  amount: number,
  currency: CurrencyType = 'RUB'
) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// Safely resolve duty currency from either a top-level `currency` field
// or a nested `duty.currency` field. Defaults to 'RUB' if missing/unknown.
export function resolveDutyCurrency<T extends { duty?: { currency?: string } }>(
  obj: T & { currency?: string }
): CurrencyType {
  const top = obj.currency;
  const nested = obj.duty?.currency;
  const val = (top ?? nested) === 'USD' ? 'USD' : 'RUB';
  return val as CurrencyType;
}

export const getPaymentTypeColor = (type: string) => {
  const colors = {
    SALARY: 'bg-green-100 text-green-800',
    BONUS: 'bg-blue-100 text-blue-800',
    ADVANCE: 'bg-yellow-100 text-yellow-800',
    EXTRA: 'bg-purple-100 text-purple-800',
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};
