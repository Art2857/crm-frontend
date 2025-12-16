'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../../store';
import { createDuty } from '../../../../store/slices/duties';
import { Role } from '../../../../types/user';
import DutyForm, { DutyFormData } from '../../../../components/duties/DutyForm';

export default function CreateDutyPage() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { isLoading, error } = useAppSelector((state) => state.duties);
  const dispatch = useAppDispatch();
  const router = useRouter();

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
  }, [isAuthenticated, router, user]);



  const handleSubmit = async (formData: DutyFormData) => {
    const dutyData = {
      name: formData.name,
      basePrice: formData.basePrice ? formData.basePrice : null,
      basePercentage: formData.basePercentage ? formData.basePercentage : null,
      currency: formData.currency,
      minValue: formData.minValue ? formData.minValue : null,
      maxValue: formData.maxValue ? formData.maxValue : null,
    };

    const resultAction = await dispatch(
      createDuty({ role: user.role, data: dutyData })
    );
    if (createDuty.fulfilled.match(resultAction)) {
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
            Добавление новой обязанности
          </h1>
        </div>

        <DutyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
