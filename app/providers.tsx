'use client';

import { Provider } from 'react-redux';
import { store } from '../store';
import React, { useEffect } from 'react';
import AuthChecker from './auth-checker';
import { NotificationProvider } from '../contexts/NotificationContext';
import NotificationList from '../components/ui/NotificationList';
import ModalProvider from '../contexts/ModalContext';
import { TimezoneProvider } from '../contexts/TimezoneContext';
import { ReAuthProvider } from '../contexts/ReAuthContext';
import { initializeTimezoneSupport } from '../services/TimezoneApiClient';

// Компонент для инициализации timezone поддержки
function TimezoneInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Timezone поддержка уже встроена в ApiClient
    // Инициализируем для совместимости (фактически пустая функция)
    initializeTimezoneSupport();
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ReAuthProvider>
        <NotificationProvider>
          <ModalProvider>
            <TimezoneProvider>
              <TimezoneInitializer>
                <AuthChecker>{children}</AuthChecker>
                <NotificationList />
              </TimezoneInitializer>
            </TimezoneProvider>
          </ModalProvider>
        </NotificationProvider>
      </ReAuthProvider>
    </Provider>
  );
}
