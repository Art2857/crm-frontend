export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp';
export const AVATAR_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export interface AvatarCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function validateAvatarFileCandidate(file: File): string | null {
  if (
    !AVATAR_ALLOWED_MIME_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_MIME_TYPES)[number])
  ) {
    return 'Для аватарки разрешены только JPG, PNG или WEBP изображения';
  }

  if (file.size > AVATAR_MAX_FILE_SIZE_BYTES) {
    return 'Размер аватарки не должен превышать 5 МБ';
  }

  return null;
}
