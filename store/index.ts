import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/auth';
import worksReducer from './slices/works';
import dutiesReducer from './slices/duties';
import usersReducer from './slices/users';
import breadcrumbsReducer from './slices/breadcrumbs';
import dashboardReducer from './slices/dashboard';
import exchangeRatesReducer from './slices/exchangeRates';
import { api } from './services/api';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    works: worksReducer,
    duties: dutiesReducer,
    users: usersReducer,
    breadcrumbs: breadcrumbsReducer,
    dashboard: dashboardReducer,
    exchangeRates: exchangeRatesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Игнорируем некоторые неселиализуемые значения в состоянии
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(api.middleware),
});

// Типизация для dispatch и selector
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Хуки для использования типизированного dispatch и selector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
