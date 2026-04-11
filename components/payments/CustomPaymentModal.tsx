'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CurrencySwitch from '../ui/CurrencySwitch';
import TextArea from '../ui/TextArea';
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { CustomPaymentFormData } from '../../types/payments';
import { Work } from '../../types/work';
import { User } from '../../types/user';
import { workService } from '../../services/work';
import { workExecuterService } from '../../services/workExecuter';
import { getClosureDate } from '../../services/payment';
import { useAppSelector } from '../../store';
import { getCurrentDateISO, shiftDateISOByDays } from '../../utils/date';

interface CustomPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomPaymentFormData) => void;
  defaultWorkId?: string;
  defaultUserId?: string;
  defaultAmount?: number;
}

export default function CustomPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  defaultWorkId,
  defaultUserId,
  defaultAmount,
}: CustomPaymentModalProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [executers, setExecuters] = useState<User[]>([]);

  const [selectedWorkId, setSelectedWorkId] = useState(defaultWorkId || '');
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId || '');
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [currency, setCurrency] = useState<'RUB' | 'USD'>('RUB');
  const [type, setType] = useState('SALARY');
  const [description, setDescription] = useState(defaultAmount ? 'Выплата' : '');
  const [paymentDate, setPaymentDate] = useState(() => getCurrentDateISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [minPaymentDate, setMinPaymentDate] = useState<string | null>(null);

  // Текущий пользователь
  const { user } = useAppSelector((state) => state.auth);

  // Загрузка работ при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          if (user?.id) {
            const data = await workService.getByUserId(user.id);
            setWorks(data);
          } else {
            setWorks([]);
          }
        } catch (e) {
          console.error('Не удалось загрузить работы', e);
        }
      })();
    }
  }, [isOpen, user?.id]);

  // Загрузка исполнителей при смене работы
  useEffect(() => {
    if (selectedWorkId) {
      (async () => {
        try {
          const users = await workExecuterService.getByWorkId(selectedWorkId);
          setExecuters(users);
        } catch (e) {
          console.error('Не удалось загрузить исполнителей', e);
          setExecuters([]);
        }
      })();
    } else {
      setExecuters([]);
    }
  }, [selectedWorkId]);

  // Загрузка даты закрытия при выборе работы и получателя
  useEffect(() => {
    if (selectedWorkId && selectedUserId) {
      (async () => {
        const closureDate = await getClosureDate(selectedWorkId, selectedUserId);
        const minAllowedPaymentDate = closureDate ? shiftDateISOByDays(closureDate, 1) : null;
        setMinPaymentDate(minAllowedPaymentDate);
        setPaymentDate((currentPaymentDate) =>
          minAllowedPaymentDate && currentPaymentDate < minAllowedPaymentDate
            ? minAllowedPaymentDate
            : currentPaymentDate,
        );
      })();
    } else {
      setMinPaymentDate(null);
    }
  }, [selectedWorkId, selectedUserId]);

  // При открытии модалки заполняем поля значениями по умолчанию
  useEffect(() => {
    if (isOpen) {
      if (defaultWorkId) setSelectedWorkId(defaultWorkId);
      if (defaultUserId) setSelectedUserId(defaultUserId);
      if (defaultAmount !== undefined) setAmount(String(defaultAmount));
      setPaymentDate(getCurrentDateISO());
      setMinPaymentDate(null);
    }
  }, [isOpen, defaultWorkId, defaultUserId, defaultAmount]);

  const selectedWork = works.find((w) => w.id === selectedWorkId);
  const selectedUser = executers.find((u) => u.id === selectedUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!selectedWorkId) newErrors.work = 'Выберите работу';
    if (!selectedUserId) newErrors.user = 'Выберите получателя';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Укажите сумму выплаты';
    if (!paymentDate) {
      newErrors.paymentDate = 'Укажите дату выплаты';
    } else if (minPaymentDate && paymentDate < minPaymentDate) {
      const [y, m, d] = minPaymentDate.split('-');
      newErrors.paymentDate = `Дата выплаты должна быть не раньше ${d}.${m}.${y}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const userName = selectedUser
      ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
      : '';
    const workName = selectedWork?.name || '';

    // Маппинг для отображаемого названия типа выплаты
    const typeLabelMap: Record<string, string> = {
      SALARY: 'Зарплата',
      ADVANCE: 'Аванс',
      BONUS: 'Премия',
      EXTRA: 'Доплата',
    };

    // Если описание не заполнено, формируем его автоматически
    const finalDescription = description.trim()
      ? description.trim()
      : `${typeLabelMap[type] ?? type} по работе ${workName}`;

    // Отправляем просто дату YYYY-MM-DD
    onSubmit({
      userId: selectedUserId,
      workId: selectedWorkId,
      amount: parseFloat(amount),
      type,
      description: finalDescription,
      userName,
      workName,
      paymentDate,
      currency,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-0 max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
        {/* Стильный заголовок с градиентом */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Создать выплату</h3>
                <p className="text-purple-100 text-sm">Произвольная выплата сотруднику</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Форма */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Работа */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <BuildingOfficeIcon className="h-4 w-4 mr-2 text-blue-500" />
                Работа
              </label>
              <div className="relative">
                <Select
                  value={selectedWorkId}
                  onChange={(e) => {
                    setSelectedWorkId(e.target.value);
                    setSelectedUserId('');
                    setErrors((prev) => {
                      const { work, ...rest } = prev;
                      return rest;
                    });
                  }}
                  error={errors.work}
                  options={[
                    { value: '', label: 'Выберите работу...' },
                    ...works.map((work) => ({
                      value: work.id,
                      label: work.name,
                    })),
                  ]}
                  className="pl-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  fullWidth
                  required
                />
              </div>
            </div>

            {/* Получатель */}
            {selectedWorkId && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <UserIcon className="h-4 w-4 mr-2 text-purple-500" />
                  Получатель выплаты
                </label>
                <div className="relative">
                  <Select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setErrors((prev) => {
                        const { user, ...rest } = prev;
                        return rest;
                      });
                    }}
                    error={errors.user}
                    options={[
                      { value: '', label: 'Выберите получателя...' },
                      ...executers.map((user) => ({
                        value: user.id,
                        label: `${user.firstName || ''} ${user.lastName || ''} (${user.login})`,
                      })),
                    ]}
                    className="pl-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    fullWidth
                    required
                  />
                </div>
              </div>
            )}

            {/* Сумма */}
            {selectedUserId && (
              <div className="space-y-2">
                <label
                  htmlFor="customAmount"
                  className="flex items-center text-sm font-semibold text-gray-700"
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-2 text-green-500" />
                  Сумма выплаты
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-lg">{currency === 'USD' ? '$' : '₽'}</span>
                  </div>
                  <Input
                    id="customAmount"
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setErrors((prev) => {
                        const { amount, ...rest } = prev;
                        return rest;
                      });
                    }}
                    error={errors.amount}
                    placeholder="0"
                    className="pl-8 pr-4 py-3 text-lg rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all w-full"
                    required
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <CurrencySwitch value={currency} onChange={setCurrency} size="sm" />
                  </div>
                </div>
                {/* TODO: показать долг, когда будет API */}
              </div>
            )}

            {/* Тип выплаты */}
            {selectedUserId && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <DocumentTextIcon className="h-4 w-4 mr-2 text-orange-500" />
                  Тип выплаты
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: 'SALARY',
                      label: 'Зарплата',
                      icon: '💰',
                      desc: 'Влияет на закрытие долга',
                    },
                    {
                      value: 'ADVANCE',
                      label: 'Аванс',
                      icon: '⚡',
                      desc: 'Влияет на закрытие долга',
                    },
                    {
                      value: 'BONUS',
                      label: 'Премия',
                      icon: '🎁',
                      desc: 'Не влияет на закрытие долга',
                    },
                    {
                      value: 'EXTRA',
                      label: 'Доплата',
                      icon: '➕',
                      desc: 'Не влияет на закрытие долга',
                    },
                  ].map((option) => (
                    <div
                      key={option.value}
                      onClick={() => setType(option.value)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        type === option.value
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{option.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Описание */}
            {selectedUserId && (
              <div className="space-y-2">
                <label
                  htmlFor="customDescription"
                  className="flex items-center text-sm font-semibold text-gray-700"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2 text-indigo-500" />
                  Описание выплаты
                </label>
                <TextArea
                  id="customDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите цель или причину выплаты..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
                />
              </div>
            )}

            {/* Выплата от */}
            {selectedUserId && (
              <div className="space-y-2">
                <label
                  htmlFor="paymentDate"
                  className="flex items-center text-sm font-semibold text-gray-700"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Выплата от
                </label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => {
                    setPaymentDate(e.target.value);
                    setErrors((prev) => {
                      const { paymentDate, ...rest } = prev;
                      return rest;
                    });
                  }}
                  min={minPaymentDate || undefined}
                  error={errors.paymentDate}
                  className="pl-4 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all w-full"
                  required
                />
                {minPaymentDate && (
                  <p className="text-xs text-amber-600 -mt-3">
                    Минимальная дата: {minPaymentDate.split('-').reverse().join('.')}
                  </p>
                )}
              </div>
            )}

            {/* Ошибки валидации */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <p className="font-medium mb-1">Заполните обязательные поля:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {Object.values(errors).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-all"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Создать выплату
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
