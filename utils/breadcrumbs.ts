import { Breadcrumb } from '../types/breadcrumb';
import { WorkWithHistory, WorkExtended } from '../types/work';
import { User } from '../types/user';

/**
 * Создает базовые хлебные крошки для навигации
 * @returns Массив базовых хлебных крошек (главная)
 */
export const createBaseBreadcrumbs = (): Breadcrumb[] => {
  return [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠',
    },
  ];
};

/**
 * Создает хлебные крошки для страницы профиля
 * @param user - информация о пользователе
 * @returns Массив хлебных крошек для профиля
 */
export const createProfileBreadcrumbs = (user?: User): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'profile',
    title: user ? `Профиль ${user.lastName} ${user.firstName}` : 'Профиль',
    path: '/profile',
    isActive: true,
    isClickable: false,
    icon: '👤',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для списка работ
 * @returns Массив хлебных крошек для списка работ
 */
export const createWorksBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'works',
    title: 'Работы',
    path: '/works',
    isActive: true,
    isClickable: false,
    icon: '📋',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы создания работы
 * @returns Массив хлебных крошек для создания работы
 */
export const createCreateWorkBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createWorksBreadcrumbs();
  // Изменяем статус последнего элемента, чтобы он был кликабельным
  breadcrumbs[breadcrumbs.length - 1].isActive = false;
  breadcrumbs[breadcrumbs.length - 1].isClickable = true;

  breadcrumbs.push({
    id: 'create-work',
    title: 'Создание работы',
    path: '/works/create',
    isActive: true,
    isClickable: false,
    icon: '➕',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для детальной страницы работы
 * @param work - данные работы
 * @returns Массив хлебных крошек для работы
 */
export const createWorkDetailBreadcrumbs = (
  work?: WorkWithHistory | WorkExtended,
  workId?: string
): Breadcrumb[] => {
  const breadcrumbs = createWorksBreadcrumbs();
  // Изменяем статус последнего элемента, чтобы он был кликабельным
  breadcrumbs[breadcrumbs.length - 1].isActive = false;
  breadcrumbs[breadcrumbs.length - 1].isClickable = true;

  // Определяем название работы
  let workTitle = 'Детали работы';
  if (work && 'name' in work) {
    workTitle = work.name;
  } else if (work && 'title' in work) {
    workTitle = work.title;
  } else if (workId) {
    workTitle = `Работа №${workId}`;
  }

  breadcrumbs.push({
    id: `work-${workId || work?.id || 'detail'}`,
    title: workTitle,
    path: `/works/${workId || work?.id || ''}`,
    isActive: true,
    isClickable: false,
    icon: '📄',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы администрирования пользователей
 * @returns Массив хлебных крошек для администрирования пользователей
 */
export const createUsersAdminBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'admin',
    title: 'Администрирование',
    path: '#',
    isActive: false,
    isClickable: false,
    icon: '⚙️',
  });

  breadcrumbs.push({
    id: 'users',
    title: 'Пользователи',
    path: '/admin/users',
    isActive: true,
    isClickable: false,
    icon: '👥',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы администрирования обязанностей
 * @returns Массив хлебных крошек для администрирования обязанностей
 */
export const createDutiesAdminBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'admin',
    title: 'Администрирование',
    path: '#',
    isActive: false,
    isClickable: false,
    icon: '⚙️',
  });

  breadcrumbs.push({
    id: 'duties',
    title: 'Обязанности',
    path: '/admin/duties',
    isActive: true,
    isClickable: false,
    icon: '📝',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы администрирования распределений
 * @returns Массив хлебных крошек для администрирования распределений
 */
export const createDistributionsAdminBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'admin',
    title: 'Администрирование',
    path: '#',
    isActive: false,
    isClickable: false,
    icon: '⚙️',
  });

  breadcrumbs.push({
    id: 'distributions',
    title: 'Распределения',
    path: '/admin/distributions',
    isActive: true,
    isClickable: false,
    icon: '📊',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы управления аккаунтами
 * @returns Массив хлебных крошек для управления аккаунтами
 */
export const createAccountsBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'accounts',
    title: 'Аккаунты',
    path: '/accounts',
    isActive: true,
    isClickable: false,
    icon: '👤',
  });

  return breadcrumbs;
};

/**
 * Создает хлебные крошки для страницы котировок валют
 * @returns Массив хлебных крошек для котировок валют
 */
export const createExchangeRatesBreadcrumbs = (): Breadcrumb[] => {
  const breadcrumbs = createBaseBreadcrumbs();

  breadcrumbs.push({
    id: 'exchange-rates',
    title: 'Котировки валют',
    path: '/exchange-rates',
    isActive: true,
    isClickable: false,
    icon: '💱',
  });

  return breadcrumbs;
};