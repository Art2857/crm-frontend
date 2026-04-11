'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import Input from '../ui/Input';
import { User } from '../../types/user';
import { env } from '../../config/env';

interface ReAuthPopupProps {
  isOpen: boolean;
  login: string;
  accountId: string;
  onSuccess: (
    user: User,
    accessToken: string,
    refreshToken: string,
    accessTokenExpiresAt: string,
    refreshTokenExpiresAt: string
  ) => void;
  onCancel: () => void;
}

export const ReAuthPopup: React.FC<ReAuthPopupProps> = ({
  isOpen,
  login,
  accountId,
  onSuccess,
  onCancel,
}) => {
  const [localLogin, setLocalLogin] = useState(login);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop when it changes
  useEffect(() => {
    setLocalLogin(login);
  }, [login]);

  // Focus password input when modal opens
  useEffect(() => {
    if (isOpen && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!localLogin) {
      setError('Требуется логин');
      return;
    }

    if (!password) {
      setError('Требуется пароль');
      return;
    }

    setIsLoading(true);

    try {
      // Call the login API
      const response = await fetch(`${env.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: localLogin, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка аутентификации');
      }

      const data = await response.json();

      // Call success callback with user data and new tokens
      onSuccess(
        data.user,
        data.access_token,
        data.refresh_token,
        data.access_token_expires_at,
        data.refresh_token_expires_at
      );

      // Clear form
      setPassword('');
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ошибка аутентификации. Попробуйте еще раз.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} closeOnBackdropClick={false}>
      <div className="w-full max-w-md p-6" onKeyDown={handleKeyDown}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Требуется повторная аутентификация
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Ваша сессия истекла. Пожалуйста, введите пароль для продолжения.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="Логин"
            type="text"
            value={localLogin}
            onChange={(e) => setLocalLogin(e.target.value)}
            disabled={isLoading}
            fullWidth
            placeholder="Введите ваш логин"
            required
          />

          <Input
            ref={passwordInputRef}
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            fullWidth
            error={error}
            placeholder="Введите ваш пароль"
            required
          />

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Аутентификация...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
