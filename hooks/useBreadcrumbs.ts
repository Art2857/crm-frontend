import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import { setBreadcrumbs } from '../store/slices/breadcrumbs';
import { breadcrumbConfig } from '../store/slices/breadcrumbs';
import { Breadcrumb } from '../types/breadcrumb';
import * as breadcrumbUtils from '../utils/breadcrumbs';

/**
 * Функция для сравнения массивов breadcrumbs
 */
const areBreadcrumbsEqual = (a: Breadcrumb[], b: Breadcrumb[]): boolean => {
  if (a.length !== b.length) return false;
  
  return a.every((item, index) => {
    const otherItem = b[index];
    return (
      item.id === otherItem.id &&
      item.title === otherItem.title &&
      item.path === otherItem.path &&
      item.isActive === otherItem.isActive &&
      item.isClickable === otherItem.isClickable
    );
  });
};

/**
 * Хук для работы с хлебными крошками
 * @param customBreadcrumbs - пользовательские хлебные крошки (опционально)
 * @returns объект с хлебными крошками
 */
export const useBreadcrumbs = (customBreadcrumbs?: Breadcrumb[]) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const breadcrumbs = useAppSelector((state) => state.breadcrumbs.breadcrumbs);
  const lastBreadcrumbsRef = useRef<Breadcrumb[]>([]);

  // Мемоизируем customBreadcrumbs чтобы избежать лишних рендеров
  const memoizedCustomBreadcrumbs = useMemo(() => {
    return customBreadcrumbs;
  }, [customBreadcrumbs?.map(b => `${b.id}-${b.title}-${b.path}`).join('|')]);

  useEffect(() => {
    let newBreadcrumbs: Breadcrumb[] = [];

    if (memoizedCustomBreadcrumbs) {
      // Если переданы пользовательские хлебные крошки, используем их
      newBreadcrumbs = memoizedCustomBreadcrumbs;
    } else {
      // Иначе определяем хлебные крошки по текущему пути
      if (pathname === '/dashboard') {
        newBreadcrumbs = breadcrumbUtils.createBaseBreadcrumbs();
        // Главная страница активна и не кликабельна
        newBreadcrumbs[0].isActive = true;
        newBreadcrumbs[0].isClickable = false;
      } else if (pathname === '/profile') {
        newBreadcrumbs = breadcrumbUtils.createProfileBreadcrumbs();
      } else if (pathname === '/works') {
        newBreadcrumbs = breadcrumbUtils.createWorksBreadcrumbs();
      } else if (pathname === '/works/create') {
        newBreadcrumbs = breadcrumbUtils.createCreateWorkBreadcrumbs();
      } else if (
        pathname.startsWith('/works/') &&
        pathname !== '/works/create'
      ) {
        // Получаем ID работы из пути
        const workId = pathname.replace('/works/', '');
        newBreadcrumbs = breadcrumbUtils.createWorkDetailBreadcrumbs(
          undefined,
          workId
        );
      } else if (pathname === '/accounts') {
        newBreadcrumbs = breadcrumbUtils.createAccountsBreadcrumbs();
      } else if (pathname === '/exchange-rates') {
        newBreadcrumbs = breadcrumbUtils.createExchangeRatesBreadcrumbs();
      } else if (pathname === '/admin/users') {
        newBreadcrumbs = breadcrumbUtils.createUsersAdminBreadcrumbs();
      } else if (pathname === '/admin/duties') {
        newBreadcrumbs = breadcrumbUtils.createDutiesAdminBreadcrumbs();
      } else if (pathname === '/admin/distributions') {
        newBreadcrumbs = breadcrumbUtils.createDistributionsAdminBreadcrumbs();
      } else {
        // Если не нашли соответствие, используем конфигурацию из слайса
        const matchedPath = findMatchingPath(pathname);
        if (matchedPath) {
          newBreadcrumbs = breadcrumbConfig[matchedPath];
        }
      }
    }

    // Обновляем breadcrumbs только если они изменились
    if (!areBreadcrumbsEqual(lastBreadcrumbsRef.current, newBreadcrumbs)) {
      lastBreadcrumbsRef.current = newBreadcrumbs;
      dispatch(setBreadcrumbs(newBreadcrumbs));
    }
  }, [pathname, memoizedCustomBreadcrumbs, dispatch]);

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
