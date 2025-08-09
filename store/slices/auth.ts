import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/auth';
import { AuthState, LoginDto, RegisterDto } from '../../types/auth';
import { User } from '../../types/user';
import { updateUserProfile } from './users';

// Начальное состояние
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Асинхронные thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginDto, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Не удалось войти');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterDto, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Не удалось зарегистрироваться');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = authService.getToken();
      if (!token) {
        return rejectWithValue('Токен не найден');
      }

      const user = await authService.getCurrentUser();
      return { user, token };
    } catch (error: any) {
      // При ошибке получения текущего пользователя, очищаем токен
      // токен будет очищен централизованно через ApiClient/tryRefreshTokens при 401
      return rejectWithValue(
        error.message || 'Не удалось получить текущего пользователя'
      );
    }
  }
);

// Слайс
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Логин
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.access_token;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Регистрация
    builder.addCase(register.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.access_token;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    });

    // Получение текущего пользователя
    builder.addCase(getCurrentUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getCurrentUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    });
    builder.addCase(getCurrentUser.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload as string;
    });

    // Обработка обновления профиля пользователя в auth slice
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      // Если обновился текущий пользователь, обновляем его в auth state
      if (state.user && state.user.id === action.payload.id) {
        state.user = { ...state.user, ...action.payload };
      }
    });
  },
});

export const { logout, setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;
