import {
  UpdateProfileDto,
  UpdateSensitiveDataDto,
  User,
  UserWithHistory,
  UserHistory,
} from '../types/user';
import { privateApi, ApiClient } from './ApiClient';
import { USERS_ENDPOINTS, AUTH_ENDPOINTS } from './endpoints';
import { AuthResponse } from '../types/auth';
import { toDateObject } from '../utils/date';
import { logger } from '../utils/logger';

// Интерфейс для создания пользователя
interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  age?: number;
  birthday?: string;
  baseSalary?: number;
  role?: string;
}

interface GetAllUsersParams {
  archivingStatus?: 'archived' | 'actual';
  search?: string;
  role?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'salaryDay' | 'name';
  orderDirection?: 'asc' | 'desc';
}

export const userService = {
  // Получение списка всех пользователей (только для админа)
  getAll: async (
    getAllUsersParams: GetAllUsersParams
  ): Promise<User[]> => {
    try {
      const response = await privateApi.get<User[]>(
        USERS_ENDPOINTS.base,
        {
          headers: ApiClient.getNoCacheHeaders(),
          params: getAllUsersParams,
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  },

  // Алиас для getAll для совместимости с кодом, который использует getAllUsers
  getAllUsers: async (
    getAllUsersParams: GetAllUsersParams
  ): Promise<User[]> => {
    return userService.getAll(getAllUsersParams);
  },

  // Получение одного пользователя по ID
  getById: async (id: string): Promise<UserWithHistory> => {
    try {


      // Делаем запрос к API без параметров в URL, которые могут вызывать проблемы с CORS
      const response = await privateApi.get<UserWithHistory>(
        USERS_ENDPOINTS.byId(id),
        {
          headers: ApiClient.getNoCacheHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Error fetching user with ID ${id}:`, error);
      throw error;
    }
  },

  // Обновление профиля пользователя (неконфиденциальная информация)
  updateProfile: async (
    id: string,
    data: Partial<UpdateProfileDto>
  ): Promise<User> => {
    try {
      // Подготавливаем и санитизируем данные перед отправкой
      const processedData: Record<string, any> = {};

      // Копируем только непустые строковые поля
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;

        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length === 0) continue; // пустые строки не отправляем
          processedData[key] = trimmed;
        } else {
          processedData[key] = value;
        }
      }

      // Преобразуем дату рождения в ISO строку, если она есть
      if (processedData.birthday) {
        const dateObj = toDateObject(processedData.birthday);
        if (dateObj) {
          processedData.birthday = dateObj.toISOString();
        } else {
          // если дата некорректна, удаляем поле, чтобы не сломать валидацию
          delete processedData.birthday;
        }
      }

      // Отправляем запрос на обновление профиля
      const response = await privateApi.patch<User>(
        USERS_ENDPOINTS.profile(id),
        processedData,
        {
          headers: ApiClient.getNoCacheHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Error updating user profile with ID ${id}:`, error);
      throw error;
    }
  },

  // Обновление конфиденциальной информации (только для админа)
  updateSensitiveData: async (
    id: string,
    data: UpdateSensitiveDataDto
  ): Promise<User> => {
    try {
      const response = await privateApi.patch<User>(
        USERS_ENDPOINTS.sensitive(id),
        data,
        {
          headers: ApiClient.getNoCacheHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Error updating sensitive data for user ID ${id}:`, error);
      throw error;
    }
  },

  // Получение истории пользователя
  getUserHistory: async (
    userId: string
  ): Promise<UserWithHistory> => {
    try {
      // Получаем данные пользователя
      const userData = await userService.getById(userId);

      try {
        logger.debug(`Запрос истории пользователя с ID: ${userId}`);

        // Получаем историю пользователя без кеш-параметров в URL
        const historyResponse = await privateApi.get<UserHistory[]>(
          USERS_ENDPOINTS.history(userId),
          {
            headers: ApiClient.getNoCacheHeaders(),
          }
        );

        // Комбинируем данные в один объект
        const userWithHistory: UserWithHistory = {
          ...userData,
          history: historyResponse.data || [],
        };

        return userWithHistory;
      } catch (error) {
        logger.error(
          `Ошибка при загрузке истории пользователя ${userId}:`,
          error
        );
        // Если не удалось загрузить историю, возвращаем пользователя с пустой историей
        return {
          ...userData,
          history: [],
        };
      }
    } catch (error) {
      logger.error(
        `Ошибка при загрузке пользователя и истории ${userId}:`,
        error
      );
      throw error;
    }
  },

  // Создание нового пользователя (только для админа)
  createUser: async (data: CreateUserDto): Promise<User> => {
    try {
      // Если есть токен, используем приватный клиент, чтобы пробросить Authorization
      const response = await privateApi.post<AuthResponse>(
        AUTH_ENDPOINTS.register,
        data
      );
      return response.data.user;
    } catch (error: any) {
      // Подробное логирование для отладки
      logger.error('Ошибка при создании пользователя:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        isValidationError: error.isValidationError,
        validationErrors: error.validationErrors,
        originalData: error.originalData,
      });

      // Проверяем есть ли ответ от сервера
      if (!error.response) {
        throw new Error(
          'Нет ответа от сервера. Проверьте подключение к интернету.'
        );
      }

      // Проверяем ответ на слишком много запросов
      if (error.response.status === 429) {
        throw new Error(
          'Слишком много запросов. Пожалуйста, попробуйте позже.'
        );
      }

      // Структурированная обработка ошибок валидации
      if (error.isValidationError) {
        logger.debug('Обработка ошибки валидации:', error);
        // Если у нас есть детализированные ошибки валидации по полям
        if (
          error.validationErrors &&
          Object.keys(error.validationErrors).length > 0
        ) {
          // Генерируем понятное пользователю сообщение об ошибке
          const formattedErrors = [];

          // Добавляем общее сообщение, если есть
          if (error.errorMessages && error.errorMessages.length > 0) {
            // Удаляем дубликаты
            const uniqueMessages = Array.from(new Set(error.errorMessages));
            formattedErrors.push(...uniqueMessages);
          }

          // Добавляем ошибки по полям
          for (const [field, messages] of Object.entries(
            error.validationErrors
          )) {
            if (field === '_general') continue; // Общие ошибки уже добавлены выше

            // Преобразуем в массив и удаляем дубликаты
            const messageArray = Array.isArray(messages)
              ? messages
              : [messages];
            const uniqueMessages = Array.from(new Set(messageArray)).join(', ');
            formattedErrors.push(`${field}: ${uniqueMessages}`);
          }

          // Создаем читаемое сообщение об ошибке
          if (formattedErrors.length > 0) {
            throw new Error(`Ошибки валидации:\n${formattedErrors.join('\n')}`);
          }
        }

        // Если есть оригинальный объект ответа, используем его
        if (error.originalData && typeof error.originalData === 'object') {
          const data = error.originalData;

          if (Array.isArray(data.message)) {
            throw new Error(`Ошибки валидации:\n${data.message.join('\n')}`);
          } else if (typeof data.message === 'string') {
            throw new Error(data.message);
          }
        }

        // Если нет детализированных ошибок, но есть общее сообщение
        throw error; // Просто прокидываем ошибку с уже форматированным сообщением
      }

      // Особые случаи ошибок
      if (error.response?.status === 409) {
        // Конфликт - обычно, пользователь с таким email уже существует
        throw new Error(`Пользователь с указанным email уже существует.`);
      } else if (error.response?.status === 500) {
        // Внутренняя ошибка сервера - более информативное сообщение
        const errorMessage =
          error.response.data?.message ||
          'Внутренняя ошибка сервера. Обратитесь к администратору.';
        throw new Error(errorMessage);
      }

      // Получаем сообщение из ответа сервера, если есть
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          throw new Error(error.response.data.message.join('\n'));
        } else {
          throw new Error(error.response.data.message);
        }
      }

      // Для всех других случаев
      throw error;
    }
  },
};
