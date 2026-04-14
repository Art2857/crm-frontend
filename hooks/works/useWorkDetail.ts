import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchWorkById, archiveWork, restoreWork } from '../../store/slices/works';
import { fetchAllUsers } from '../../store/slices/users';
import { fetchAllDuties } from '../../store/slices/duties';
import { useDataLoader } from '../useDataLoader';
import { useWorkData } from '../useWorkData';
import { useWorkDuties } from '../useWorkDuties';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useErrorHandler } from '../useErrorHandler';
import { WorkArchiveStatus, WorkHistory } from '../../types/work';
import { workService } from '../../services/work';
import { privateApi } from '../../services/ApiClient';
import { logger } from '../../utils/logger';
import { User } from '../../types/user';
import { toDateObject, formatDateToISO } from '../../utils/date';
import { getDistributionByWorkHistoryId } from '../../utils/distributions';

export function useWorkDetail(id: string) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const notification = useNotification();
  const { confirm } = useModal();
  const { handleError } = useErrorHandler();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);
  const { duties } = useAppSelector((state) => state.duties);

  const [workHistory, setWorkHistory] = useState<WorkHistory[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [responsibleUserData, setResponsibleUserData] = useState<User | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<WorkArchiveStatus | null>(null);
  const [isLoadingArchiveStatus, setIsLoadingArchiveStatus] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    if (!user?.role) {
      throw new Error('Пользователь не аутентифицирован');
    }

    try {
      const work = await dispatch(fetchWorkById({ workId: id })).unwrap();
      if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'WORKER') {
        await Promise.all([
          dispatch(fetchAllUsers({ archivingStatus: 'actual' })).unwrap(),
          dispatch(fetchAllDuties()).unwrap(),
        ]);
      } else {
        await dispatch(fetchAllDuties()).unwrap();
      }
      return work;
    } catch (error) {
      throw error;
    }
  }, [dispatch, id, user?.role]);

  const {
    data: workData,
    isLoading,
    error,
    reload: reloadWorkData,
  } = useDataLoader({
    loadData: loadAllData,
    dependencies: [id, isAuthenticated],
  });

  const initialWorkData = useMemo(() => {
    if (!workData) return undefined;

    // Преобразуем дату в формат YYYY-MM-DD для input type="date"
    let releaseDateFormatted = '';
    if (workData.releaseDate) {
      // Используем функцию из utils/date.ts для правильного парсинга российских дат
      const dateObj = toDateObject(workData.releaseDate);
      if (dateObj) {
        releaseDateFormatted = formatDateToISO(dateObj);
      }
    }

    return {
      name: workData.name,
      responsibleUserId: workData.responsibleUserId,
      releaseDate: releaseDateFormatted,
    };
  }, [workData]);

  const workManagementHook = useWorkData({
    id,
    initialData: initialWorkData,
    isAuthenticated,
  });

  const dutiesManagementHook = useWorkDuties({
    workId: id,
    workSalary: workData?.salary.toString(),
  });

  const canManageArchive = useMemo(() => {
    return user?.role === 'ADMIN' || user?.role === 'MANAGER';
  }, [user?.role]);

  const loadArchiveStatus = useCallback(async () => {
    if (!canManageArchive || workData?.isArchived) {
      setArchiveStatus(null);
      return null;
    }

    try {
      setIsLoadingArchiveStatus(true);
      const status = await workService.getArchiveStatus(id);
      setArchiveStatus(status);
      return status;
    } catch (error) {
      logger.error('Error loading archive status:', error);
      const fallbackStatus = {
        canArchive: false,
        reasons: [
          'Не удалось проверить условия архивации. Обновите страницу или попробуйте позже.',
        ],
        activeAssignmentsCount: 0,
        unpaidDutyDebtsCount: 0,
      };
      setArchiveStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsLoadingArchiveStatus(false);
    }
  }, [canManageArchive, id, workData?.isArchived]);

  useEffect(() => {
    if (!workData) return;
    void loadArchiveStatus();
  }, [workData, loadArchiveStatus]);

  const handleArchiveWork = useCallback(async () => {
    try {
      const latestArchiveStatus = await workService.getArchiveStatus(id);
      setArchiveStatus(latestArchiveStatus);

      if (!latestArchiveStatus.canArchive) {
        notification.showError(latestArchiveStatus.reasons.join(' '), 10000);
        return;
      }

      const confirmed = await confirm({
        title: 'Архивация работы',
        message:
          'Работа будет отправлена в архив. Перед этим вы уже должны снять все обязанности в последнем распределении и полностью погасить выплаты по работе.',
        confirmText: 'Архивировать',
        cancelText: 'Отмена',
        variant: 'danger',
      });
      if (!confirmed) return;

      await dispatch(archiveWork(id)).unwrap();
      notification.showSuccess('Работа успешно архивирована');
      await reloadWorkData();
      await dutiesManagementHook.forceReload();
    } catch (error) {
      logger.error('Error archiving work:', error);
      notification.showError(handleError(error).message, 10000);
    }
  }, [
    id,
    dispatch,
    notification,
    confirm,
    reloadWorkData,
    dutiesManagementHook.forceReload,
    handleError,
  ]);

  const handleRestoreWork = useCallback(async () => {
    try {
      const confirmed = await confirm({
        title: 'Восстановление работы',
        message: 'Вы уверены, что хотите восстановить работу из архива?',
        confirmText: 'Восстановить',
        cancelText: 'Отмена',
        variant: 'primary',
      });
      if (!confirmed) return;

      await dispatch(restoreWork(id)).unwrap();
      notification.showSuccess('Работа успешно восстановлена');
      await reloadWorkData();
      await dutiesManagementHook.forceReload();
    } catch (error) {
      logger.error('Error restoring work:', error);
      notification.showError(handleError(error).message, 10000);
    }
  }, [
    id,
    dispatch,
    notification,
    confirm,
    reloadWorkData,
    dutiesManagementHook.forceReload,
    handleError,
  ]);

  const loadWorkHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const history = await workService.getHistory(id);
      setWorkHistory(history);
    } catch (error) {
      console.error('Error loading work history:', error);
      notification.showError('Не удалось загрузить историю работы');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [id, notification]);

  const responsibleUser = useMemo(() => {
    if (!workData || !users.length) return null;
    return users.find((u) => u.id === workData.responsibleUserId) || null;
  }, [users, workData]);

  useEffect(() => {
    if (!responsibleUser && workData && workData.responsibleUserId) {
      const fetchResponsibleUser = async () => {
        try {
          const response = await privateApi.get<User>(`/users/${workData.responsibleUserId}`);
          setResponsibleUserData(response.data);
        } catch (error) {
          // тихо
        }
      };
      fetchResponsibleUser();
    }
  }, [responsibleUser, workData]);

  const handleDutiesSubmit = useCallback(
    async (
      duties: Array<{
        dutyId: string;
        userId: string;
        price: string | null;
        percentage: string | null;
        currency: 'RUB' | 'USD';
      }>,
      effectiveDate?: string,
    ) => {
      // Разрешаем пустой список для обнуления распределения
      const result = await dutiesManagementHook.createDistribution(duties, effectiveDate);

      if (result !== null) {
        await reloadWorkData();
        await loadArchiveStatus();
      }

      return result;
    },
    [dutiesManagementHook.createDistribution, reloadWorkData, loadArchiveStatus],
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await workManagementHook.handleSubmit(e);
        await Promise.all([
          reloadWorkData(),
          dutiesManagementHook.forceReload(),
          loadWorkHistory(),
          loadArchiveStatus(),
        ]);
      } catch (error) {
        // отобразится формой
      }
    },
    [
      workManagementHook.handleSubmit,
      reloadWorkData,
      dutiesManagementHook.forceReload,
      loadWorkHistory,
      loadArchiveStatus,
    ],
  );

  const refreshAfterIncomeFixation = useCallback(async () => {
    await Promise.all([
      reloadWorkData(),
      dutiesManagementHook.forceReload(),
      loadWorkHistory(),
      loadArchiveStatus(),
    ]);
  }, [reloadWorkData, dutiesManagementHook.forceReload, loadWorkHistory, loadArchiveStatus]);

  const canEditWork = useMemo(() => {
    if (!user || !workData) return false;
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;

    if (user.role === 'WORKER') {
      return workData.responsibleUserId === user.id;
    }

    return false;
  }, [user, workData]);

  const canDistributeDuties = useMemo(() => {
    if (!user || !workData) return false;
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;

    if (user.role === 'WORKER') {
      const isResponsibleForWork = workData.responsibleUserId === user.id;
      const latestWorkHistoryId = workData.history?.[0]?.id;
      // Проверяем, есть ли пользователь в последнем (актуальном) распределении обязанностей
      const latestDist = getDistributionByWorkHistoryId(
        dutiesManagementHook.distributions,
        latestWorkHistoryId,
      );
      const isParticipant =
        latestDist?.details.some((detail) => detail.user.id === user.id) ?? false;

      return isResponsibleForWork || isParticipant;
    }

    return false;
  }, [user, workData, dutiesManagementHook.distributions]);

  const isResponsible = useMemo(() => {
    if (!user || !workData) return false;
    return workData.responsibleUserId === user.id;
  }, [user, workData]);

  const showOnlyCurrentUserDuties = useMemo(() => {
    if (!user || !workData) return true;
    return (
      user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'WORKER' && !isResponsible
    );
  }, [user, workData, isResponsible]);

  const loadDutiesHistory = useCallback(
    async (reload = false) => {
      setIsLoadingHistory(true);
      try {
        const historyData = await workService.getHistory(id);
        setWorkHistory(historyData);
        if (reload) {
          await dutiesManagementHook.forceReload();
        }
      } catch (error) {
        notification.showError('Ошибка при загрузке истории обязанностей');
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [id, notification, dutiesManagementHook.forceReload],
  );

  const responsibleName = useMemo(() => {
    if (responsibleUser) {
      const lastName = responsibleUser.lastName || '';
      const firstName = responsibleUser.firstName || '';
      return `${lastName} ${firstName}`.trim() || responsibleUser.email || 'Пользователь';
    } else if (responsibleUserData) {
      const lastName = responsibleUserData.lastName || '';
      const firstName = responsibleUserData.firstName || '';
      return `${lastName} ${firstName}`.trim() || responsibleUserData.email || 'Пользователь';
    }
    return 'Не назначен';
  }, [responsibleUser, responsibleUserData]);

  return {
    // base
    isLoading,
    error,
    workData,
    user,
    users,
    // edit work
    isEditing: workManagementHook.isEditing,
    formData: workManagementHook.formData,
    setIsEditing: workManagementHook.setIsEditing,
    handleChange: workManagementHook.handleChange,
    handleFormSubmit,
    // duties
    duties,
    distributions: dutiesManagementHook.distributions,
    isEditingDuties: dutiesManagementHook.isEditingDuties,
    dutiesSuccessMessage: dutiesManagementHook.successMessage,
    dutiesErrorMessage: dutiesManagementHook.errorMessage,
    setIsEditingDuties: dutiesManagementHook.setIsEditingDuties,
    handleDutiesSubmit,
    clearDutiesMessages: dutiesManagementHook.clearMessages,
    loadDutiesHistory,
    isLoadingHistory,
    workHistory,
    // access
    canEdit: canEditWork,
    canDistributeDuties,
    isResponsible,
    showOnlyCurrentUserDuties,
    // view helpers
    responsibleName,
    // actions
    handleArchiveWork,
    handleRestoreWork,
    refreshAfterIncomeFixation,
    canManageArchive,
    archiveStatus,
    isLoadingArchiveStatus,
  };
}
