'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../../store';

import PaymentTabs from '../../components/payments/PaymentTabs';
import MyDebtsTab from '../../components/payments/MyDebtsTab';
import PaymentHistoryTab from '../../components/payments/PaymentHistoryTab';
import ManagementCalculationModal from '../../components/payments/ManagementCalculationModal';
import DebtsCalculationModal from '../../components/payments/DebtsCalculationModal';
import PaymentModal from '../../components/payments/PaymentModal';
import CustomPaymentModal from '../../components/payments/CustomPaymentModal';
import PaymentsManagementToolbar from '../../components/payments/PaymentsManagementToolbar';
import PaymentsDateCalculationPanel from '../../components/payments/PaymentsDateCalculationPanel';
import UserCard from '../../components/payments/UserCard';
import WorkCard from '../../components/payments/WorkCard';
import DutyCard from '../../components/payments/DutyCard';

// Импорт типов и данных
import {
  CalculationModalState,
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

type PaymentsTab = 'management' | 'debts' | 'history';
type WorkCalculationSource = 'management' | 'debts';

const CLOSED_CALCULATION_MODAL_STATE: CalculationModalState = { kind: 'closed' };

export default function PaymentsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { showError, showSuccess } = useNotification();

  const displayCurrency: DisplayCurrency = 'RUB';
  const [managementPeriodDate, setManagementPeriodDate] = useState(getCurrentDateISO());
  const [debtsPeriodDate, setDebtsPeriodDate] = useState(getCurrentDateISO());
  const [activeTab, setActiveTab] = useState<PaymentsTab>('management');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());
  const [managementLoading, setManagementLoading] = useState(false);
  const [, setCalculationLoading] = useState(false);

  const [makePayment] = useCreatePaymentMutation();
  const [createPaymentAndClose] = useCreatePaymentAndCloseMutation();
  const [bulkCreateAndClose] = useBulkCreateAndCloseMutation();

  const [defaultCalculationCurrency, setDefaultCalculationCurrency] =
    useState<DisplayCurrency>('RUB');
  const [calculationModalState, setCalculationModalState] = useState<CalculationModalState>(
    CLOSED_CALCULATION_MODAL_STATE,
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customPaymentModalOpen, setCustomPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentFormData | null>(null);

  const getClosingPaymentDate = useCallback(
    (calculationDate: string) => shiftDateISOByDays(calculationDate, -1),
    [],
  );

  const closeCalculationModal = useCallback(() => {
    setCalculationModalState(CLOSED_CALCULATION_MODAL_STATE);
  }, []);

  const {
    usersData,
    myDebts,
    fetchWorksData: fetchWorksDataRaw,
    updateWorksData: updateWorksDataRaw,
    fetchMyDebtsData: fetchMyDebtsDataRaw,
    debtsLoading,
    hasResponsibleWorks,
  } = usePaymentsData();

  const managementScopePending = managementLoading && hasResponsibleWorks === undefined;
  const showManagementTab = hasResponsibleWorks === true;
  const effectiveTab = useMemo<PaymentsTab>(() => {
    if (activeTab === 'management' && hasResponsibleWorks === false) {
      return 'debts';
    }

    return activeTab;
  }, [activeTab, hasResponsibleWorks]);

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

  const managedWorkIdsByUser = useMemo(() => {
    return new Map(
      usersData.map((userData) => [userData.userId, userData.works.map((work) => work.workId)]),
    );
  }, [usersData]);

  const selectedCalculation: DetailedCalculation | null =
    calculationModalState.kind === 'closed' ? null : calculationModalState.calculation;
  const calculationDateContext =
    calculationModalState.kind === 'closed' ? undefined : calculationModalState.calculationDate;
  const calculationModalOpen = calculationModalState.kind !== 'closed';

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

  const refreshManagementData = useCallback(
    async (data: { targetWorkId?: string; targetUserId?: string } = {}) => {
      if (data.targetWorkId !== undefined || data.targetUserId !== undefined) {
        await updateWorksData({
          endDate: managementPeriodDate,
          targetWorkId: data.targetWorkId,
          targetUserId: data.targetUserId,
        });
        return;
      }

      await fetchWorksData({ endDate: managementPeriodDate });
    },
    [fetchWorksData, managementPeriodDate, updateWorksData],
  );

  const refreshDebtsData = useCallback(async () => {
    await fetchMyDebtsDataRaw(debtsPeriodDate);
  }, [debtsPeriodDate, fetchMyDebtsDataRaw]);

  const handleOpenWorkCalculation = useCallback(
    async (
      userId: string,
      workId: string,
      dutyId?: string,
      calculationDate?: string,
      source: WorkCalculationSource = 'management',
    ) => {
      if (!user?.role) {
        logger.error('Пользователь не авторизован');
        return;
      }

      const resolvedDate = calculationDate ?? managementPeriodDate;

      try {
        setCalculationLoading(true);
        const calc = await analyticsService.getPaymentsCalculation({
          userId,
          workId,
          endDate: resolvedDate,
          dutyId,
        });

        setCalculationModalState({
          kind: source === 'debts' ? 'debts-work' : 'management-work',
          calculation: calc,
          calculationDate: resolvedDate,
          dutyId,
          showPaymentHistory: !dutyId,
        });
      } catch (error) {
        logger.error('Ошибка при загрузке расчета', error);
        showError(error instanceof Error ? error.message : 'Не удалось загрузить детализацию');
      } finally {
        setCalculationLoading(false);
      }
    },
    [managementPeriodDate, showError, user?.role],
  );

  const handleOpenUserCalculation = useCallback(
    async (
      userId: string,
      scopedWorkIds?: string[],
      calculationDate: string = managementPeriodDate,
    ) => {
      if (!user?.role) {
        logger.error('Пользователь не авторизован');
        return;
      }

      try {
        setCalculationLoading(true);
        const detailedCalc = await analyticsService.getPaymentsCalculationUser({
          userId,
          endDate: calculationDate,
          worksId: scopedWorkIds,
        });

        setCalculationModalState({
          kind: 'management-user',
          calculation: detailedCalc,
          calculationDate,
          scopedWorkIds,
        });
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

  const reloadOpenCalculation = useCallback(async () => {
    if (calculationModalState.kind === 'closed') {
      return;
    }

    if (calculationModalState.kind === 'management-user') {
      await handleOpenUserCalculation(
        calculationModalState.calculation.userId,
        calculationModalState.scopedWorkIds,
        calculationModalState.calculationDate,
      );
      return;
    }

    await handleOpenWorkCalculation(
      calculationModalState.calculation.userId,
      calculationModalState.calculation.workId,
      calculationModalState.dutyId,
      calculationModalState.calculationDate,
      calculationModalState.kind === 'debts-work' ? 'debts' : 'management',
    );
  }, [calculationModalState, handleOpenUserCalculation, handleOpenWorkCalculation]);

  useEffect(() => {
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

  const handleClosePeriod = useCallback(
    async (payload: { userId: string; workId: string; calculationDate: string }) => {
      try {
        await closePeriod({
          workId: payload.workId,
          userId: payload.userId,
          closureDate: payload.calculationDate,
        });

        closeCalculationModal();
        showSuccess('Период успешно закрыт');
        await Promise.all([
          refreshManagementData({
            targetWorkId: payload.workId,
            targetUserId: payload.userId,
          }),
          refreshDebtsData(),
        ]);
      } catch (error) {
        logger.error('Не удалось закрыть период', error);
        showError('Не удалось закрыть период');
      }
    },
    [closeCalculationModal, refreshDebtsData, refreshManagementData, showError, showSuccess],
  );

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

  const refreshAfterWorkPayment = useCallback(
    async (workId: string, userId: string) => {
      try {
        await Promise.all([
          refreshManagementData({ targetWorkId: workId, targetUserId: userId }),
          refreshDebtsData(),
        ]);
        await reloadOpenCalculation();
      } catch (error) {
        logger.error('Не удалось обновить данные после выплаты', error);
      }
    },
    [refreshDebtsData, refreshManagementData, reloadOpenCalculation],
  );

  const refreshAfterUserPayment = useCallback(
    async (userId: string) => {
      try {
        await Promise.all([refreshManagementData({ targetUserId: userId }), refreshDebtsData()]);
        await reloadOpenCalculation();
      } catch (error) {
        logger.error('Не удалось обновить данные после выплаты пользователя', error);
      }
    },
    [refreshDebtsData, refreshManagementData, reloadOpenCalculation],
  );

  const handleBulkPayAllWorks = useCallback(async () => {
    if (calculationModalState.kind !== 'management-user') {
      return;
    }

    try {
      setCalculationLoading(true);

      const { calculation, scopedWorkIds, calculationDate } = calculationModalState;
      const userData = usersData.find((entry) => entry.userId === calculation.userId);

      if (!userData) {
        return;
      }

      const worksForBulkPayment =
        scopedWorkIds !== undefined
          ? userData.works.filter((work) => scopedWorkIds.includes(work.workId))
          : userData.works;

      const items = worksForBulkPayment.map((work) => ({
        workId: work.workId,
        userId: calculation.userId,
        amount: Math.max(work.totalDebt || 0, 0),
        calculationDate,
        description: `Мультивыплата по общему расчету (${work.workName})`,
      }));

      await bulkCreateAndClose({ items }).unwrap();
      await refreshAfterUserPayment(calculation.userId);
      closeCalculationModal();
      showSuccess('Мультивыплата выполнена');
    } catch (error) {
      logger.error('Мультивыплата не выполнена', error);
      showError('Не удалось выполнить мультивыплату');
    } finally {
      setCalculationLoading(false);
    }
  }, [
    bulkCreateAndClose,
    calculationModalState,
    closeCalculationModal,
    refreshAfterUserPayment,
    showError,
    showSuccess,
    usersData,
  ]);

  const handlePaymentSubmit = async (data: PaymentModalData) => {
    try {
      const resolvedCalculationDate = selectedPayment?.calculationDate ?? calculationDateContext;
      if (!resolvedCalculationDate) {
        showError('Не удалось определить дату расчёта для выплаты');
        return;
      }

      await createPaymentAndClose({
        workId: selectedPayment?.workId || '',
        userId: selectedPayment?.userId || '',
        amount: Math.round(data.amount),
        calculationDate: resolvedCalculationDate,
        description: data.description,
      }).unwrap();

      if (selectedPayment?.workId && selectedPayment?.userId) {
        await refreshAfterWorkPayment(selectedPayment.workId, selectedPayment.userId);
      }

      setPaymentModalOpen(false);
      setSelectedPayment(null);
      showSuccess('Выплата создана, период закрыт');
    } catch (error: any) {
      logger.error('Ошибка создания выплаты', error);
      const serverErrors = error?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const messages = serverErrors.flatMap((serverError: any) => serverError.messages ?? []);
        showError(messages.join('; ') || 'Не удалось создать выплату');
      } else {
        showError(error?.data?.message || 'Не удалось создать выплату');
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

      if (calculationModalState.kind === 'management-user') {
        await refreshAfterUserPayment(data.userId);
      } else {
        await refreshAfterWorkPayment(data.workId, data.userId);
      }

      showSuccess('Выплата создана');
    } catch (error) {
      logger.error('Ошибка создания произвольной выплаты', error);
      showError('Не удалось создать произвольную выплату');
    } finally {
      setCustomPaymentModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {managementScopePending ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-600">
            Загрузка данных по выплатам...
          </div>
        ) : (
          <>
            {/* Навигация по вкладкам */}
            <PaymentTabs
              activeTab={effectiveTab}
              setActiveTab={setActiveTab}
              responsibleUsers={usersData}
              myDebts={myDebts}
              showManagementTab={showManagementTab}
            />

            {/* Содержимое вкладок */}
            {effectiveTab === 'management' && (
              <div className="space-y-6">
                <PaymentsManagementToolbar
                  selectedDate={managementPeriodDate}
                  minDate={globalMinCalculationDate}
                  isLoading={managementLoading}
                  onCalculate={handleManagementPeriodDateChange}
                  onCreatePayment={handleCreateCustomPayment}
                />

                {usersData.map((user) => {
                  const userAccrued =
                    user.works?.reduce((s, w) => s + (w.totalAccrued ?? 0), 0) || 0;
                  return (
                    <UserCard
                      currency={displayCurrency}
                      key={user.userId}
                      user={user}
                      isExpanded={expandedUsers.has(user.userId)}
                      onToggleExpanded={toggleUserExpanded}
                      onShowCalculation={(userId) => {
                        handleOpenUserCalculation(userId, managedWorkIdsByUser.get(userId));
                      }}
                      accruedOverride={userAccrued}
                    >
                      <div className="space-y-4">
                        {user.works?.map((work) => (
                          <WorkCard
                            currency={displayCurrency}
                            key={work.workId}
                            work={work}
                            isExpanded={expandedWorks.has(work.workId)}
                            onToggleExpanded={toggleWorkExpanded}
                            onShowCalculation={(workId) => {
                              handleOpenWorkCalculation(user.userId, workId);
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
                                          handleOpenWorkCalculation(
                                            user.userId,
                                            work.workId,
                                            dutyId,
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
                  );
                })}
              </div>
            )}

            {effectiveTab === 'debts' && (
              <div className="space-y-6">
                <PaymentsDateCalculationPanel
                  label="Расчёт предстоящей выручки до даты (дата не включается): "
                  selectedDate={debtsPeriodDate}
                  minDate={debtsToolbarMinDate}
                  isLoading={debtsLoading}
                  onCalculate={handleDebtsPeriodDateChange}
                />
                <MyDebtsTab
                  myDebts={myDebts}
                  currentUserId={user?.id}
                  onShowCalculation={(userId, workId, dutyId) =>
                    handleOpenWorkCalculation(userId, workId, dutyId, debtsPeriodDate, 'debts')
                  }
                />
              </div>
            )}

            {effectiveTab === 'history' && (
              <PaymentHistoryTab key={user?.id} currentUserId={user?.id} />
            )}

            {(calculationModalState.kind === 'management-work' ||
              calculationModalState.kind === 'management-user') &&
              calculationDateContext && (
                <ManagementCalculationModal
                  isOpen={calculationModalOpen}
                  onClose={closeCalculationModal}
                  calculation={selectedCalculation}
                  calculationDate={calculationDateContext}
                  isUserCalculation={calculationModalState.kind === 'management-user'}
                  showPaymentHistory={
                    calculationModalState.kind === 'management-user'
                      ? true
                      : calculationModalState.showPaymentHistory
                  }
                  onCreatePayment={handleCreatePayment}
                  onClosePeriod={handleClosePeriod}
                  onBulkPayAllWorks={handleBulkPayAllWorks}
                  paymentDate={getClosingPaymentDate(calculationDateContext)}
                  initialCurrency={defaultCalculationCurrency}
                />
              )}

            {calculationModalState.kind === 'debts-work' && calculationDateContext && (
              <DebtsCalculationModal
                isOpen={calculationModalOpen}
                onClose={closeCalculationModal}
                calculation={selectedCalculation}
                calculationDate={calculationDateContext}
                initialCurrency={defaultCalculationCurrency}
              />
            )}

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
                  : calculationDateContext
                    ? getClosingPaymentDate(calculationDateContext)
                    : null
              }
              onSubmit={handlePaymentSubmit}
              periods={selectedCalculation?.periods?.map((p) => ({
                startDate: p.startDate,
                endDate: p.endDate,
                days: p.days,
              }))}
              calculationDate={selectedPayment?.calculationDate ?? calculationDateContext}
            />

            <CustomPaymentModal
              isOpen={customPaymentModalOpen}
              onClose={() => {
                setCustomPaymentModalOpen(false);
              }}
              onSubmit={handleCustomPaymentSubmit}
            />
          </>
        )}
      </div>
    </div>
  );
}
