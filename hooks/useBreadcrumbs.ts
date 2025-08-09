import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import { setBreadcrumbs } from '../store/slices/breadcrumbs';
import { breadcrumbConfig } from '../store/slices/breadcrumbs';
import { Breadcrumb } from '../types/breadcrumb';
import * as breadcrumbUtils from '../utils/breadcrumbs';

/**
 * Хук для работы с хлебными крошками
 * @param customBreadcrumbs - пользовательские хлебные крошки (опционально)
 * @returns объект с хлебными крошками
 */
export const useBreadcrumbs = (customBreadcrumbs?: Breadcrumb[]) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const breadcrumbs = useAppSelector((state) => state.breadcrumbs.breadcrumbs);

  useEffect(() => {
    if (customBreadcrumbs) {
      // Если переданы пользовательские хлебные крошки, используем их
      dispatch(setBreadcrumbs(customBreadcrumbs));
    } else {
      // Иначе определяем хлебные крошки по текущему пути
      let dynamicBreadcrumbs: Breadcrumb[] = [];

      // Определяем тип страницы по пути и создаем соответствующие хлебные крошки
      if (pathname === '/dashboard') {
        dynamicBreadcrumbs = breadcrumbUtils.createBaseBreadcrumbs();
        // Главная страница активна и не кликабельна
        dynamicBreadcrumbs[0].isActive = true;
        dynamicBreadcrumbs[0].isClickable = false;
      } else if (pathname === '/profile') {
        dynamicBreadcrumbs = breadcrumbUtils.createProfileBreadcrumbs();
      } else if (pathname === '/works') {
        dynamicBreadcrumbs = breadcrumbUtils.createWorksBreadcrumbs();
      } else if (pathname === '/works/create') {
        dynamicBreadcrumbs = breadcrumbUtils.createCreateWorkBreadcrumbs();
      } else if (
        pathname.startsWith('/works/') &&
        pathname !== '/works/create'
      ) {
        // Получаем ID работы из пути
        const workId = pathname.replace('/works/', '');
        dynamicBreadcrumbs = breadcrumbUtils.createWorkDetailBreadcrumbs(
          undefined,
          workId
        );
      } else if (pathname === '/accounts') {
        dynamicBreadcrumbs = breadcrumbUtils.createAccountsBreadcrumbs();
      } else if (pathname === '/admin/users') {
        dynamicBreadcrumbs = breadcrumbUtils.createUsersAdminBreadcrumbs();
      } else if (pathname === '/admin/duties') {
        dynamicBreadcrumbs = breadcrumbUtils.createDutiesAdminBreadcrumbs();
      } else if (pathname === '/admin/distributions') {
        dynamicBreadcrumbs =
          breadcrumbUtils.createDistributionsAdminBreadcrumbs();
      } else {
        // Если не нашли соответствие, используем конфигурацию из слайса
        const matchedPath = findMatchingPath(pathname);

        if (matchedPath) {
          dispatch(setBreadcrumbs(breadcrumbConfig[matchedPath]));
          return;
        }
      }

      // Устанавливаем динамически созданные хлебные крошки
      dispatch(setBreadcrumbs(dynamicBreadcrumbs));
    }
  }, [pathname, customBreadcrumbs, dispatch]);

  return { breadcrumbs };
};

/**
 * Функция для поиска соответствующего пути в конфигурации хлебных крошек
 * @param currentPath - текущий путь
 * @returns найденный путь или undefined
 */
const findMatchingPath = (currentPath: string): string | undefined => {
  // Сначала ищем точное совпадение
  if (breadcrumbConfig[currentPath]) {
    return currentPath;
  }

  // Если точного совпадения нет, ищем максимально близкое по шаблону
  // Сортируем пути по длине (от более длинных к более коротким)
  // чтобы находить наиболее специфичный маршрут
  const paths = Object.keys(breadcrumbConfig).sort(
    (a, b) => b.length - a.length
  );

  for (const path of paths) {
    // Проверяем, является ли текущий путь частью одного из шаблонов
    // например, /works/123 должен соответствовать шаблону /works
    if (
      currentPath.startsWith(path) &&
      // Проверяем, что после шаблона идет конец строки или слеш
      (currentPath.length === path.length ||
        currentPath[path.length] === '/' ||
        path.endsWith('/'))
    ) {
      return path;
    }
  }

  return undefined;
};
