import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import CurrencySwitch from '../ui/CurrencySwitch';

export interface DutyFormData {
  name: string;
  basePrice: string;
  basePercentage: string;
  minValue: string;
  maxValue: string;
  currency: 'RUB' | 'USD';
}

interface DutyFormProps {
  initialData?: DutyFormData;
  onSubmit: (data: DutyFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading: boolean;
  error?: string | null;
  submitLabel?: string;
  savingLabel?: string;
  isUsed?: boolean; // For disabling delete
}

export default function DutyForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isLoading,
  error,
  submitLabel = 'Сохранить',
  savingLabel = 'Сохранение...',
  isUsed = false,
}: DutyFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DutyFormData>({
    name: '',
    basePrice: '',
    basePercentage: '',
    minValue: '',
    maxValue: '',
    currency: 'RUB',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof DutyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const setCurrency = (currency: 'RUB' | 'USD') => {
    setFormData((prev) => ({ ...prev, currency }));
  };

  const validateForm = (): boolean => {
    const { name, basePrice, basePercentage, minValue, maxValue } = formData;
    if (!name.trim()) {
      setFormError('Название обязанности обязательно');
      return false;
    }

    if (basePrice && isNaN(parseFloat(basePrice))) {
      setFormError('Базовая цена должна быть числом');
      return false;
    }

    if (basePercentage && isNaN(parseFloat(basePercentage))) {
      setFormError('Базовый процент должен быть числом');
      return false;
    }

    if (basePercentage && (parseFloat(basePercentage) < 0 || parseFloat(basePercentage) > 100)) {
      setFormError('Базовый процент должен быть от 0 до 100');
      return false;
    }

    if (minValue && isNaN(parseFloat(minValue))) {
      setFormError('Минимальное значение должно быть числом');
      return false;
    }

    if (maxValue && isNaN(parseFloat(maxValue))) {
      setFormError('Максимальное значение должно быть числом');
      return false;
    }

    if (minValue && maxValue && parseFloat(minValue) > parseFloat(maxValue)) {
      setFormError('Минимальное значение не может быть больше максимального');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {(formError || (error && error !== 'REQUEST_CANCELLED')) && (
          <Alert type="error">{formError || (error !== 'REQUEST_CANCELLED' ? error : '')}</Alert>
        )}

        <div className="space-y-6">
          {/* Название обязанности - первым */}
          <div>
            <Input
              id="name"
              label="Название обязанности"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Название обязанности"
              fullWidth
              required
            />
          </div>

          {/* Блок с финансовыми параметрами */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Финансовые параметры</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Валюта:</span>
                <CurrencySwitch value={formData.currency} onChange={setCurrency} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  id="basePrice"
                  label={`Базовая цена (${formData.currency === 'RUB' ? 'RUB' : 'USD'})`}
                  value={formData.basePrice}
                  onChange={(e) => handleChange('basePrice', e.target.value)}
                  placeholder="10"
                  type="number"
                  step="0.01"
                  min="0"
                  fullWidth
                />
                <p className="mt-1 text-xs text-gray-500">Оставьте пустым, если не требуется</p>
              </div>

              <div>
                <Input
                  id="basePercentage"
                  label="Базовый процент от зарплаты (%)"
                  value={formData.basePercentage}
                  onChange={(e) => handleChange('basePercentage', e.target.value)}
                  placeholder="20"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  fullWidth
                />
                <p className="mt-1 text-xs text-gray-500">Оставьте пустым, если не требуется</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-200">
              <div>
                <Input
                  id="minValue"
                  label="Минимальная сумма"
                  value={formData.minValue}
                  onChange={(e) => handleChange('minValue', e.target.value)}
                  placeholder="15000"
                  type="number"
                  step="0.01"
                  min="0"
                  fullWidth
                />
                <p className="mt-1 text-xs text-gray-500">Минимум (стоимость + процент)</p>
              </div>

              <div>
                <Input
                  id="maxValue"
                  label="Максимальная сумма"
                  value={formData.maxValue}
                  onChange={(e) => handleChange('maxValue', e.target.value)}
                  placeholder="50000"
                  type="number"
                  step="0.01"
                  min="0"
                  fullWidth
                />
                <p className="mt-1 text-xs text-gray-500">Максимум (стоимость + процент)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={isLoading || isUsed}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              {isLoading ? 'Удаление...' : 'Удалить'}
            </Button>
          )}

          <div className={`flex items-center space-x-3 ${!onDelete ? 'ml-auto' : ''}`}>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? savingLabel : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
