import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchWorkById } from '../../store/slices/works';
import { fetchAllUsers } from '../../store/slices/users';
import { fetchAllDuties } from '../../store/slices/duties';
import { useDataLoader } from '../../hooks/useDataLoader';
import { useWorkData } from '../../hooks/useWorkData';
import { useWorkDuties } from '../../hooks/useWorkDuties';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { Breadcrumb } from '../../types/breadcrumb';
import { useNotification } from '../../contexts/NotificationContext';
import { WorkHistory } from '../../types/work';
import { workService } from '../../services/work';
import { privateApi } from '../../services/ApiClient';
import { User } from '../../types/user';
import { toDateObject, formatDateToISO } from '../../utils/date';

type DutiesTabType = 'current' | 'history';

export function useWorkDetail(id: string) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const notification = useNotification();

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { users } = useAppSelector((state) => state.users);
  const { duties } = useAppSelector((state) => state.duties);

  const [dutiesTab, setDutiesTab] = useState<DutiesTabType>('current');
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
      if (user?.role === 'ADMIN') {
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
      releaseDate: releaseDateFormatted,
    };
  }, [workData]);

  const breadcrumbs = useMemo<Breadcrumb[]>(
    () => [
      {
        id: 'dashboard',
        title: 'Главная',
        path: '/dashboard',
        isActive: false,
        isClickable: true,
        icon: '🏠',
      },
      {
        id: 'works',
        title: 'Работы',
        path: '/works',
        isActive: false,
        isClickable: true,
        icon: '📋',
      },
      ...(workData
        ? [
            {
              id: `work-${id}`,
              title: workData.name || `Работа №${id}`,
              path: `/works/${id}`,
              isActive: true,
              isClickable: false,
              icon: '📄',
            },
          ]
        : []),
    ],
    [workData, id]
  );

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

  useBreadcrumbs(breadcrumbs);

  const handleArchiveWork = useCallback(async () => {
    try {
      const confirmArchive = window.confirm(
        'Вы уверены, что хотите архивировать эту работу?'
      );
      if (!confirmArchive) return;

      await workService.archive(user.role, id);
      notification.showSuccess('Работа успешно архивирована');
      router.push('/works'); // Перенаправляем на список работ
    } catch (error) {
      console.error('Error archiving work:', error);
      notification.showError('Не удалось архивировать работу');
    }
  }, [id, notification, router]);

  const handleRestoreWork = useCallback(async () => {
    try {
      const confirmRestore = window.confirm(
        'Вы уверены, что хотите восстановить эту работу?'
      );
      if (!confirmRestore) return;

      await workService.restore(user.role, id);
      notification.showSuccess('Работа успешно восстановлена');
      // Обновляем данные работы
      await reloadWorkData();
    } catch (error) {
      console.error('Error restoring work:', error);
      notification.showError('Не удалось восстановить работу');
    }
  }, [id, notification, reloadWorkData]);

  const loadWorkHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const history = await workService.getHistory(user.role, id);
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

  const canEdit = useMemo(() => {
    if (!user || !workData) return false;
    return user.role === 'ADMIN';
  }, [user, workData]);

  const isResponsible = useMemo(() => {
    if (!user || !workData) return false;
    return workData.responsibleUserId === user.id;
  }, [user, workData]);

  const showOnlyCurrentUserDuties = useMemo(() => {
    if (!user || !workData) return true;
    return user.role !== 'ADMIN' && !isResponsible;
  }, [user, workData, isResponsible]);

  const loadDutiesHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const historyData = await workService.getHistory(user.role, id);
      setWorkHistory(historyData);
      dutiesManagementHook.forceReload();
    } catch (error) {
      notification.showError('Ошибка при загрузке истории обязанностей');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [id, notification, dutiesManagementHook.forceReload]);

  useEffect(() => {
    if (dutiesTab === 'history' && !workHistory && !isLoadingHistory) {
      loadDutiesHistory();
    }
  }, [dutiesTab, workHistory, isLoadingHistory, loadDutiesHistory]);

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
    canEdit,
    isResponsible,
    showOnlyCurrentUserDuties,
    // view helpers
    responsibleName,
    // ui
    dutiesTab,
    setDutiesTab,
    // actions
    handleArchiveWork,
    handleRestoreWork,
  };
}
