// Утилиты для системы выплат

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getPaymentTypeColor = (type: string) => {
  const colors = {
    SALARY: 'bg-green-100 text-green-800',
    BONUS: 'bg-blue-100 text-blue-800',
    ADVANCE: 'bg-yellow-100 text-yellow-800',
    EXTRA: 'bg-purple-100 text-purple-800',
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};
