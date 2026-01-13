'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ReAuthPopup } from '../components/auth/ReAuthPopup';
import { accountManagerService } from '../services/accountManager';
import { tokenStorage } from '../services/tokenStorage';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/slices/auth';
import { User } from '../types/user';

interface ReAuthContextValue {
  showReAuthPopup: (email: string, accountId: string) => Promise<boolean>;
  closeReAuthPopup: () => void;
}

const ReAuthContext = createContext<ReAuthContextValue | undefined>(undefined);

export const useReAuth = () => {
  const context = useContext(ReAuthContext);
  if (!context) {
    throw new Error('useReAuth must be used within ReAuthProvider');
  }
  return context;
};

interface ReAuthState {
  isOpen: boolean;
  email: string;
  accountId: string;
  resolve?: (success: boolean) => void;
}

export const ReAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [reAuthState, setReAuthState] = useState<ReAuthState>({
    isOpen: false,
    email: '',
    accountId: '',
  });

  // Listen for refreshTokenExpired events
  useEffect(() => {
    const handleRefreshTokenExpired = (event: CustomEvent) => {
      const { email, accountId } = event.detail;
      showReAuthPopup(email, accountId);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('refreshTokenExpired' as any, handleRefreshTokenExpired);

      return () => {
        window.removeEventListener('refreshTokenExpired' as any, handleRefreshTokenExpired);
      };
    }
  }, []);

  const showReAuthPopup = useCallback((email: string, accountId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setReAuthState({
        isOpen: true,
        email,
        accountId,
        resolve,
      });
    });
  }, []);

  const closeReAuthPopup = useCallback(() => {
    if (reAuthState.resolve) {
      reAuthState.resolve(false);
    }
    setReAuthState({
      isOpen: false,
      email: '',
      accountId: '',
    });
  }, [reAuthState.resolve]);

  const handleSuccess = useCallback(
    (user: User, accessToken: string, refreshToken: string, accessTokenExpiresAt: string, refreshTokenExpiresAt: string) => {
      // Update the saved account with new tokens and user data
      accountManagerService.saveAccount(
        user,
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        true // Set as current
      );

      // Update tokenStorage
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(refreshToken);
      tokenStorage.setAccessTokenExpiresAt(accessTokenExpiresAt);
      tokenStorage.setRefreshTokenExpiresAt(refreshTokenExpiresAt);

      // Update Redux state to actually switch the account
      dispatch(setCredentials({
        user: user,
        token: accessToken,
      }));

      // Dispatch account switched event
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('accountSwitched', {
          detail: { accountId: user.id },
        });
        window.dispatchEvent(event);
      }

      if (reAuthState.resolve) {
        reAuthState.resolve(true);
      }

      setReAuthState({
        isOpen: false,
        email: '',
        accountId: '',
      });
    },
    [reAuthState.resolve, dispatch]
  );

  const contextValue: ReAuthContextValue = {
    showReAuthPopup,
    closeReAuthPopup,
  };

  return (
    <ReAuthContext.Provider value={contextValue}>
      {children}
      <ReAuthPopup
        isOpen={reAuthState.isOpen}
        email={reAuthState.email}
        accountId={reAuthState.accountId}
        onSuccess={handleSuccess}
        onCancel={closeReAuthPopup}
      />
    </ReAuthContext.Provider>
  );
};
