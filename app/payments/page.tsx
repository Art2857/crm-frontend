'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/ui/Button';
import { CurrencyDollarIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '../../store';

// Импорт новых компонентов
import PaymentStatistics from '../../components/payments/PaymentStatistics';
import PaymentTabs from '../../components/payments/PaymentTabs';
import MyDebtsTab from '../../components/payments/MyDebtsTab';
import PaymentHistoryTab from '../../components/payments/PaymentHistoryTab';
import CalculationModal from '../../components/payments/CalculationModal';
import PaymentModal from '../../components/payments/PaymentModal';
import CustomPaymentModal from '../../components/payments/CustomPaymentModal';
import UserCard from '../../components/payments/UserCard';
import WorkCard from '../../components/payments/WorkCard';
import WorkPeriodSelector from '../../components/payments/WorkPeriodSelector';
import DutyCard from '../../components/payments/DutyCard';
import UserPeriodSelector from '../../components/payments/UserPeriodSelector';

// Импорт типов и данных
import {
  DetailedCalculation,
  PaymentFormData,
  PaymentModalData,
  CustomPaymentFormData,
} from '../../types/payments';
import {
  makePayment,
  createPaymentAndClose,
  closePeriod,
} from '../../services/payment';
import { analyticsService } from '../../services/analytics';
import { bulkCreateAndClose } from '../../services/payment';
import { PaymentType } from '../../types/payment';
import { useNotification } from '../../contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { buildUserDetailedCalculation } from '../../utils/paymentCalculations';
import { usePaymentsData } from '../../hooks/payments/usePaymentsData';
import { usePeriodDates } from '../../hooks/payments/usePeriodDates';

export default function PaymentsPage() {
  // Получаем данные текущего пользователя из Redux store
  const { user } = useAppSelector((state) => state.auth);
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState<
    'management' | 'debts' | 'history'
  >('management');
  const {
    workPeriodDates,
    setWorkPeriodDates,
    userPeriodDates,
    setUserPeriodDates,
    getWorkPeriodDate,
    getUserPeriodDate,
  } = usePeriodDates();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Модальные окна
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customPaymentModalOpen, setCustomPaymentModalOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] =
    useState<DetailedCalculation | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentFormData | null>(null);
  const [isUserCalculation, setIsUserCalculation] = useState(false);
  const [calculationType, setCalculationType] = useState<'work' | 'user'>(
    'work'
  );
  const [isDutyCalculation, setIsDutyCalculation] = useState(false);
  const [
    calculationModalShowPaymentHistory,
    setCalculationModalShowPaymentHistory,
  ] = useState(true);

  // Данные работ с вложенными пользователями (новый формат отображения)
  const {
    usersData,
    setUsersData,
    myDebts,
    setMyDebts,
    responsibleUsersSummary,
    fetchWorksData: fetchWorksDataRaw,
    updateWorksData: updateWorksDataRaw,
    fetchMyDebtsData: fetchMyDebtsDataRaw,
  } = usePaymentsData();

  // summary берём из хука

  // mapAnalysisToUsers вынесен в utils/paymentsMapping.ts

  const fetchWorksData = useCallback(
    async (
      data: {
        endDate?: string;
        targetWorkId?: string;
        targetUserId?: string;
      } = {}
    ) => {
      setLoading(true);
      try {
        await fetchWorksDataRaw(data);
      } finally {
        setLoading(false);
      }
    },
    [fetchWorksDataRaw]
  );

  const updateWorksData = useCallback(
    async (
      data: {
        endDate?: string;
        targetWorkId?: string;
        targetUserId?: string;
      } = {}
    ) => {
      setLoading(true);
      try {
        await updateWorksDataRaw(data);
      } finally {
        setLoading(false);
      }
    },
    [updateWorksDataRaw]
  );

  // Обработчик показа детального расчета
  const handleShowCalculation = useCallback(
    async (userId: string, workId: string, dutyId?: string) => {
      try {
        setLoading(true);
        const endDate = getWorkPeriodDate(workId);
        const calc = await analyticsService.getPaymentsCalculation({
          role: user.role,
          userId,
          workId,
          endDate,
        });

        // Если запрошен расчёт по конкретной обязанности — фильтруем периоды локально
        const filtered = dutyId
          ? {
              ...calc,
              periods: calc.periods.map((p) => {
                const duties = p.duties.filter((d) => d.dutyId === dutyId);
                const totalAmount = duties.reduce(
                  (s, d) => s + d.calculatedAmount,
                  0
                );
                return { ...p, duties, totalAmount };
              }),
              totalAccrued: calc.periods
                .map((p) => p.duties.filter((d) => d.dutyId === dutyId))
                .flat()
                .reduce((s, d) => s + d.calculatedAmount, 0),
            }
          : calc;

        setSelectedCalculation(filtered);
        setIsUserCalculation(false);
        setCalculationType('work');
        setIsDutyCalculation(!!dutyId);
        setCalculationModalOpen(true);
        setCalculationModalShowPaymentHistory(!dutyId);
      } catch (error) {
        console.error('Ошибка при загрузке расчета:', error);
      } finally {
        setLoading(false);
      }
    },
    [getWorkPeriodDate]
  );

  // Инициализация данных один раз на монтировании
  // Инициализация данных — запускаем один раз
  useEffect(() => {
    fetchWorksData().catch((err) => {
      logger.error('Ошибка инициализации выплат', err);
      notification.showError('Не удалось загрузить данные по выплатам');
    });
    fetchMyDebtsDataRaw().catch((err) => {
      logger.error('Ошибка загрузки моих задолженностей', err);
      notification.showError('Не удалось загрузить данные о задолженностях');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Слушатель события закрытия периода (подписка/отписка один раз)
  // Слушатель закрытия периода — регистрируем один раз
  useEffect(() => {
    const onClosePeriod = async (e: any) => {
      try {
        const { userId, workId, calculationDate } = e.detail || {};
        if (!userId || !workId || !calculationDate) return;
        await closePeriod(user.role, {
          workId,
          userId,
          closureDate: calculationDate,
        });
        await updateWorksData({
          endDate: calculationDate,
          targetWorkId: workId,
          targetUserId: userId,
        });
        if (calculationModalOpen) {
          await handleShowCalculation(userId, workId);
        }
      } catch (err) {
        logger.error('Не удалось закрыть период', err);
        notification.showError('Не удалось закрыть период');
      }
    };
    window.addEventListener('close-period', onClosePeriod as any);
    return () =>
      window.removeEventListener('close-period', onClosePeriod as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загрузка данных о задолженностях текущего пользователя теперь в хуке usePaymentsData

  // getWorkPeriodDate/getUserPeriodDate предоставлены хуком usePeriodDates

  // Функция для показа общего расчета пользователя по всем работам
  const handleShowUserCalculation = async (userId: string) => {
    try {
      setLoading(true);
      const endDate = getWorkPeriodDate(
        usersData.find((u) => u.userId === userId)?.works[0]?.workId || ''
      );
      const detailedCalc = await analyticsService.getPaymentsCalculationUser({
        role: user.role,
        userId,
        endDate,
      });
      setSelectedCalculation(detailedCalc);
      setIsUserCalculation(true);
      setCalculationType('user');
      setCalculationModalOpen(true);
    } catch (error) {
      logger.error('Ошибка при загрузке расчета пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  // Мульти-выплата/закрытие по всем работам из общего расчёта
  const handleBulkPayAllWorks = useCallback(async () => {
    if (!selectedCalculation || !isUserCalculation) return;
    try {
      setLoading(true);
      const userId = selectedCalculation.userId;
      const userData = usersData.find((u) => u.userId === userId);
      if (!userData) return;
      const endDate = getUserPeriodDate(userId);
      const items = userData.works.map((w) => ({
        workId: w.workId,
        userId,
        amount: Math.max(w.totalDebt || 0, 0),
        paymentDate: endDate,
        description: `Мультивыплата по общему расчету (${w.workName})`,
      }));
      await bulkCreateAndClose(user.role, items);
      await refreshAfterUserPayment(userId);
      setCalculationModalOpen(false);
      setSelectedCalculation(null);
      notification.showSuccess('Мультивыплата выполнена');
    } catch (e) {
      logger.error('Мультивыплата не выполнена', e);
      notification.showError('Не удалось выполнить мультивыплату');
    } finally {
      setLoading(false);
    }
  }, [
    selectedCalculation,
    isUserCalculation,
    usersData,
    getUserPeriodDate,
    notification,
  ]);

  // Обработчик создания выплаты
  const handleCreatePayment = (
    userId: string,
    workId: string,
    amount: number,
    userName: string,
    workName: string,
    dutyId?: string
  ) => {
    // Устанавливаем данные для PaymentModal
    setSelectedPayment({
      userId,
      workId,
      amount,
      userName,
      workName,
      dutyId,
    });
    setPaymentModalOpen(true);
  };

  // состояние для предзаполнения произвольной выплаты
  const [customPaymentPrefill, setCustomPaymentPrefill] = useState<{
    workId: string;
    userId: string;
    amount: number;
  } | null>(null);

  // Обработчики раскрытия/скрытия
  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleWorkExpanded = (workId: string) => {
    const newExpanded = new Set(expandedWorks);
    if (newExpanded.has(workId)) {
      newExpanded.delete(workId);
    } else {
      newExpanded.add(workId);
    }
    setExpandedWorks(newExpanded);
  };

  // Обработчики для дат и произвольных выплат
  const handleCreateCustomPayment = () => {
    setCustomPaymentModalOpen(true);
  };

  const { showError } = useNotification();

  const handleWorkPeriodDateChange = async (
    workId: string,
    date: string,
    userId?: string
  ) => {
    // Сохраняем предыдущую дату для возможного отката
    const previousDate = getWorkPeriodDate(workId);

    // Обновляем UI сразу (optimistic)
    setWorkPeriodDates((prev) => ({
      ...prev,
      [workId]: date,
    }));

    // Пытаемся получить свежие данные
    try {
      await updateWorksData({
        endDate: date,
        targetWorkId: workId,
        targetUserId: userId,
      });
    } catch (err: any) {
      // Откатываем дату назад
      setWorkPeriodDates((prev) => ({
        ...prev,
        [workId]: previousDate,
      }));

      const message = err?.message || 'Ошибка при получении данных';
      showError(message);
    }
  };

  const handleUserPeriodDateChange = async (userId: string, date: string) => {
    // Сохраняем предыдущую дату для возможного отката
    const previousDate = getUserPeriodDate(userId);
    if (previousDate === date) return;

    // Обновляем UI сразу (optimistic)
    setUserPeriodDates((prev) => ({
      ...prev,
      [userId]: date,
    }));

    const user = usersData.find((userData) => userData.userId === userId);
    user.works.forEach((work) => {
      setWorkPeriodDates((prev) => ({
        ...prev,
        [work.workId]: date,
      }));
    });

    // Пытаемся получить свежие данные
    try {
      await updateWorksData({ endDate: date, targetUserId: userId });
    } catch (err: any) {
      // Откатываем дату назад
      setUserPeriodDates((prev) => ({
        ...prev,
        [userId]: previousDate,
      }));

      const message = err?.message || 'Ошибка при получении данных';
      showError(message);
    }
  };

  /**
   * Обновляет данные после успешной выплаты: перезапрашивает данные по работе
   * и, если открыт модал расчёта, обновляет его содержимое.
   */
  const refreshAfterPayment = async (
    workId: string,
    userId: string,
    dutyId?: string
  ) => {
    try {
      // Обновляем данные для всех работ пользователя, чтобы не потерять другие работы
      const userData = usersData.find((u) => u.userId === userId);
      if (!userData || !userData.works) return;

      // Получаем самую раннюю дату из всех работ пользователя
      const dates = userData.works.map((work) =>
        getWorkPeriodDate(work.workId)
      );
      const earliestDate = dates.reduce(
        (earliest, current) => (current < earliest ? current : earliest),
        dates[0]
      );

      // Обновляем все данные, так как API не поддерживает фильтрацию по пользователю
      await fetchWorksData({ endDate: earliestDate });

      // Если модальное окно детального расчёта открыто – обновим данные в нём
      if (calculationModalOpen) {
        if (calculationType === 'work') {
          await handleShowCalculation(userId, workId, dutyId);
        } else {
          await handleShowUserCalculation(userId);
        }
      }
    } catch (err) {
      console.error('Не удалось обновить данные после выплаты', err);
    }

    // Обновляем данные о задолженностях текущего пользователя
    await fetchMyDebtsDataRaw();
  };

  // Функция для обновления данных после выплаты через общий расчет пользователя
  const refreshAfterUserPayment = async (userId: string) => {
    try {
      // Обновляем данные для всех работ пользователя
      const userData = usersData.find((u) => u.userId === userId);
      if (!userData || !userData.works) return;

      // Получаем самую раннюю дату из всех работ пользователя
      const dates = userData.works.map((work) =>
        getWorkPeriodDate(work.workId)
      );
      const earliestDate = dates.reduce(
        (earliest, current) => (current < earliest ? current : earliest),
        dates[0]
      );

      // Обновляем все данные, так как API не поддерживает фильтрацию по пользователю
      await updateWorksData({ endDate: earliestDate, targetUserId: userId });

      // Если модальное окно детального расчёта открыто – обновим данные в нём
      if (calculationModalOpen && selectedCalculation) {
        if (calculationType === 'user') {
          await handleShowUserCalculation(userId);
        } else {
          // Если это был расчет конкретной работы, но мы обновляем пользователя,
          // то нужно найти эту работу и обновить расчет
          const userData = usersData.find((u) => u.userId === userId);
          if (userData && selectedCalculation.workId) {
            await handleShowCalculation(userId, selectedCalculation.workId);
          }
        }
      }
    } catch (err) {
      console.error(
        'Не удалось обновить данные после выплаты пользователя',
        err
      );
    }

    // Обновляем данные о задолженностях текущего пользователя
    await fetchMyDebtsDataRaw();
  };

  // Обработчики модальных окон
  const handlePaymentSubmit = async (data: PaymentModalData) => {
    try {
      // Используем новый эндпоинт create-payment-and-close
      const result = await createPaymentAndClose(user.role, {
        workId: selectedPayment?.workId || '',
        userId: selectedPayment?.userId || '',
        amount: Math.round(data.amount), // Конвертируем в копейки
        paymentDate: data.date, // Текущая дата
        description: data.description,
      });

      if (selectedPayment?.workId && selectedPayment?.userId) {
        await refreshAfterPayment(
          selectedPayment.workId,
          selectedPayment.userId,
          selectedPayment?.dutyId
        );
      }

      // Оптимистично добавляем новую выплату в открытый расчёт
      if (calculationModalOpen && selectedCalculation && result) {
        const newHistItem = {
          id: result.payment.id,
          amount: result.payment.amount,
          type: result.payment.paymentType,
          description: result.payment.description || '',
          date: result.payment.paymentDate,
          createdAt: result.payment.createdAt,
        };

        setSelectedCalculation((prev) => {
          if (!prev) return prev;
          const paymentHistory = [newHistItem, ...prev.paymentHistory];
          const totalPaid = prev.totalPaid + result.payment.amount;
          return {
            ...prev,
            paymentHistory,
            totalPaid,
            remainingDebt: Math.max(
              prev.remainingDebt - result.payment.amount,
              0
            ),
          };
        });
      }
    } catch (e) {
      logger.error('Ошибка создания выплаты', e);
    } finally {
      setPaymentModalOpen(false);
      setSelectedPayment(null);
      // Закрываем модальное окно "Детальный расчет выплаты" после успешного создания выплаты
      setCalculationModalOpen(false);
      setSelectedCalculation(null);
    }
  };

  const handleCustomPaymentSubmit = async (data: CustomPaymentFormData) => {
    try {
      const created = await makePayment(user.role, {
        workId: data.workId,
        userId: data.userId,
        amount: Math.round(data.amount),
        paymentType: data.type as PaymentType,
        description: data.description,
        paymentDate: data.paymentDate, // Добавлено поле даты выплаты
      });

      // Определяем, нужно ли обновлять данные для всех работ пользователя
      // Если это выплата через общий расчет пользователя
      const isUserCalculation = calculationType === 'user';

      if (isUserCalculation) {
        // Обновляем данные для всех работ пользователя
        await refreshAfterUserPayment(data.userId);
      } else {
        // Обновляем данные только для конкретной работы
        await refreshAfterPayment(data.workId, data.userId);
      }

      if (calculationModalOpen && selectedCalculation && created) {
        if (selectedCalculation.workId === data.workId) {
          const c: any = created as any;
          const newHistItem = {
            id: c.id,
            amount: c.amount,
            type: c.paymentType,
            description: c.description || '',
            date: c.paymentDate,
            createdAt: c.createdAt,
          };

          setSelectedCalculation((prev) => {
            if (!prev) return prev;
            const paymentHistory = [newHistItem, ...prev.paymentHistory];
            const totalPaid = prev.totalPaid + c.amount;
            const remainingDebt = Math.max(prev.remainingDebt - c.amount, 0);
            return {
              ...prev,
              paymentHistory,
              totalPaid,
              remainingDebt,
            };
          });
        }
      }
    } catch (e) {
      logger.error('Ошибка создания произвольной выплаты', e);
    } finally {
      setCustomPaymentModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex items-center space-x-3 mb-4 lg:mb-0">
            <div className="bg-blue-600 p-3 rounded-xl">
              <CurrencyDollarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Система выплат
              </h1>
              <p className="text-gray-600">
                Управление выплатами и задолженностями
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Кнопка создания произвольной выплаты */}
            <Button
              onClick={handleCreateCustomPayment}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-3 px-6 py-4 text-lg font-medium shadow-sm border"
            >
              <BanknotesIcon className="h-6 w-6" />
              <span>Создать выплату</span>
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <PaymentStatistics
          responsibleUsers={responsibleUsersSummary}
          myDebts={myDebts}
        />

        {/* Навигация по вкладкам */}
        <PaymentTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          responsibleUsers={responsibleUsersSummary}
          myDebts={myDebts}
        />

        {/* Содержимое вкладок */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            {usersData.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                isExpanded={expandedUsers.has(user.userId)}
                onToggleExpanded={toggleUserExpanded}
                onShowCalculation={(userId) => {
                  handleShowUserCalculation(userId);
                }}
              >
                <div className="space-y-4">
                  {/* Дата расчетного периода для пользователя */}
                  <UserPeriodSelector
                    userId={user.userId}
                    selectedDate={getUserPeriodDate(user.userId)}
                    onDateSet={handleUserPeriodDateChange}
                  />

                  {user.works?.map((work) => (
                    <WorkCard
                      key={work.workId}
                      work={work}
                      isExpanded={expandedWorks.has(work.workId)}
                      onToggleExpanded={toggleWorkExpanded}
                      onShowCalculation={(workId) => {
                        handleShowCalculation(user.userId, workId);
                      }}
                    >
                      <div className="space-y-4">
                        {/* Дата расчетного периода */}
                        {/* Убрали выбор даты на уровне работы — дата задаётся только в пользователе */}

                        {/* Обязанности пользователя */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Обязанности:
                          </h5>
                          <div className="space-y-2">
                            {work.users
                              ?.find((u) => u.userId === user.userId)
                              ?.duties.map((duty, index) => (
                                <DutyCard
                                  key={duty.dutyId}
                                  duty={duty}
                                  index={index}
                                  onShowCalculation={(dutyId) => {
                                    handleShowCalculation(
                                      user.userId,
                                      work.workId,
                                      dutyId
                                    );
                                  }}
                                />
                              ))}
                          </div>
                        </div>
                      </div>
                    </WorkCard>
                  ))}
                </div>
              </UserCard>
            ))}
          </div>
        )}

        {activeTab === 'debts' && (
          <MyDebtsTab
            myDebts={myDebts}
            onShowCalculation={handleShowCalculation}
          />
        )}

        {activeTab === 'history' && (
          <PaymentHistoryTab currentUserId={user?.id} />
        )}

        {/* Модальные окна */}
        <CalculationModal
          isOpen={calculationModalOpen}
          onClose={() => {
            setCalculationModalOpen(false);
            setSelectedCalculation(null);
            setIsDutyCalculation(false);
          }}
          calculation={selectedCalculation}
          onCreatePayment={handleCreatePayment}
          isDebtsView={
            myDebts.some(
              (debt) => debt.workId === selectedCalculation?.workId
            ) && !isDutyCalculation
          }
          calculationDate={
            selectedCalculation
              ? getWorkPeriodDate(selectedCalculation.workId)
              : undefined
          }
          isUserCalculation={isUserCalculation}
          showPaymentHistory={calculationModalShowPaymentHistory}
          onBulkPayAllWorks={handleBulkPayAllWorks}
        />

        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          paymentDate={
            selectedCalculation
              ? getWorkPeriodDate(selectedCalculation.workId)
              : null
          }
          onSubmit={handlePaymentSubmit}
        />

        <CustomPaymentModal
          isOpen={customPaymentModalOpen}
          onClose={() => {
            setCustomPaymentModalOpen(false);
            setCustomPaymentPrefill(null);
          }}
          onSubmit={handleCustomPaymentSubmit}
          defaultWorkId={customPaymentPrefill?.workId}
          defaultUserId={customPaymentPrefill?.userId}
          defaultAmount={customPaymentPrefill?.amount}
        />
      </div>
    </div>
  );
}
