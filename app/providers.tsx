'use client';

import { Provider } from 'react-redux';
import { store } from '../store';
import React from 'react';
import AuthChecker from './auth-checker';
import { NotificationProvider } from '../contexts/NotificationContext';
import NotificationList from '../components/ui/NotificationList';
import ModalProvider from '../contexts/ModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <NotificationProvider>
        <ModalProvider>
          <AuthChecker>{children}</AuthChecker>
          <NotificationList />
        </ModalProvider>
      </NotificationProvider>
    </Provider>
  );
}
