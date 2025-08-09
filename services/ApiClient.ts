import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  CancelTokenSource,
  CreateAxiosDefaults,
} from 'axios';
import https from 'https';
import { env, isDevelopment } from '../config/env';
import { isJwtExpired, decodeJWT } from '../utils/jwt';
import { tokenStorage } from './tokenStorage';
import { logger } from '../utils/logger';

// Централизованный baseURL
const API_URL = env.apiBaseUrl;

// Maximum timeout for requests (in milliseconds)
const REQUEST_TIMEOUT = 30000;

// Типы ответов
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Опции для создания API-клиента
export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  unauthorizedRedirect?: boolean;
  withCredentials?: boolean;
  requiresAuth?: boolean;
}

/**
 * Ошибка API с дополнительными свойствами
 */
export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  isValidationError: boolean;
  validationErrors?: Record<string, string[]>;
  errorMessages?: string[];
  originalError: any;
  originalData?: any;

  constructor(
    message: string,
    options: {
      status?: number;
      isNetworkError?: boolean;
      isValidationError?: boolean;
      validationErrors?: Record<string, string[]>;
      errorMessages?: string[];
      originalError?: any;
      originalData?: any;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.isNetworkError = options.isNetworkError || false;
    this.isValidationError = options.isValidationError || false;
    this.validationErrors = options.validationErrors;
    this.errorMessages = options.errorMessages;
    this.originalError = options.originalError;
    this.originalData = options.originalData;
  }
}

// Хранилище активных запросов для отмены
interface RequestMap {
  [key: string]: CancelTokenSource;
}

// Sanitize data before sending to prevent XSS
const sanitizeRequestData = (data: any): any => {
  if (!data) return data;

  // If it's not an object or array, return as is for primitive types
  if (typeof data !== 'object') {
    // Trim strings to remove excess whitespace
    if (typeof data === 'string') {
      // Удаляем лишние пробелы по краям строки
      const trimmed = data.trim();
      // Дополнительно можно заменить множественные пробелы внутри строки на один пробел
      return trimmed;
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRequestData(item));
  }

  // Handle objects
  const sanitized = { ...data };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // First trim to remove excess whitespace, then sanitize to prevent XSS
      const trimmedValue = value.trim();
      // Предотвращаем XSS, кодируя специальные символы HTML
      sanitized[key] = trimmedValue
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestData(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Preserve number and boolean values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Класс для работы с API
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private pendingRequests: RequestMap = {};
  private options: Required<ApiClientOptions>;

  /**
   * Создает новый экземпляр API-клиента
   * @param options - опции для клиента
   */
  constructor(options: ApiClientOptions = {}) {
    this.options = {
      baseURL: API_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {},
      unauthorizedRedirect: true,
      withCredentials: true,
      requiresAuth: false,
      ...options,
    };

    // Проверяем, нужно ли игнорировать SSL сертификаты
    const ignoreSSL = env.ignoreSsl;
    if (ignoreSSL) {
      logger.warn('⚠️ SSL certificate validation disabled for development');
    }

    const createAxiosDefaults: CreateAxiosDefaults = {
      baseURL: this.options.baseURL,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        ...this.options.headers,
      },
      withCredentials: this.options.withCredentials,
      proxy: false, // Отключаем прокси для прямого соединения
    };
    if (ignoreSSL) {
      createAxiosDefaults.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    this.axiosInstance = axios.create(createAxiosDefaults);

    // Добавляем перехватчики запросов
    this.setupInterceptors();

    // Add debug log for development
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`API configured for: ${this.options.baseURL}`);
    }
  }

  /**
   * Настраивает перехватчики запросов и ответов
   */
  private setupInterceptors(): void {
    // Перехватчик запросов для добавления токена и управления отменой
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Пробрасываем выбранный пользователем часовой пояс
        try {
          const tz =
            typeof window !== 'undefined'
              ? localStorage.getItem('app.timezone')
              : null;
          if (tz && config.headers) {
            (config.headers as any)['X-Client-Timezone'] = tz;
          } else if (
            config.headers &&
            !(config.headers as any)['X-Client-Timezone']
          ) {
            (config.headers as any)['X-Client-Timezone'] =
              Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          }
        } catch {}
        // Добавляем токен авторизации если требуется
        if (this.options.requiresAuth) {
          let token = this.getAuthToken();
          // Автообновление истёкшего токена
          try {
            if (token && isJwtExpired(token)) {
              if (isDevelopment)
                logger.info('🔄 Access token expired, trying to refresh');
              const refreshed = await this.tryRefreshTokens();
              if (refreshed) {
                token = refreshed;
              } else {
                // Перечитываем токен из хранилища на случай очистки внутри tryRefreshTokens
                token = this.getAuthToken();
              }
            }
          } catch (e) {
            // Если рефреш не удался — дадим 401 обработать ниже
            if (isDevelopment)
              logger.warn('⚠️ Token refresh failed before request', e);
            // Синхронизируем локальную переменную токена после возможной очистки
            token = this.getAuthToken();
          }
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
            if (process.env.NODE_ENV !== 'production') {
              logger.debug('🔐 Добавляем токен в заголовок для:', config.url);
            }
          } else {
            logger.warn(
              '⚠️ Токен не найден для авторизованного запроса:',
              config.url
            );
          }
        }

        // Санитизация данных запроса для предотвращения XSS
        if (config.data) {
          config.data = sanitizeRequestData(config.data);
        }

        // Для GET запросов не используем отмену дубликатов — избегаем ложных ошибок при параллельных загрузках
        const method = (config.method || 'GET').toUpperCase();
        if (method !== 'GET') {
          // Создаем ключ для запроса
          const requestKey = this.getRequestKey(config);

          // Отменяем предыдущий запрос с таким же ключом
          if (this.pendingRequests[requestKey]) {
            logger.debug(
              '🔄 Отменяем предыдущий дублированный запрос:',
              requestKey
            );
            this.cancelPendingRequest(requestKey);
          }

          // Создаем новый токен отмены для запроса
          const source = axios.CancelToken.source();
          config.cancelToken = source.token;
          this.pendingRequests[requestKey] = source;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Перехватчик ответов для обработки ошибок
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Удаляем запрос из списка ожидающих после успешного ответа (для non-GET)
        if (
          response.config &&
          response.config.method &&
          response.config.method.toUpperCase() !== 'GET'
        ) {
          const requestKey = this.getRequestKey(response.config);
          delete this.pendingRequests[requestKey];
        }

        return response;
      },
      async (error: any) => {
        // Удаляем запрос из списка ожидающих в случае ошибки (для non-GET)
        if (
          error.config &&
          error.config.method &&
          error.config.method.toUpperCase() !== 'GET'
        ) {
          const requestKey = this.getRequestKey(error.config);
          delete this.pendingRequests[requestKey];
        }

        // Игнорируем ошибки отмены запроса и не показываем их пользователю
        if (axios.isCancel(error)) {
          // Тихо возвращаем исходную отмену без формирования ApiError, чтобы не шуметь в UI
          return Promise.reject(error);
        }

        // Попытка авто-рефреша по факту 401
        if (error.response?.status === 401 && this.options.requiresAuth) {
          try {
            if (isDevelopment)
              logger.info('🔄 Got 401, trying to refresh and retry');
            const newToken = await this.tryRefreshTokens();
            if (newToken && error.config?.headers) {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshErr) {
            if (isDevelopment)
              logger.warn('❌ Refresh on 401 failed', refreshErr);
          }
          // Если обновить не удалось — выполняем централизованный выход
          this.handleUnauthorized();
        }

        // Мягкий редирект при 403 для защищённых разделов (напр. /admin)
        if (error.response?.status === 403 && this.options.requiresAuth) {
          try {
            if (typeof window !== 'undefined') {
              const path = window.location.pathname || '';
              // Если пользователь находится в админском разделе, отправляем на дашборд
              if (path.startsWith('/admin')) {
                window.location.replace('/dashboard');
              }
            }
          } catch {}
        }

        return Promise.reject(this.handleError(error as AxiosError));
      }
    );
  }

  /**
   * Пытается обновить токен доступа через refresh_token
   * Возвращает новый access_token или null
   */
  private async tryRefreshTokens(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const previousAccessToken = tokenStorage.getAccessToken();
      const prevClaims: any = previousAccessToken
        ? decodeJWT(previousAccessToken)
        : null;

      const response = await axios.post<{
        access_token: string;
        refresh_token?: string;
      }>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      );
      const { access_token, refresh_token } =
        response.data || (response as any).data || {};
      if (access_token) tokenStorage.setAccessToken(access_token);
      if (refresh_token) tokenStorage.setRefreshToken(refresh_token);

      // Проверяем, не изменились ли критичные клеймы
      if (access_token) {
        const newClaims: any = decodeJWT(access_token);
        try {
          if (prevClaims && newClaims) {
            const prevUserId = prevClaims.sub || prevClaims.userId;
            const newUserId = newClaims.sub || newClaims.userId;
            const prevRole = prevClaims.role || prevClaims.roles?.[0];
            const newRole = newClaims.role || newClaims.roles?.[0];

            if (prevUserId && newUserId && prevUserId !== newUserId) {
              logger.warn('⚠️ Обнаружена смена пользователя после refresh', {
                prevUserId,
                newUserId,
              });
            }
            if (prevRole && newRole && prevRole !== newRole) {
              logger.warn('⚠️ Обнаружена смена роли после refresh', {
                prevRole,
                newRole,
              });
              // Сообщаем приложению о смене роли
              if (typeof window !== 'undefined') {
                const evt = new CustomEvent('authRoleChanged', {
                  detail: { prevRole, newRole },
                });
                window.dispatchEvent(evt);
                // Если потеряли права администратора, покинем админку
                const path = window.location.pathname || '';
                if (path.startsWith('/admin') && newRole !== 'ADMIN') {
                  window.location.replace('/dashboard');
                }
              }
            }
          }
        } catch {}
      }
      return access_token || null;
    } catch (e) {
      // На неуспех — очищаем локальные токены и выполняем централизованный выход
      try {
        tokenStorage.clearAll();
      } catch {}
      // Немедленный редирект на /login
      this.handleUnauthorized();
      return null;
    }
  }

  /**
   * Создает уникальный ключ для запроса с учетом метода, URL и важных параметров
   * @param config - конфигурация запроса
   * @returns уникальный ключ запроса
   */
  private getRequestKey(config: AxiosRequestConfig): string {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';

    // Создаем более детальный ключ, включающий метод и основные параметры
    return `${method}:${url}:${params}`;
  }

  /**
   * Отменяет ожидающий запрос по ключу
   * @param key - ключ запроса
   */
  private cancelPendingRequest(key: string): void {
    if (this.pendingRequests[key]) {
      this.pendingRequests[key].cancel('Отменено из-за дублирования запроса');
      delete this.pendingRequests[key];
    }
  }

  /**
   * Отменяет все ожидающие запросы
   */
  public cancelAllRequests(): void {
    for (const key in this.pendingRequests) {
      this.pendingRequests[key].cancel('Отменено пользователем');
      delete this.pendingRequests[key];
    }
  }

  /**
   * Обрабатывает случай неавторизованного доступа
   */
  private handleUnauthorized(): void {
    // Очищаем данные авторизации
    if (typeof window !== 'undefined') {
      try {
        tokenStorage.clearAll();
        // user/account список оставляем — это ответственность accountManager
      } catch {}

      // Перенаправление на страницу входа, если не на странице авторизации
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        // Сохраняем путь для редиректа после авторизации
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = '/login';
      }
    }
  }

  /**
   * Обработка ошибок с детальной информацией
   */
  private async handleError(error: AxiosError): Promise<ApiError> {
    let errorMessage = 'Произошла неизвестная ошибка';

    logger.warn('Получена ошибка API:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers,
      },
      message: error.message,
      code: error.code,
      name: error.name,
    });

    // Обработка CORS ошибок и ошибок сети
    if (error.message === 'Network Error') {
      logger.error('Вероятная ошибка CORS или сетевая проблема:', error);
      return new ApiError(
        'Ошибка соединения с сервером. Возможно, проблема с CORS настройками или сетевое соединение прервано.',
        {
          isNetworkError: true,
          originalError: error,
        }
      );
    }

    if (error.response) {
      // Ошибка запроса с ответом сервера
      const { status, data } = error.response;

      logger.debug('Детали ответа с ошибкой:', {
        status,
        statusText: error.response.statusText,
        data,
        headers: error.response.headers,
      });

      // Если токен истек или невалиден
      if (status === 401 && this.options.unauthorizedRedirect) {
        this.handleUnauthorized();
        return new ApiError('Сессия истекла. Пожалуйста, войдите снова.', {
          status,
          originalError: error,
        });
      }

      // Если превышен лимит запросов
      if (status === 429) {
        return new ApiError(
          'Слишком много запросов. Пожалуйста, попробуйте позже.',
          {
            status,
            originalError: error,
          }
        );
      }

      // Обработка ошибок валидации (чаще всего код 400)
      if (status === 400) {
        if (typeof data === 'object' && data !== null) {
          // Детально обрабатываем объект ошибки
          const errors: Record<string, string[]> = {};
          let errorMessages: string[] = [];

          // Проверяем на наличие массива сообщений
          if ('message' in data) {
            if (Array.isArray(data.message)) {
              // Удаляем дубликаты в массиве сообщений
              errorMessages = Array.from(new Set(data.message));
            } else if (typeof data.message === 'string') {
              errorMessages = [data.message];
            }
          }

          // Проверяем на наличие объекта errors с детализированными ошибками валидации
          if ('errors' in data && typeof data.errors === 'object') {
            for (const [field, messages] of Object.entries(data.errors)) {
              if (Array.isArray(messages)) {
                errors[field] = Array.from(new Set(messages)); // Удаляем дубликаты
              } else if (typeof messages === 'string') {
                errors[field] = [messages];
              }
            }
          }

          // Проверяем на наличие валидационных ошибок напрямую в объекте
          if (
            'validationErrors' in data &&
            typeof data.validationErrors === 'object'
          ) {
            for (const [field, messages] of Object.entries(
              data.validationErrors
            )) {
              if (Array.isArray(messages)) {
                errors[field] = Array.from(new Set(messages)); // Удаляем дубликаты
              } else if (typeof messages === 'string') {
                errors[field] = [messages];
              }
            }
          }

          if (errorMessages.length > 0 || Object.keys(errors).length > 0) {
            let finalMessage = 'Ошибки валидации';

            if (errorMessages.length > 0) {
              finalMessage = errorMessages.join('; ');
            }

            return new ApiError(finalMessage, {
              status,
              isValidationError: true,
              validationErrors: errors,
              errorMessages,
              originalError: error,
              originalData: data,
            });
          }
        }

        errorMessage =
          typeof data === 'string' ? data : 'Ошибка валидации данных';
      } else if (status === 403) {
        errorMessage = 'У вас нет прав для выполнения этого действия';
      } else if (status === 404) {
        errorMessage = 'Запрашиваемый ресурс не найден';
      } else if (status === 500) {
        errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже';
      } else if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data
      ) {
        errorMessage =
          typeof data.message === 'string' ? data.message : errorMessage;
      } else if (typeof data === 'string') {
        errorMessage = data;
      }

      return new ApiError(errorMessage, {
        status,
        originalError: error,
        originalData: data,
      });
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен
      logger.error('Запрос сделан, но ответ не получен:', error.request);
      return new ApiError(
        'Сервер не отвечает. Проверьте подключение к интернету.',
        {
          isNetworkError: true,
          originalError: error,
        }
      );
    } else {
      // Что-то еще пошло не так
      logger.error('Неизвестная ошибка при настройке запроса:', error.message);
      return new ApiError(error.message || errorMessage, {
        originalError: error,
      });
    }
  }

  /**
   * Получает токен авторизации из localStorage
   * @returns токен или null
   */
  private getAuthToken(): string | null {
    const token = tokenStorage.getAccessToken();
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(
        '🔑 Получение токена:',
        token ? 'токен найден' : 'токен отсутствует'
      );
    }
    return token;
  }

  /**
   * Извлекает данные из ответа API
   * @param response - ответ от сервера
   * @returns данные из ответа
   */
  private extractData<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
    const responseData = response.data;

    // Проверяем, является ли ответ объектом ApiResponse
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'data' in responseData &&
      'success' in responseData
    ) {
      // Это ApiResponse, извлекаем data
      return (responseData as ApiResponse<T>).data;
    }

    // Это прямые данные
    return responseData as T;
  }

  public async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return {
        ...response,
        data: this.extractData(response) as T,
      };
    } catch (error) {
      throw error; // Ошибка уже обработана в перехватчике
    }
  }

  public async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return {
        ...response,
        data: this.extractData(response) as T,
      };
    } catch (error) {
      throw error; // Ошибка уже обработана в перехватчике
    }
  }

  public async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return {
        ...response,
        data: this.extractData(response) as T,
      };
    } catch (error) {
      throw error; // Ошибка уже обработана в перехватчике
    }
  }

  public async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return {
        ...response,
        data: this.extractData(response) as T,
      };
    } catch (error) {
      throw error; // Ошибка уже обработана в перехватчике
    }
  }

  public async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return {
        ...response,
        data: this.extractData(response) as T,
      };
    } catch (error) {
      throw error; // Ошибка уже обработана в перехватчике
    }
  }

  /**
   * Устанавливает токен авторизации
   * @param token - токен авторизации
   */
  public setAuthToken(token: string | null): void {
    tokenStorage.setAccessToken(token);
  }

  /**
   * Изменяет базовый URL API
   * @param baseURL - новый базовый URL
   */
  public setBaseURL(baseURL: string): void {
    this.options.baseURL = baseURL;
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Изменяет таймаут запросов
   * @param timeout - новый таймаут в миллисекундах
   */
  public setTimeout(timeout: number): void {
    this.options.timeout = timeout;
    this.axiosInstance.defaults.timeout = timeout;
  }

  /**
   * Возвращает заголовки для отключения кеширования
   */
  public static getNoCacheHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  }
}

// Создаем и экспортируем готовые к использованию экземпляры API клиентов
export const publicApi = new ApiClient({
  requiresAuth: false,
  unauthorizedRedirect: false,
});

export const privateApi = new ApiClient({
  requiresAuth: true,
  unauthorizedRedirect: true,
});

export const authApi = new ApiClient({
  requiresAuth: false,
  unauthorizedRedirect: false,
});

// Экспортируем также базовые экземпляры для обратной совместимости
export default ApiClient;
