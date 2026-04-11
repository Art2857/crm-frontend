import { useMemo } from 'react';
import { User } from '../../types/user';

/**
 * Хук для создания карты пользователей для быстрого доступа
 * Устраняет дублирование кода в компонентах
 */
export function useUsersMap(users: User[]): Record<string, User> {
  return useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((user) => {
      if (user && user.id) {
        map[user.id] = user;
      }
    });
    return map;
  }, [users]);
}

/**
 * Хук для получения отформатированного имени пользователя
 */
export function useUserDisplayName(user: User | undefined): string {
  return useMemo(() => {
    if (!user) return 'Пользователь';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Пользователь';
  }, [user]);
}

/**
 * Хук для получения инициалов пользователя
 */
export function useUserInitials(user: User | undefined): string {
  return useMemo(() => {
    if (!user) return 'П';

    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    if (firstName || lastName) {
      return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
    }

    return user.email ? user.email[0].toUpperCase() : 'П';
  }, [user]);
}
