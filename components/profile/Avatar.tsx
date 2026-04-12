'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline';
import { User } from '../../types/user';
import { useNotification } from '../../contexts/NotificationContext';
import { AVATAR_ACCEPT_ATTRIBUTE, validateAvatarFileCandidate } from '../../utils/avatarUpload';

interface AvatarProps {
  user: Pick<User, 'firstName' | 'lastName' | 'email' | 'avatarUrl'>;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  editable?: boolean;
  onAvatarChange?: (file: File) => void;
  onRemove?: () => void;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  editable = false,
  onAvatarChange,
  onRemove,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notification = useNotification();

  const sizeClasses = {
    tiny: 'h-8 w-8 text-xs',
    small: 'h-10 w-10 text-sm',
    medium: 'h-16 w-16 text-lg',
    large: 'h-24 w-24 text-2xl',
    xlarge: 'h-32 w-32 text-3xl',
  };

  useEffect(() => {
    setImageFailed(false);
  }, [user.avatarUrl]);

  const getInitials = () => {
    const firstName = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastName = user.lastName?.charAt(0)?.toUpperCase() || '';
    return firstName + lastName || user.email?.charAt(0)?.toUpperCase() || '?';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAvatarFileCandidate(file);
    if (validationError) {
      notification.showError(validationError);
      event.target.value = '';
      return;
    }

    onAvatarChange?.(file);
    event.target.value = '';
  };

  const handleClick = () => {
    if (editable) {
      fileInputRef.current?.click();
    }
  };

  const hasAvatarImage = Boolean(user.avatarUrl) && !imageFailed;
  const initials = getInitials();
  const alt = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Аватар';

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${sizeClasses[size]} ${className} ${
          editable ? 'cursor-pointer transition-transform duration-200 hover:scale-[1.02]' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {hasAvatarImage ? (
          // Presigned avatar URLs may come from dynamic object-storage hosts, so we avoid next/image restrictions here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl ?? undefined}
            alt={alt}
            className="block h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 via-primary-600 to-primary-700 font-bold text-white">
            {initials}
          </div>
        )}

        {editable && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-white transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <CameraIcon className="h-5 w-5" />
            <span className="text-[11px] font-medium">Изменить</span>
          </div>
        )}
      </div>

      {editable && onRemove && user.avatarUrl && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-red-500 shadow-md transition-colors hover:bg-red-50"
          aria-label="Удалить аватар"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
};

export default Avatar;
