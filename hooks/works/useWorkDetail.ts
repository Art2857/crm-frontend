import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchWorkById,
  archiveWork,
  restoreWork,
} from '../../store/slices/works';
import { fetchAllUsers } from '../../store/slices/users';
import { fetchAllDuties } from '../../store/slices/duties';
import { useDataLoader } from '../useDataLoader';
import { useWorkData } from '../useWorkData';
import { useWorkDuties } from '../useWorkDuties';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { WorkHistory } from '../../types/work';
import { workService } from '../../services/work';
import { privateApi } from '../../services/ApiClient';
import { logger } from '../../utils/logger';
import { User } from '../../types/user';
import { toDateObject, formatDateToISO } from '../../utils/date';

export function useWorkDetail(id: string) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const notification = useNotification();
  const { confirm } = useModal();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);
  const { duties } = useAppSelector((state) => state.duties);

  const [workHistory, setWorkHistory] = useState<WorkHistory[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [responsibleUserData, setResponsibleUserData] = useState<User | null>(
    null
  );

  const loadAllData = useCallback(async () => {
    try {
      const work = await dispatch(
        fetchWorkById({ role: user.role, workId: id })
      ).unwrap();
      if (
        user?.role === 'ADMIN' ||
        user?.role === 'MANAGER' ||
        user?.role === 'WORKER'
      ) {
        await Promise.all([
          dispatch(
            fetchAllUsers({ role: user.role, archivingStatus: 'actual' })
          ).unwrap(),
          dispatch(fetchAllDuties({ role: user.role })).unwrap(),
        ]);
      } else {
        await dispatch(fetchAllDuties({ role: user.role })).unwrap();
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
      salary: workData.salary,
      currency: workData.currency || 'RUB',
      releaseDate: releaseDateFormatted,
    };
  }, [workData]);

  const workManagementHook = useWorkData({
    id,
    initialData: initialWorkData,
    isAuthenticated,
    role: user?.role as any, // Добавляем role parameter
  });

  const dutiesManagementHook = useWorkDuties({
    workId: id,
    workSalary: workData?.salary.toString(),
    role: user?.role as any, // Добавляем role parameter
  });

  const handleArchiveWork = useCallback(async () => {
    try {
      const confirmed = await confirm({
        title: 'Архивация работы',
        message:
          'Все пользователи будут сняты с обязанностей, и начисления по ним прекратятся. Работу можно восстановить, но распределение обязанностей потребуется настроить заново.',
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
      notification.showError('Не удалось архивировать работу');
    }
  }, [id, dispatch, notification, confirm, reloadWorkData, dutiesManagementHook.forceReload]);

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
      notification.showError('Не удалось восстановить работу');
    }
  }, [id, dispatch, notification, confirm, reloadWorkData, dutiesManagementHook.forceReload]);

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
          const response = await privateApi.get<User>(
            `/users/${workData.responsibleUserId}`
          );
          setResponsibleUserData(response.data);
        } catch (error) {
          // тихо
        }
      };
      fetchResponsibleUser();
    }
  }, [responsibleUser, workData]);

  const handleDutiesSubmit = useCallback(
    (
      duties: Array<{
        dutyId: string;
        userId: string;
        price: string | null;
        percentage: string | null;
        currency: 'RUB' | 'USD';
      }>,
      effectiveDate?: string
    ) => {
      // Разрешаем пустой список для обнуления распределения
      dutiesManagementHook.createDistribution(duties, effectiveDate);
    },
    [dutiesManagementHook.createDistribution]
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await workManagementHook.handleSubmit(e);
        setTimeout(() => {
          reloadWorkData();
          dutiesManagementHook.forceReload();
        }, 100);
      } catch (error) {
        // отобразится формой
      }
    },
    [
      workManagementHook.handleSubmit,
      reloadWorkData,
      dutiesManagementHook.forceReload,
    ]
  );

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
      // Проверяем, есть ли пользователь в последнем (актуальном) распределении обязанностей
      const latestDist = dutiesManagementHook.distributions?.[0];
      const isParticipant =
        latestDist?.details.some((detail) => detail.userId === user.id) ?? false;

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
      user.role !== 'ADMIN' &&
      user.role !== 'MANAGER' &&
      user.role !== 'WORKER' &&
      !isResponsible
    );
  }, [user, workData, isResponsible]);

  const loadDutiesHistory = useCallback(async (reload = false) => {
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
  }, [id, notification, dutiesManagementHook.forceReload]);

  const responsibleName = useMemo(() => {
    if (responsibleUser) {
      const lastName = responsibleUser.lastName || '';
      const firstName = responsibleUser.firstName || '';
      return (
        `${lastName} ${firstName}`.trim() ||
        responsibleUser.email ||
        'Пользователь'
      );
    } else if (responsibleUserData) {
      const lastName = responsibleUserData.lastName || '';
      const firstName = responsibleUserData.firstName || '';
      return (
        `${lastName} ${firstName}`.trim() ||
        responsibleUserData.email ||
        'Пользователь'
      );
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
  };
}
