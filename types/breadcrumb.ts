/**
 * Интерфейс для хлебных крошек
 */
export interface Breadcrumb {
  /** Уникальный идентификатор хлебной крошки */
  id: string;
  /** Название хлебной крошки */
  title: string;
  /** URL-путь, куда ведет хлебная крошка */
  path: string;
  /** Является ли хлебная крошка активной (текущей) */
  isActive?: boolean;
  /** Является ли хлебная крошка кликабельной */
  isClickable?: boolean;
  /** Иконка для отображения (опционально) */
  icon?: string;
}

/**
 * Интерфейс для конфигурации хлебных крошек по маршрутам
 */
export interface BreadcrumbConfig {
  /** Ключ - путь маршрута, значение - массив хлебных крошек */
  [route: string]: Breadcrumb[];
}



/**
 * Состояние хлебных крошек в хранилище
 */
export interface BreadcrumbState {
  breadcrumbs: Breadcrumb[];
  isLoading: boolean;
  error: string | null;
} 