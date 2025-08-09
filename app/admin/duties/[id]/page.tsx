'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../../store';
import {
  fetchDutyById,
  updateDuty,
  clearCurrentDuty,
} from '../../../../store/slices/duties';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Alert from '../../../../components/ui/Alert';
import { Role } from '../../../../types/user';

export default function EditDutyPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentDuty, isLoading, error } = useAppSelector(
    (state) => state.duties
  );
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dutyId = params.id;

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [basePercentage, setBasePercentage] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }

    // Загружаем данные обязанности
    dispatch(fetchDutyById(dutyId));

    // Очищаем данные при размонтировании компонента
    return () => {
      dispatch(clearCurrentDuty());
    };
  }, [isAuthenticated, router, user, dispatch, dutyId]);

  useEffect(() => {
    if (currentDuty) {
      setName(currentDuty.name);
      setBasePrice(currentDuty.basePrice?.toString() || '');
      setBasePercentage(currentDuty.basePercentage?.toString() || '');
      setMinValue(currentDuty.minValue?.toString() || '');
      setMaxValue(currentDuty.maxValue?.toString() || '');
    }
  }, [currentDuty]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setFormError('Название обязанности обязательно');
      return false;
    }

    // Проверяем, что хотя бы одно из полей заполнено или оба пустые
    if (basePrice && isNaN(parseFloat(basePrice))) {
      setFormError('Базовая цена должна быть числом');
      return false;
    }

    if (basePercentage && isNaN(parseFloat(basePercentage))) {
      setFormError('Базовый процент должен быть числом');
      return false;
    }

    if (
      basePercentage &&
      (parseFloat(basePercentage) < 0 || parseFloat(basePercentage) > 100)
    ) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    // Функция для безопасного форматирования числовых значений
    const formatNumberValue = (value: string | null): string | null => {
      if (!value || value.trim() === '') return null;

      try {
        // Проверяем, что это валидное число
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return null;

        // Форматируем до 2-х знаков после запятой
        return numValue.toFixed(2);
      } catch (error) {
        console.error('Error formatting number:', error);
        return null;
      }
    };

    const dutyData = {
      name,
      basePrice: formatNumberValue(basePrice),
      basePercentage: formatNumberValue(basePercentage),
      minValue: formatNumberValue(minValue),
      maxValue: formatNumberValue(maxValue),
    };

    console.log('Отправляемые данные:', dutyData);

    const resultAction = await dispatch(
      updateDuty({ id: dutyId, data: dutyData })
    );
    if (updateDuty.fulfilled.match(resultAction)) {
      router.push('/admin/duties');
    }
  };

  const handleCancel = () => {
    router.push('/admin/duties');
  };

  if (!user || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Редактирование обязанности
          </h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {(formError || (error && error !== 'REQUEST_CANCELLED')) && (
              <Alert type="error">
                {formError || (error !== 'REQUEST_CANCELLED' ? error : '')}
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Название обязанности *
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Название обязанности"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="basePrice"
                  className="block text-sm font-medium text-gray-700"
                >
                  Базовая цена (тыс. руб.)
                </label>
                <Input
                  id="basePrice"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="10"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Оставьте поле пустым, если не требуется указывать цену
                </p>
              </div>

              <div>
                <label
                  htmlFor="basePercentage"
                  className="block text-sm font-medium text-gray-700"
                >
                  Базовый процент от зарплаты (%)
                </label>
                <Input
                  id="basePercentage"
                  value={basePercentage}
                  onChange={(e) => setBasePercentage(e.target.value)}
                  placeholder="20"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Оставьте поле пустым, если не требуется указывать процент
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="minValue"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Минимальное значение суммы
                  </label>
                  <Input
                    id="minValue"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    placeholder="15000"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Минимальная сумма стоимости и процента
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="maxValue"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Максимальное значение суммы
                  </label>
                  <Input
                    id="maxValue"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    placeholder="50000"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Максимальная сумма стоимости и процента
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
