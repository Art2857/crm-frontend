/**
 * Утилиты для работы с JWT токенами
 */

export function decodeJWT(token: string): any {
  try {
    // JWT состоит из трех частей, разделенных точками
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Некорректный формат JWT токена');
    }

    // Декодируем payload (вторая часть)
    const payload = parts[1];
    
    // Добавляем недостающие символы для корректного base64
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Декодируем base64
    const decodedPayload = atob(paddedPayload);
    
    // Парсим JSON
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Ошибка при декодировании JWT:', error);
    return null;
  }
}

 