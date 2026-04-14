import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from '@reduxjs/toolkit';
import { workService } from '../../services/work';
import { Work, WorkWithHistory, CreateWorkDto, UpdateWorkDto } from '../../types/work';

// Типы состояния
interface WorksState {
  currentWork: WorkWithHistory | null;
  isLoading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: WorksState = {
  currentWork: null,
  isLoading: false,
  error: null,
};

/**
 * Обработчик ошибок для thunks
 * @param error - ошибка из catch
 * @param defaultMessage - сообщение по умолчанию (используется как контекст)
 * @returns строка с сообщением об ошибке с контекстом
 */
const handleThunkError = (error: unknown, defaultMessage: string): string => {
  // Ошибки протаскиваем в state, лишние логи не нужны

  // Игнорируем отмененные запросы
  if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
    // тихий skip
    throw new Error('REQUEST_CANCELLED'); // Прокидываем специальную ошибку
  }

  let errorMessage: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Если есть конкретное сообщение от сервера - добавляем контекст
  if (errorMessage && errorMessage !== defaultMessage) {
    return `${defaultMessage}: ${errorMessage}`;
  }

  return defaultMessage;
};

export const archiveWork = createAsyncThunk(
  'works/archive',
  async (id: string, { rejectWithValue }) => {
    try {
      return await workService.archive(id);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось архивировать работу'));
    }
  },
);

export const restoreWork = createAsyncThunk(
  'works/restore',
  async (id: string, { rejectWithValue }) => {
    try {
      return await workService.restore(id);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось восстановить работу'));
    }
  },
);

export const fetchWorkById = createAsyncThunk(
  'works/fetchById',
  async ({ workId }: { workId: string }, { rejectWithValue }) => {
    try {
      return await workService.getById(workId);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось загрузить работу'));
    }
  },
);

export const createWork = createAsyncThunk(
  'works/create',
  async ({ data }: { data: CreateWorkDto }, { rejectWithValue }) => {
    try {
      return await workService.create(data);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось создать работу'));
    }
  },
);

export const updateWork = createAsyncThunk(
  'works/update',
  async ({ id, data }: { id: string; data: UpdateWorkDto }, { rejectWithValue }) => {
    try {
      return await workService.update(id, data);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось обновить работу'));
    }
  },
);

// Удалены расширенные операции: на бэкенде нет /works/extended

// Вспомогательная функция для добавления обработчиков стандартных асинхронных операций
const addLoadingStateHandlers = <T>(
  builder: ActionReducerMapBuilder<WorksState>,
  thunk: any,
  fulfilledHandler: (state: WorksState, action: PayloadAction<T>) => void,
) => {
  builder
    .addCase(thunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state.isLoading = false;
      fulfilledHandler(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
};

// Слайс
const worksSlice = createSlice({
  name: 'works',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Обработчики для архивации работы
    addLoadingStateHandlers<Work>(builder, archiveWork, (state, action) => {
      const archivedWork = action.payload;

      // Обновляем currentWork если открыта эта работа
      if (state.currentWork?.id === archivedWork.id) {
        state.currentWork = { ...state.currentWork, isArchived: true };
      }
    });

    // Обработчики для восстановления работы
    addLoadingStateHandlers<Work>(builder, restoreWork, (state, action) => {
      const restoredWork = action.payload;

      // Обновляем currentWork если открыта эта работа
      if (state.currentWork?.id === restoredWork.id) {
        state.currentWork = { ...state.currentWork, isArchived: false };
      }
    });

    // Обработчики для загрузки работы по ID
    addLoadingStateHandlers<WorkWithHistory>(builder, fetchWorkById, (state, action) => {
      state.currentWork = action.payload;
    });

    // Обработчики для создания работы
    addLoadingStateHandlers<Work>(builder, createWork, (state, action) => {
      if (state.currentWork?.id === action.payload.id) {
        state.currentWork = {
          ...state.currentWork,
          ...action.payload,
        };
      }
    });

    // Обработчики для обновления работы
    addLoadingStateHandlers<Work>(builder, updateWork, (state, action) => {
      if (state.currentWork && state.currentWork.id === action.payload.id) {
        state.currentWork = {
          ...state.currentWork,
          ...action.payload,
        };
      }
    });

    // Удалены обработчики createWorkExtended/updateWorkExtended
  },
});

export const {} = worksSlice.actions;
export default worksSlice.reducer;
