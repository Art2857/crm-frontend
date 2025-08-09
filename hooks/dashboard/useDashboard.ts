import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboardData } from '../../store/slices/dashboard';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay } from '../../utils/date';
import { User } from '../../types/user';

export function useDashboard() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    dispatch(fetchDashboardData());
  }, [isAuthenticated, router, dispatch]);

  const getFullName = (u: User | null): string => {
    if (!u) return '';
    return `${u.lastName || ''} ${u.firstName || ''} ${u.middleName || ''}`.trim();
  };

  const calculateAge = (birthday: string | null): number | null => {
    if (!birthday) return null;
    // Нормализуем дату рождения без времени для корректного возраста
    const birth = new Date(birthday);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatSalaryDay = (salaryDay: number | null | undefined): string => {
    if (salaryDay === null || salaryDay === undefined) return 'Не указан';
    return `${salaryDay} число`;
  };

  const formatReleaseDate = (
    releaseDate: string | null | undefined
  ): string => {
    if (!releaseDate) return 'Не указана';
    const formattedDate = formatDateForDisplay(releaseDate);
    return formattedDate || 'Не указана';
  };

  const fullName = useMemo(() => getFullName(user), [user]);
  const age = useMemo(() => calculateAge(user?.birthday ?? null), [user?.birthday]);

  return {
    user,
    data,
    isLoading,
    fullName,
    age,
    formatSalaryDay,
    formatReleaseDate,
    formatCurrency,
  };
}
