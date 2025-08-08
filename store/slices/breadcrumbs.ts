import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  Breadcrumb, 
  BreadcrumbState, 
  BreadcrumbConfig
} from '../../types/breadcrumb';
import { RootState } from '..';

// Начальное состояние
const initialState: BreadcrumbState = {
  breadcrumbs: [],
  isLoading: false,
  error: null
};

// Конфигурация хлебных крошек для различных маршрутов
export const breadcrumbConfig: BreadcrumbConfig = {
  '/dashboard': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: true,
      isClickable: false,
      icon: '🏠'
    }
  ],
  '/profile': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'profile',
      title: 'Профиль',
      path: '/profile',
      isActive: true,
      isClickable: false,
      icon: '👤'
    }
  ],
  '/works': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'works',
      title: 'Работы',
      path: '/works',
      isActive: true,
      isClickable: false,
      icon: '📋'
    }
  ],
  '/works/create': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'works',
      title: 'Работы',
      path: '/works',
      isActive: false,
      isClickable: true,
      icon: '📋'
    },
    {
      id: 'create-work',
      title: 'Создание работы',
      path: '/works/create',
      isActive: true,
      isClickable: false,
      icon: '➕'
    }
  ],
  // Общий шаблон для страниц с деталями работы
  // Фактические хлебные крошки для конкретной работы будут созданы динамически
  // с использованием кастомных хлебных крошек на странице
  '/works/detail': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'works',
      title: 'Работы',
      path: '/works',
      isActive: false,
      isClickable: true,
      icon: '📋'
    },
    {
      id: 'work-detail',
      title: 'Детали работы',
      path: '#',
      isActive: true,
      isClickable: false,
      icon: '📄'
    }
  ],
  '/accounts': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'accounts',
      title: 'Аккаунты',
      path: '/accounts',
      isActive: true,
      isClickable: false,
      icon: '👤'
    }
  ],
  '/admin/users': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'admin',
      title: 'Администрирование',
      path: '#',
      isActive: false,
      isClickable: false,
      icon: '⚙️'
    },
    {
      id: 'users',
      title: 'Пользователи',
      path: '/admin/users',
      isActive: true,
      isClickable: false,
      icon: '👥'
    }
  ],
  '/admin/duties': [
    {
      id: 'dashboard',
      title: 'Главная',
      path: '/dashboard',
      isActive: false,
      isClickable: true,
      icon: '🏠'
    },
    {
      id: 'admin',
      title: 'Администрирование',
      path: '#',
      isActive: false,
      isClickable: false,
      icon: '⚙️'
    },
    {
      id: 'duties',
      title: 'Обязанности',
      path: '/admin/duties',
      isActive: true,
      isClickable: false,
      icon: '📝'
    }
  ]
};

// Создание слайса
const breadcrumbsSlice = createSlice({
  name: 'breadcrumbs',
  initialState,
  reducers: {
    // Установка хлебных крошек
    setBreadcrumbs: (state, action: PayloadAction<Breadcrumb[]>) => {
      state.breadcrumbs = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    
    // Очистка хлебных крошек
    clearBreadcrumbs: (state) => {
      state.breadcrumbs = [];
    },
    
    // Добавление хлебной крошки
    addBreadcrumb: (state, action: PayloadAction<Breadcrumb>) => {
      state.breadcrumbs.push(action.payload);
    },
    
    // Удаление хлебной крошки по id
    removeBreadcrumb: (state, action: PayloadAction<string>) => {
      state.breadcrumbs = state.breadcrumbs.filter(
        (breadcrumb) => breadcrumb.id !== action.payload
      );
    },
    
    // Обновление хлебной крошки
    updateBreadcrumb: (state, action: PayloadAction<Breadcrumb>) => {
      const index = state.breadcrumbs.findIndex(
        (breadcrumb) => breadcrumb.id === action.payload.id
      );
      if (index !== -1) {
        state.breadcrumbs[index] = action.payload;
      }
    },
    
    // Установка ошибки
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    // Установка загрузки
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

// Экспорт actions
export const { 
  setBreadcrumbs,
  clearBreadcrumbs,
  addBreadcrumb,
  removeBreadcrumb,
  updateBreadcrumb,
  setError,
  setLoading
} = breadcrumbsSlice.actions;

// Селектор для получения хлебных крошек
export const selectBreadcrumbs = (state: RootState) => state.breadcrumbs.breadcrumbs;

// Экспорт reducer
export default breadcrumbsSlice.reducer; 