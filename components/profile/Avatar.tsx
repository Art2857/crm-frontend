'use client';

import React, { useState, useRef } from 'react';
import { User } from '../../types/user';
import { useNotification } from '../../contexts/NotificationContext';

interface AvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  onAvatarChange?: (file: File) => void;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  editable = false,
  onAvatarChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notification = useNotification();

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-24 h-24',
  };

  const getInitials = () => {
    const firstName = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastName = user.lastName?.charAt(0)?.toUpperCase() || '';
    return firstName + lastName || user.email?.charAt(0)?.toUpperCase() || '?';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      notification.showError('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notification.showError('Размер изображения не должен превышать 5MB');
      return;
    }

    onAvatarChange?.(file);
  };

  const handleClick = () => {
    if (editable) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ${
        editable ? 'cursor-pointer' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* TODO: В будущем добавить поддержку загрузки аватара */}
      <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
        {getInitials()}
      </div>

      {/* Оверлей для редактирования */}
      {editable && isHovered && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
};

export default Avatar;
