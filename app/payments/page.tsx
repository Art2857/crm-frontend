'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../../store';

import PaymentTabs from '../../components/payments/PaymentTabs';
import MyDebtsTab from '../../components/payments/MyDebtsTab';
import PaymentHistoryTab from '../../components/payments/PaymentHistoryTab';
import CalculationModal from '../../components/payments/CalculationModal';
import PaymentModal from '../../components/payments/PaymentModal';
import CustomPaymentModal from '../../components/payments/CustomPaymentModal';
import PaymentsManagementToolbar from '../../components/payments/PaymentsManagementToolbar';
import PaymentsDateCalculationPanel from '../../components/payments/PaymentsDateCalculationPanel';
import UserCard from '../../components/payments/UserCard';
import WorkCard from '../../components/payments/WorkCard';
import DutyCard from '../../components/payments/DutyCard';

// Импорт типов и данных
import {
  DetailedCalculation,
  PaymentFormData,
  PaymentModalData,
  CustomPaymentFormData,
} from '../../types/payments';
import { closePeriod } from '../../services/payment';
import { analyticsService } from '../../services/analytics';
import {
  useCreatePaymentMutation,
  useCreatePaymentAndCloseMutation,
  useBulkCreateAndCloseMutation,
} from '../../store/services/api';
import { PaymentType } from '../../types/payment';
import { useNotification } from '../../contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { formatDateToISO, getCurrentDateISO, shiftDateISOByDays } from '../../utils/date';
import { usePaymentsData } from '../../hooks/payments/usePaymentsData';
import { DisplayCurrency } from '../../hooks/useCurrencyConversion';

export default function PaymentsPage() {
  // Получаем данные текущего пользователя из Redux store
  const { user } = useAppSelector((state) => state.auth);
  const { showError, showSuccess } = useNotification();

  // Валюта отображения итогов
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('RUB');
  const [managementPeriodDate, setManagementPeriodDate] = useState(getCurrentDateISO());
  /** Верхняя граница расчёта на вкладке «Предстоящая выручка» (независимо от управления выплатами) */
  const [debtsPeriodDate, setDebtsPeriodDate] = useState(getCurrentDateISO());
  /** Дата, с которой открыт текущий детальный расчёт (модалки выплат и закрытия периода) */
  const [calculationEndDateContext, setCalculationEndDateContext] = useState(getCurrentDateISO());

  const [activeTab, setActiveTab] = useState<'management' | 'debts' | 'history'>('management');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());
  const [managementLoading, setManagementLoading] = useState(false);
  const [, setCalculationLoading] = useState(false);

  const [makePayment] = useCreatePaymentMutation();
  const [createPaymentAndClose] = useCreatePaymentAndCloseMutation();
  const [bulkCreateAndClose] = useBulkCreateAndCloseMutation();

  // Модальные окна

  const [defaultCalculationCurrency, setDefaultCalculationCurrency] =
    useState<DisplayCurrency>('RUB');
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customPaymentModalOpen, setCustomPaymentModalOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<DetailedCalculation | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentFormData | null>(null);
  const [isUserCalculation, setIsUserCalculation] = useState(false);
  const [calculationType, setCalculationType] = useState<'work' | 'user'>('work');
  const [isDutyCalculation, setIsDutyCalculation] = useState(false);
  const [selectedDutyId, setSelectedDutyId] = useState<string | undefined>();
  const [calculationModalShowPaymentHistory, setCalculationModalShowPaymentHistory] =
    useState(true);

  const getClosingPaymentDate = useCallback(
    (calculationDate: string) => shiftDateISOByDays(calculationDate, -1),
    [],
  );

  // Данные работ с вложенными пользователями (новый формат отображения)
  const {
    usersData,
    myDebts,
    fetchWorksData: fetchWorksDataRaw,
    updateWorksData: updateWorksDataRaw,
    fetchMyDebtsData: fetchMyDebtsDataRaw,
    debtsLoading,
  } = usePaymentsData();

  // summary берём из хука

  const globalMinCalculationDate = useMemo(() => {
    const closureDates = usersData
      .flatMap((userData) => userData.works ?? [])
      .map((work) => work.lastClosureDate)
      .filter((date): date is string => Boolean(date))
      .map((date) => formatDateToISO(date))
      .sort();

    return closureDates.at(-1);
  }, [usersData]);

  const debtsToolbarMinDate = useMemo(() => {
    const dates = myDebts
      .map((d) => formatDateToISO(d.lastClosureDate))
      .filter((d): d is string => Boolean(d))
      .sort();
    return dates.at(-1);
  }, [myDebts]);

  const fetchWorksData = useCallback(
    async (
      data: {
        endDate?: string;
        targetWorkId?: string;
        targetUserId?: string;
      } = {},
    ) => {
      setManagementLoading(true);
      try {
        await fetchWorksDataRaw(data);
      } finally {
        setManagementLoading(false);
      }
    },
    [fetchWorksDataRaw],
  );

  const updateWorksData = useCallback(
    async (
      data: {
        endDate?: string;
        targetWorkId?: string;
        targetUserId?: string;
      } = {},
    ) => {
      setManagementLoading(true);
      try {
        await updateWorksDataRaw(data);
      } finally {
        setManagementLoading(false);
      }
    },
    [updateWorksDataRaw],
  );

  // Обработчик показа детального расчета
  const handleShowCalculation = useCallback(
    async (userId: string, workId: string, dutyId?: string, endDateOverride?: string) => {
      if (!user?.role) {
        logger.error('Пользователь не авторизован');
        return;
      }

      const resolvedEnd = endDateOverride ?? managementPeriodDate;

      try {
        setCalculationLoading(true);
        setCalculationEndDateContext(resolvedEnd);
        const calc = await analyticsService.getPaymentsCalculation({
          userId,
          workId,
          endDate: resolvedEnd,
          dutyId,
        });

        setSelectedCalculation(calc);
        setIsUserCalculation(false);
        setCalculationType('work');
        setIsDutyCalculation(!!dutyId);
        setSelectedDutyId(dutyId);
        setCalculationModalOpen(true);
        setCalculationModalShowPaymentHistory(!dutyId);
      } catch (error) {
        logger.error('Ошибка при загрузке расчета', error);
        showError(error instanceof Error ? error.message : 'Не удалось загрузить детализацию');
      } finally {
        setCalculationLoading(false);
      }
    },
    [managementPeriodDate, showError, user?.role],
  );

  // Инициализация данных один раз на монтировании
  // Инициализация данных — запускаем один раз
  useEffect(() => {
    // Предотвращаем API вызовы если пользователь не аутентифицирован
    // (например, во время logout или при переходе на страницу входа)
    if (!user?.id || !user.role) {
      return;
    }

    fetchWorksData().catch((err) => {
      logger.error('Ошибка инициализации выплат', err);
      showError('Не удалось загрузить данные по выплатам');
    });
    fetchMyDebtsDataRaw(getCurrentDateISO()).catch((err) => {
      logger.error('Ошибка загрузки моих задолженностей', err);
      showError('Не удалось загрузить данные о задолженностях');
    });
  }, [fetchMyDebtsDataRaw, fetchWorksData, showError, user?.id, user?.role]);

  // Слушатель события закрытия периода (подписка/отписка один раз)
  // Слушатель закрытия периода — регистрируем один раз
  useEffect(() => {
    const onClosePeriod = async (e: any) => {
      try {
        const { userId, workId, calculationDate } = e.detail || {};
        if (!userId || !workId || !calculationDate) return;
        await closePeriod({
          workId,
          userId,
          closureDate: calculationDate,
        });
        setCalculationModalOpen(false);
        setSelectedCalculation(null);
        showSuccess('Период успешно закрыт');
        await updateWorksData({
          endDate: calculationDate,
          targetWorkId: workId,
          targetUserId: userId,
        });
        await fetchMyDebtsDataRaw(debtsPeriodDate);
      } catch (err) {
        logger.error('Не удалось закрыть период', err);
        showError('Не удалось закрыть период');
      }
    };
    window.addEventListener('close-period', onClosePeriod as any);
    return () => window.removeEventListener('close-period', onClosePeriod as any);
  }, [debtsPeriodDate, fetchMyDebtsDataRaw, showError, showSuccess, updateWorksData]);

  // Загрузка данных о задолженностях текущего пользователя теперь в хуке usePaymentsData

  // Функция для показа общего расчета пользователя по всем работам
  const handleShowUserCalculation = useCallback(
    async (userId: string) => {
      if (!user?.role) {
        logger.error('Пользователь не авторизован');
        return;
      }

      try {
        setCalculationLoading(true);
        setCalculationEndDateContext(managementPeriodDate);
        const detailedCalc = await analyticsService.getPaymentsCalculationUser({
          userId,
          endDate: managementPeriodDate,
        });
        setSelectedCalculation(detailedCalc);
        setIsUserCalculation(true);
        setCalculationType('user');
        setIsDutyCalculation(false);
        setSelectedDutyId(undefined);
        setCalculationModalOpen(true);
        setCalculationModalShowPaymentHistory(true);
      } catch (error) {
        logger.error('Ошибка при загрузке расчета пользователя:', error);
        showError(
          error instanceof Error ? error.message : 'Не удалось загрузить детализацию пользователя',
        );
      } finally {
        setCalculationLoading(false);
      }
    },
    [managementPeriodDate, showError, user?.role],
  );

  // Обработчик создания выплаты
  const handleCreatePayment = (
    userId: string,
    workId: string,
    amount: number,
    userName: string,
    workName: string,
    calculationDate?: string,
  ) => {
    const userAvatarUrl = usersData.find((entry) => entry.userId === userId)?.avatarUrl ?? null;

    // Устанавливаем данные для PaymentModal
    setSelectedPayment({
      userId,
      workId,
      amount,
      userName,
      workName,
      avatarUrl: userAvatarUrl,
      calculationDate,
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

  const handleManagementPeriodDateChange = async (date: string) => {
    const previousDate = managementPeriodDate;
    if (previousDate === date) return;

    setManagementPeriodDate(date);

    try {
      await updateWorksData({ endDate: date });
    } catch (err: any) {
      setManagementPeriodDate(previousDate);
      const message = err?.message || 'Ошибка при получении данных';
      showError(message);
    }
  };

  const handleDebtsPeriodDateChange = async (date: string) => {
    const previousDate = debtsPeriodDate;
    if (previousDate === date) return;

    setDebtsPeriodDate(date);

    try {
      await fetchMyDebtsDataRaw(date);
    } catch {
      setDebtsPeriodDate(previousDate);
      showError('Не удалось пересчитать предстоящую выручку');
    }
  };

  /**
   * Обновляет данные после успешной выплаты: перезапрашивает данные по работе
   * и, если открыт модал расчёта, обновляет его содержимое.
   */
  const refreshAfterPayment = async (workId: string, userId: string, dutyId?: string) => {
    try {
      await fetchWorksData({ endDate: managementPeriodDate });

      // Если модальное окно детального расчёта открыто – обновим данные в нём
      if (calculationModalOpen) {
        if (calculationType === 'work') {
          await handleShowCalculation(userId, workId, dutyId, calculationEndDateContext);
        } else {
          await handleShowUserCalculation(userId);
        }
      }
    } catch (err) {
      console.error('Не удалось обновить данные после выплаты', err);
    }

    // Обновляем данные о задолженностях текущего пользователя
    await fetchMyDebtsDataRaw(debtsPeriodDate);
  };

  // Функция для обновления данных после выплаты через общий расчет пользователя
  const refreshAfterUserPayment = useCallback(
    async (userId: string) => {
      try {
        await updateWorksData({ endDate: managementPeriodDate, targetUserId: userId });

        // Если модальное окно детального расчёта открыто – обновим данные в нём
        if (calculationModalOpen && selectedCalculation) {
          if (calculationType === 'user') {
            await handleShowUserCalculation(userId);
          } else {
            // Если это был расчет конкретной работы, но мы обновляем пользователя,
            // то нужно найти эту работу и обновить расчет
            const currentUserData = usersData.find((u) => u.userId === userId);
            if (currentUserData && selectedCalculation.workId) {
              await handleShowCalculation(
                userId,
                selectedCalculation.workId,
                selectedDutyId,
                calculationEndDateContext,
              );
            }
          }
        }
      } catch (err) {
        console.error('Не удалось обновить данные после выплаты пользователя', err);
      }

      // Обновляем данные о задолженностях текущего пользователя
      await fetchMyDebtsDataRaw(debtsPeriodDate);
    },
    [
      calculationEndDateContext,
      calculationModalOpen,
      calculationType,
      debtsPeriodDate,
      fetchMyDebtsDataRaw,
      handleShowCalculation,
      handleShowUserCalculation,
      managementPeriodDate,
      selectedCalculation,
      selectedDutyId,
      updateWorksData,
      usersData,
    ],
  );

  // Мульти-выплата/закрытие по всем работам из общего расчёта
  const handleBulkPayAllWorks = useCallback(async () => {
    if (!selectedCalculation || !isUserCalculation) return;
    try {
      setCalculationLoading(true);
      const userId = selectedCalculation.userId;
      const userData = usersData.find((u) => u.userId === userId);
      if (!userData) return;
      const items = userData.works.map((w) => ({
        workId: w.workId,
        userId,
        amount: Math.max(w.totalDebt || 0, 0),
        calculationDate: managementPeriodDate,
        description: `Мультивыплата по общему расчету (${w.workName})`,
      }));
      await bulkCreateAndClose({ items }).unwrap();
      await refreshAfterUserPayment(userId);
      setCalculationModalOpen(false);
      setSelectedCalculation(null);
      showSuccess('Мультивыплата выполнена');
    } catch (e) {
      logger.error('Мультивыплата не выполнена', e);
      showError('Не удалось выполнить мультивыплату');
    } finally {
      setCalculationLoading(false);
    }
  }, [
    bulkCreateAndClose,
    isUserCalculation,
    managementPeriodDate,
    refreshAfterUserPayment,
    selectedCalculation,
    showError,
    showSuccess,
    usersData,
  ]);

  // Обработчики модальных окон
  const handlePaymentSubmit = async (data: PaymentModalData) => {
    try {
      // Используем новый эндпоинт create-payment-and-close
      await createPaymentAndClose({
        workId: selectedPayment?.workId || '',
        userId: selectedPayment?.userId || '',
        amount: Math.round(data.amount), // Конвертируем в копейки
        calculationDate: selectedPayment?.calculationDate ?? calculationEndDateContext,
        description: data.description,
      }).unwrap();

      if (selectedPayment?.workId && selectedPayment?.userId) {
        await refreshAfterPayment(
          selectedPayment.workId,
          selectedPayment.userId,
          selectedPayment?.dutyId,
        );
      }

      setPaymentModalOpen(false);
      setSelectedPayment(null);
      showSuccess('Выплата создана, период закрыт');
    } catch (e: any) {
      logger.error('Ошибка создания выплаты', e);
      const serverErrors = e?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const messages = serverErrors.flatMap((err: any) => err.messages ?? []);
        showError(messages.join('; ') || 'Не удалось создать выплату');
      } else {
        showError(e?.data?.message || 'Не удалось создать выплату');
      }
      setPaymentModalOpen(false);
      setSelectedPayment(null);
    }
  };

  const handleCustomPaymentSubmit = async (data: CustomPaymentFormData) => {
    try {
      await makePayment({
        workId: data.workId,
        userId: data.userId,
        amount: Math.round(data.amount),
        paymentType: data.type as PaymentType,
        description: data.description,
        paymentDate: data.paymentDate,
        currency: data.currency,
      }).unwrap();

      setDefaultCalculationCurrency(data.currency as DisplayCurrency);

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

      if (calculationModalOpen && selectedCalculation) {
        if (calculationType === 'user') {
          await handleShowUserCalculation(selectedCalculation.userId);
        } else {
          await handleShowCalculation(
            selectedCalculation.userId,
            selectedCalculation.workId,
            selectedDutyId,
          );
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
        {/* Навигация по вкладкам */}
        <PaymentTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          responsibleUsers={usersData}
          myDebts={myDebts}
        />

        {/* Содержимое вкладок */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            <PaymentsManagementToolbar
              selectedDate={managementPeriodDate}
              minDate={globalMinCalculationDate}
              isLoading={managementLoading}
              onCalculate={handleManagementPeriodDateChange}
              onCreatePayment={handleCreateCustomPayment}
            />

            {usersData.map((user) => {
              const userAccrued = user.works?.reduce((s, w) => s + (w.totalAccrued ?? 0), 0) || 0;
              return (
                <UserCard
                  currency={displayCurrency === 'USD' ? 'USD' : 'RUB'}
                  key={user.userId}
                  user={user}
                  isExpanded={expandedUsers.has(user.userId)}
                  onToggleExpanded={toggleUserExpanded}
                  onShowCalculation={(userId) => {
                    handleShowUserCalculation(userId);
                  }}
                  accruedOverride={userAccrued}
                >
                  <div className="space-y-4">
                    {user.works?.map((work) => (
                      <WorkCard
                        currency={displayCurrency === 'USD' ? 'USD' : 'RUB'}
                        key={work.workId}
                        work={work}
                        isExpanded={expandedWorks.has(work.workId)}
                        onToggleExpanded={toggleWorkExpanded}
                        onShowCalculation={(workId) => {
                          handleShowCalculation(user.userId, workId);
                        }}
                      >
                        <div className="space-y-4">
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
                                      handleShowCalculation(user.userId, work.workId, dutyId);
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
              );
            })}
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="space-y-6">
            <PaymentsDateCalculationPanel
              label="Расчёт предстоящей выручки до даты (дата не включается):"
              selectedDate={debtsPeriodDate}
              minDate={debtsToolbarMinDate}
              isLoading={debtsLoading}
              onCalculate={handleDebtsPeriodDateChange}
            />
            <MyDebtsTab
              myDebts={myDebts}
              currentUserId={user?.id}
              onShowCalculation={(userId, workId, dutyId) =>
                handleShowCalculation(userId, workId, dutyId, debtsPeriodDate)
              }
            />
          </div>
        )}

        {activeTab === 'history' && <PaymentHistoryTab key={user?.id} currentUserId={user?.id} />}

        {/* Модальные окна */}
        <CalculationModal
          isOpen={calculationModalOpen}
          onClose={() => {
            setCalculationModalOpen(false);
            setSelectedCalculation(null);
            setIsDutyCalculation(false);
            setSelectedDutyId(undefined);
          }}
          calculation={selectedCalculation}
          onCreatePayment={handleCreatePayment}
          isDebtsView={myDebts.some((debt) => debt.workId === selectedCalculation?.workId)}
          calculationDate={selectedCalculation ? calculationEndDateContext : undefined}
          isUserCalculation={isUserCalculation}
          showPaymentHistory={calculationModalShowPaymentHistory}
          onBulkPayAllWorks={handleBulkPayAllWorks}
          paymentDate={
            selectedCalculation ? getClosingPaymentDate(calculationEndDateContext) : undefined
          }
          initialCurrency={defaultCalculationCurrency}
        />

        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          paymentDate={
            selectedPayment?.calculationDate
              ? getClosingPaymentDate(selectedPayment.calculationDate)
              : selectedCalculation
                ? getClosingPaymentDate(calculationEndDateContext)
                : null
          }
          onSubmit={handlePaymentSubmit}
          periods={selectedCalculation?.periods?.map((p) => ({
            startDate: p.startDate,
            endDate: p.endDate,
            days: p.days,
          }))}
          calculationDate={
            selectedPayment?.calculationDate ??
            (selectedCalculation ? calculationEndDateContext : undefined)
          }
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
