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
      const work = await dispatch(fetchWorkById(id)).unwrap();
      if (user?.role === 'ADMIN') {
        await Promise.all([
          dispatch(fetchAllUsers()).unwrap(),
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
    return {
      name: workData.name,
      responsibleUserId: workData.responsibleUserId,
      salary: workData.salary,
      releaseDate: workData.releaseDate,
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
    [id, workData]
  );

  useBreadcrumbs(breadcrumbs);

  const { isEditing, formData, setIsEditing, handleChange, handleSubmit } =
    useWorkData({
      id,
      initialData: initialWorkData,
      isAuthenticated,
    });

  const {
    distributions,
    isEditingDuties,
    successMessage: dutiesSuccessMessage,
    errorMessage: dutiesErrorMessage,
    setIsEditingDuties,
    createDistribution,
    clearMessages: clearDutiesMessages,
    forceReload: forceReloadDuties,
  } = useWorkDuties({ workId: id, workSalary: workData?.salary });

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
      if (!duties.length) {
        notification.showError('Необходимо добавить хотя бы одну обязанность');
        return;
      }
      createDistribution(duties, effectiveDate);
    },
    [createDistribution, notification]
  );

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await handleSubmit(e);
        setTimeout(() => {
          reloadWorkData();
          forceReloadDuties();
        }, 100);
      } catch (error) {
        // отобразится формой
      }
    },
    [handleSubmit, reloadWorkData, forceReloadDuties]
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
      const historyData = await workService.getHistory(id);
      setWorkHistory(historyData);
      forceReloadDuties();
    } catch (error) {
      notification.showError('Ошибка при загрузке истории обязанностей');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [id, notification, forceReloadDuties]);

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
    isEditing,
    formData,
    setIsEditing,
    handleChange,
    handleFormSubmit,
    // duties
    duties,
    distributions,
    isEditingDuties,
    dutiesSuccessMessage,
    dutiesErrorMessage,
    setIsEditingDuties,
    handleDutiesSubmit,
    clearDutiesMessages,
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
  };
}
