'use client';

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/layout/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import CurrencySwitch from '../../../components/ui/CurrencySwitch';
import { createWork } from '../../../store/slices/works';
import { fetchAllUsers } from '../../../store/slices/users';
import { CreateWorkDto } from '../../../types/work';
import Alert from '../../../components/ui/Alert';

export default function CreateWorkPage() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error } = useAppSelector((state) => state.works);
  const { users } = useAppSelector((state) => state.users);
  const [formData, setFormData] = useState<CreateWorkDto>({
    name: '',
    responsibleUserId: '',
    salary: '0',
    releaseDate: '',
    currency: 'RUB',
  });
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Загружаем список пользователей при монтировании компонента
  useEffect(() => {
    if (!user?.role) {
      return;
    }

    dispatch(fetchAllUsers({ role: user.role }));
  }, [dispatch, user?.role]);

  // Обработчик изменения полей формы
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Очищаем ошибку для измененного поля
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Название работы обязательно';
    }

    if (!formData.responsibleUserId) {
      errors.responsibleUserId = 'Необходимо выбрать ответственного';
    }

    if (!formData.salary || Number(formData.salary) < 0) {
      errors.salary = 'Зарплата не может быть отрицательной';
    }

    if (!formData.releaseDate || formData.releaseDate.trim() === '') {
      errors.releaseDate = 'Дата выхода обязательна';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSuccess('');
      const resultAction = await dispatch(
        createWork({ role: user.role, data: formData })
      );

      if (createWork.fulfilled.match(resultAction)) {
        setSuccess('Работа успешно создана');
        // После создания работы перенаправляем на список работ через 1.5 секунды
        setTimeout(() => {
          router.push('/works');
        }, 1500);
      }
    } catch (err) {
      console.error('Ошибка при создании работы:', err);
    }
  };

  // Создаем список опций для выбора ответственного
  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.lastName} ${user.firstName} ${user.middleName || ''} (${user.email})`,
  }));

  return (
    <Layout>
      <div className="py-6">
        <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Создание новой работы
          </h1>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Название работы
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1"
                  placeholder="Введите название работы"
                  error={formErrors.name}
                />
              </div>

              <div>
                <label
                  htmlFor="responsibleUserId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Ответственный
                </label>
                {users.length > 0 ? (
                  <Select
                    id="responsibleUserId"
                    name="responsibleUserId"
                    value={formData.responsibleUserId}
                    onChange={handleChange}
                    className="mt-1"
                    error={formErrors.responsibleUserId}
                  >
                    <option value="">Выберите ответственного</option>
                    {userOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="text-gray-500 italic">
                    Загрузка списка пользователей...
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label
                    htmlFor="salary"
                    className="block text-sm font-medium text-gray-700 mr-4"
                  >
                    Бюджет проекта
                  </label>
                  <CurrencySwitch
                    value={formData.currency as 'RUB' | 'USD'}
                    onChange={(val) =>
                      setFormData((p) => ({ ...p, currency: val }))
                    }
                    size="sm"
                  />
                </div>

                <div className="relative">
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.salary || ''}
                    onChange={handleChange}
                    className=" pl-8 "
                    placeholder="Введите бюджет"
                    error={formErrors.salary}
                  />
                  <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 pl-4 flex items-center transform">
                    <span className="text-gray-500 text-sm">
                      {formData.currency === 'USD' ? '$' : '₽'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="releaseDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Дата выхода
                </label>
                <Input
                  id="releaseDate"
                  name="releaseDate"
                  type="date"
                  value={formData.releaseDate || ''}
                  onChange={handleChange}
                  className="mt-1"
                  placeholder="Выберите дату выхода"
                  error={formErrors.releaseDate}
                />
              </div>

              {error && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/works')}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Создать работу
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
