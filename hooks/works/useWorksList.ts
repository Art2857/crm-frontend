import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUsersMap } from '../shared/useUsersMap';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchAllWorks, fetchUserWorks } from '../../store/slices/works';
import { fetchAllUsers } from '../../store/slices/users';
import { getCurrentUser } from '../../store/slices/auth';
import { logger } from '../../utils/logger';
import { Work } from '../../types/work';
import { workService } from '../../services/work';
import { useNotification } from '../../contexts/NotificationContext';
import { User } from '../../types/user';

export function useWorksList() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    isAuthenticated,
    user,
    isLoading: authLoading,
  } = useAppSelector((state) => state.auth);
  const { works, userWorks, isLoading, error } = useAppSelector(
    (state) => state.works
  );
  const { users } = useAppSelector((state) => state.users);

  const [displayedWorks, setDisplayedWorks] = useState<Work[]>([]);
  const [viewType, setViewType] = useState<'all' | 'user'>('all');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedWorks, setArchivedWorks] = useState<Work[]>([]);
  const notification = useNotification();

  const usersMap = useUsersMap(users);

  useEffect(() => {
    const initializeAuth = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (!user) {
        try {
          await dispatch(getCurrentUser({ role: 'WORKER' as any })).unwrap(); // Default role since we don't know user role yet
        } catch (error) {
          logger.error('Ошибка при получении пользователя:', error);
          router.push('/login');
          return;
        }
      }
    };
    initializeAuth();
  }, [authLoading, isAuthenticated, user, dispatch, router]);

  useEffect(() => {
    if (!isAuthenticated || !user || authLoading || dataLoaded) return;
    const loadData = async () => {
      try {
        logger.debug('Loading data for authenticated user:', {
          userId: user.id,
          userRole: user.role,
        });
        const promises: Array<any> = [];
        promises.push(dispatch(fetchAllUsers({ role: user.role })));
        if (user.role === 'ADMIN') {
          promises.push(dispatch(fetchAllWorks({ role: user.role })));
          setViewType('all');
        } else {
          logger.debug('Fetching user works for userId:', user.id);
          promises.push(
            dispatch(fetchUserWorks({ role: user.role, userId: user.id }))
          );
          setViewType('user');
        }
        await Promise.all(promises);
        setDataLoaded(true);
      } catch (error) {
        logger.error('Ошибка при загрузке данных:', error);
      }
    };
    loadData();
  }, [isAuthenticated, user, authLoading, dataLoaded, dispatch]);

  useEffect(() => {
    logger.debug('Updating displayed works:', {
      viewType,
      showArchived,
      works: works.length,
      userWorks: userWorks.length,
    });
    if (showArchived) setDisplayedWorks(archivedWorks);
    else setDisplayedWorks(viewType === 'all' ? works : userWorks);
  }, [viewType, showArchived, works, userWorks, archivedWorks]);

  const handleCreateWork = useCallback(() => {
    router.push('/works/create');
  }, [router]);

  const handleViewWork = useCallback(
    (id: string) => {
      router.push(`/works/${id}`);
    },
    [router]
  );

  const handleToggleView = useCallback(async () => {
    if (user.role === 'ADMIN') {
      const newViewType = viewType === 'all' ? 'user' : 'all';
      if (newViewType === 'user' && userWorks.length === 0) {
        logger.debug('Loading user works for admin:', user.id);
        try {
          await dispatch(fetchUserWorks({ role: user.role, userId: user.id }));
        } catch (error) {
          logger.error('Ошибка при загрузке пользовательских работ:', error);
        }
      }
      setViewType(newViewType);
    }
  }, [dispatch, user, userWorks.length, viewType]);

  const handleToggleArchived = useCallback(async () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next && archivedWorks.length === 0) {
      try {
        const list = await workService.getArchived(user.role);
        setArchivedWorks(list);
      } catch (e) {
        notification.showError('Не удалось загрузить архивные работы');
      }
    }
  }, [showArchived, archivedWorks.length, notification]);

  const handleArchive = useCallback(
    async (id: string) => {
      try {
        await workService.archive(user.role as any, id);
        notification.showSuccess('Работа отправлена в архив');
        if (showArchived) {
          const list = await workService.getArchived(user.role);
          setArchivedWorks(list);
        } else {
          dispatch(fetchAllWorks({ role: user.role }));
        }
      } catch (e) {
        notification.showError('Ошибка при архивировании работы');
      }
    },
    [dispatch, showArchived, notification]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await workService.restore(user.role, id);
        notification.showSuccess('Работа восстановлена из архива');
        const list = await workService.getArchived(user.role);
        setArchivedWorks(list);
        dispatch(fetchAllWorks({ role: user.role }));
      } catch (e) {
        notification.showError('Ошибка при восстановлении работы');
      }
    },
    [dispatch, notification]
  );

  const getResponsibleName = useCallback(
    (work: Work): string => {
      const responsibleUser = usersMap[work.responsibleUserId];
      if (responsibleUser) {
        const lastName = responsibleUser.lastName?.trim() || '';
        const firstName = responsibleUser.firstName?.trim() || '';
        const fullName = `${lastName} ${firstName}`.trim();
        return fullName || 'Не указано имя';
      }
      return 'Не назначен';
    },
    [usersMap]
  );

  const isEmptyWorksList = displayedWorks.length === 0 && !isLoading;

  return {
    // global
    isAuthenticated,
    authLoading,
    user,
    isLoading,
    error,
    users,
    // local
    viewType,
    showArchived,
    displayedWorks,
    isEmptyWorksList,
    // handlers
    handleCreateWork,
    handleViewWork,
    handleToggleView,
    handleToggleArchived,
    handleArchive,
    handleRestore,
    // utils
    getResponsibleName,
  };
}
