import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userService } from '../../services/user';
import { User, UserWithHistory } from '../../types/user';

interface UsersState {
  users: User[];
  currentUser: UserWithHistory | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
};

interface GetAllUsersParams {
  archivingStatus?: 'archived' | 'actual';
  search?: string;
  role?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'name';
  orderDirection?: 'asc' | 'desc';
}

// Асинхронные thunks
export const fetchAllUsers = createAsyncThunk(
  'users/fetchAll',
  async (
    { roleFilter, ...restParams }: { roleFilter?: string } & GetAllUsersParams,
    { rejectWithValue },
  ) => {
    try {
      const params: any = { ...restParams };
      if (roleFilter) params.role = roleFilter;
      const users = await userService.getAllUsers(params as any);
      return users;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        // Возвращаем пустой массив вместо ошибки для отмененных запросов
        return [];
      }
      return rejectWithValue(error.message || 'Не удалось загрузить пользователей');
    }
  },
);

export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async ({ id }: { id: string }, { rejectWithValue }) => {
    try {
      return await userService.getById(id);
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        // Возвращаем null для отмененных запросов
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось загрузить пользователя');
    }
  },
);

export const updateUserProfile = createAsyncThunk(
  'users/updateProfile',
  async ({ userId, data }: { userId: string; data: any }, { rejectWithValue }) => {
    try {
      const user = await userService.updateProfile(userId, data);
      return user;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось обновить профиль пользователя');
    }
  },
);

export const updateUserSensitiveData = createAsyncThunk(
  'users/updateSensitiveData',
  async ({ userId, data }: { userId: string; data: any }, { rejectWithValue }) => {
    try {
      const user = await userService.updateSensitiveData(userId, data);
      return user;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось обновить данные пользователя');
    }
  },
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: any, { rejectWithValue }) => {
    try {
      const user = await userService.createUser(userData);
      return user;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        return null;
      }

      // Более детальная обработка ошибок

      // Проверка на валидационные ошибки с детальной структурой
      if (error.isValidationError) {
        // Если ошибка уже отформатирована как строка с ошибками валидации, используем её
        if (error.message.includes('Ошибки валидации:')) {
          return rejectWithValue(error.message);
        }

        // Если есть структурированные ошибки валидации, форматируем их
        if (error.validationErrors && Object.keys(error.validationErrors).length > 0) {
          const fieldErrors: string[] = [];

          for (const [field, messages] of Object.entries(error.validationErrors)) {
            // Избегаем дублирования сообщений, проверяя, является ли messages массивом или строкой
            if (Array.isArray(messages)) {
              // Получаем уникальные сообщения из массива, удаляя дубликаты
              const uniqueMessages = Array.from(new Set(messages as string[]));
              fieldErrors.push(`${field}: ${uniqueMessages.join(', ')}`);
            } else if (typeof messages === 'string') {
              fieldErrors.push(`${field}: ${messages}`);
            }
          }

          if (fieldErrors.length > 0) {
            return rejectWithValue(`Ошибки валидации:\n${fieldErrors.join('\n')}`);
          }
        }

        // Если у нас есть общие ошибки
        if (error.errorMessages && error.errorMessages.length > 0) {
          // Получаем уникальные сообщения
          const uniqueMessages = Array.from(new Set(error.errorMessages));
          return rejectWithValue(`Ошибки валидации:\n${uniqueMessages.join('\n')}`);
        }

        // Если ничего из вышеперечисленного не сработало, используем общее сообщение
        return rejectWithValue(error.message);
      }

      // Если есть структурированное сообщение об ошибке, используем его
      if (error.response && error.response.data) {
        const responseData = error.response.data;

        if (Array.isArray(responseData.message)) {
          return rejectWithValue(responseData.message.join('\n'));
        } else if (typeof responseData.message === 'string') {
          return rejectWithValue(responseData.message);
        }
      }

      // Если нет структурированного сообщения, используем общее сообщение
      return rejectWithValue(error.message || 'Не удалось создать пользователя');
    }
  },
);

export const fetchUserHistory = createAsyncThunk(
  'users/fetchHistory',
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      const userWithHistory = await userService.getUserHistory(userId);
      return userWithHistory;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        // тихий skip
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось загрузить историю пользователя');
    }
  },
);

// Слайс
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    // Загрузка всех пользователей
    builder.addCase(fetchAllUsers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllUsers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.users = action.payload;
    });
    builder.addCase(fetchAllUsers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Загрузка пользователя по ID
    builder.addCase(fetchUserById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserById.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.currentUser = action.payload;
      }
    });
    builder.addCase(fetchUserById.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Обновление профиля
    builder.addCase(updateUserProfile.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null && state.currentUser) {
        const updatedUser = action.payload;
        state.currentUser = {
          ...state.currentUser,
          ...updatedUser,
        };
        state.users = state.users.map((user) =>
          user.id === updatedUser.id ? { ...user, ...updatedUser } : user,
        );
      }
    });
    builder.addCase(updateUserProfile.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Обновление конфиденциальных данных
    builder.addCase(updateUserSensitiveData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateUserSensitiveData.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null && state.currentUser) {
        const updatedUser = action.payload;
        state.currentUser = {
          ...state.currentUser,
          ...updatedUser,
        };
        state.users = state.users.map((user) =>
          user.id === updatedUser.id ? { ...user, ...updatedUser } : user,
        );
      }
    });
    builder.addCase(updateUserSensitiveData.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Создание пользователя
    builder.addCase(createUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createUser.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.users.push(action.payload);
      }
    });
    builder.addCase(createUser.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка истории пользователя
    builder.addCase(fetchUserHistory.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserHistory.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.currentUser = action.payload;
      }
    });
    builder.addCase(fetchUserHistory.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });
  },
});

export const { clearCurrentUser } = usersSlice.actions;
export default usersSlice.reducer;
