'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../../store';
import {
  fetchDutyById,
  updateDuty,
  fetchAllDistributions,
  deleteDuty,
} from '../../../../store/slices/duties';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import DutyForm, { DutyFormData } from '../../../../components/duties/DutyForm';
import { Role } from '../../../../types/user';

export default function EditDutyPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentDuty, isLoading, error, distributions } = useAppSelector(
    (state) => state.duties
  );
  const distributionsCount = distributions?.length ?? 0;
  const dispatch = useAppDispatch();
  const router = useRouter();
  const dutyId = params.id;
  const loadedDutyRef = useRef(false);
  const loadedDistributionsRef = useRef(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    // Проверка аутентификации и прав администратора
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (![Role.ADMIN, Role.MANAGER].includes(user?.role as Role)) {
      router.push('/dashboard');
      return;
    }

    // Загружаем данные обязанности один раз (даже при двойном монтировании)
    if (!loadedDutyRef.current && !isLoading && currentDuty?.id !== dutyId) {
      dispatch(fetchDutyById({ role: user.role, dutyId }));
      loadedDutyRef.current = true;
    }
    // Загружаем распределения один раз (избегаем дубликатов в strict mode)
    if (!loadedDistributionsRef.current && distributionsCount === 0) {
      dispatch(fetchAllDistributions({ role: user.role }));
      loadedDistributionsRef.current = true;
    }
  }, [
    dispatch,
    isAuthenticated,
    router,
    user,
    dutyId,
    isLoading,
    currentDuty?.id,
    distributionsCount,
  ]);

  // Промежуточное состояние для формы
  const [initialData, setInitialData] = useState<DutyFormData | null>(null);

  useEffect(() => {
    if (currentDuty) {
      setInitialData({
        name: currentDuty.name,
        basePrice: currentDuty.basePrice?.toString() || '',
        basePercentage: currentDuty.basePercentage?.toString() || '',
        minValue: currentDuty.minValue?.toString() || '',
        maxValue: currentDuty.maxValue?.toString() || '',
        currency: currentDuty.currency === 'USD' ? 'USD' : 'RUB',
      });
    }
  }, [currentDuty]);

  const handleSubmit = async (formData: DutyFormData) => {
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
      name: formData.name,
      basePrice: formatNumberValue(formData.basePrice),
      basePercentage: formatNumberValue(formData.basePercentage),
      currency: formData.currency,
      minValue: formatNumberValue(formData.minValue),
      maxValue: formatNumberValue(formData.maxValue),
    };

    const resultAction = await dispatch(
      updateDuty({ role: user.role, id: dutyId, data: dutyData })
    );
    if (updateDuty.fulfilled.match(resultAction)) {
      router.push('/admin/duties');
    }
  };

  const handleCancel = () => {
    router.push('/admin/duties');
  };

  const isUsed = Boolean(
    distributions?.some((d) => d.details?.some((dd) => dd.dutyId === dutyId))
  );

  const handleDelete = async () => {
    if (!currentDuty) return;
    const result = await dispatch(deleteDuty({ role: user.role, id: dutyId }));
    if (deleteDuty.fulfilled.match(result)) {
      router.push('/admin/duties');
    }
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

        <DutyForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={() => setIsDeleteModalOpen(true)}
          isLoading={isLoading}
          error={error}
          submitLabel="Сохранить"
          savingLabel="Сохранение..."
          isUsed={isUsed}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Удалить обязанность?"
          message={`Вы действительно хотите удалить обязанность "${currentDuty?.name ?? ''}"? Это действие необратимо.`}
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
        />
      </div>
    </div>
  );
}
