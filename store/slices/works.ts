import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from '@reduxjs/toolkit';
import { workService } from '../../services/work';
import { Work, WorkWithHistory, CreateWorkDto, UpdateWorkDto, WorkHistory } from '../../types/work';
import { Role } from '../../types/user';

// Типы состояния
interface WorksState {
  works: Work[];
  userWorks: Work[];
  archivedWorks: Work[];
  currentWork: WorkWithHistory | null;
  isLoading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: WorksState = {
  works: [],
  userWorks: [],
  archivedWorks: [],
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

// Асинхронные thunks
export const fetchAllWorks = createAsyncThunk(
  'works/fetchAll',
  async (_: void, { rejectWithValue }) => {
    try {
      return await workService.getAll();
    } catch (error) {
      // Проверяем на отмененный запрос
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        return []; // Возвращаем пустой массив для отмененных запросов
      }
      return rejectWithValue(handleThunkError(error, 'Не удалось загрузить работы'));
    }
  },
);

export const fetchUserWorks = createAsyncThunk(
  'works/fetchUserWorks',
  async ({ role, userId }: { role: Role; userId: string }, { rejectWithValue }) => {
    try {
      return await workService.getByUserDuties(userId);
    } catch (error) {
      // Проверяем на отмененный запрос
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        return []; // Возвращаем пустой массив для отмененных запросов
      }
      return rejectWithValue(handleThunkError(error, 'Не удалось загрузить работы пользователя'));
    }
  },
);

export const fetchArchivedWorks = createAsyncThunk(
  'works/fetchArchived',
  async (_: void, { rejectWithValue }) => {
    try {
      return await workService.getArchived();
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        return [];
      }
      return rejectWithValue(handleThunkError(error, 'Не удалось загрузить архивные работы'));
    }
  },
);

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
  async ({ role, workId }: { role: Role; workId: string }, { rejectWithValue }) => {
    try {
      return await workService.getById(workId);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось загрузить работу'));
    }
  },
);

export const createWork = createAsyncThunk(
  'works/create',
  async ({ role, data }: { role: Role; data: CreateWorkDto }, { rejectWithValue }) => {
    try {
      return await workService.create(data);
    } catch (error) {
      return rejectWithValue(handleThunkError(error, 'Не удалось создать работу'));
    }
  },
);

export const updateWork = createAsyncThunk(
  'works/update',
  async (
    { role, id, data }: { role: Role; id: string; data: UpdateWorkDto },
    { rejectWithValue },
  ) => {
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
    // Обработчики для загрузки всех работ
    addLoadingStateHandlers<Work[]>(builder, fetchAllWorks, (state, action) => {
      state.works = action.payload;
    });

    // Обработчики для загрузки работ пользователя
    addLoadingStateHandlers<Work[]>(builder, fetchUserWorks, (state, action) => {
      state.userWorks = action.payload;
    });

    // Обработчики для загрузки архивных работ
    addLoadingStateHandlers<Work[]>(builder, fetchArchivedWorks, (state, action) => {
      state.archivedWorks = action.payload;
    });

    // Обработчики для архивации работы
    addLoadingStateHandlers<Work>(builder, archiveWork, (state, action) => {
      const archivedWork = action.payload;
      // Убираем из активных списков
      state.works = state.works.filter((w) => w.id !== archivedWork.id);
      state.userWorks = state.userWorks.filter((w) => w.id !== archivedWork.id);
      // Добавляем в архивные
      state.archivedWorks = [{ ...archivedWork, isArchived: true }, ...state.archivedWorks];
      // Обновляем currentWork если открыта эта работа
      if (state.currentWork?.id === archivedWork.id) {
        state.currentWork = { ...state.currentWork, isArchived: true };
      }
    });

    // Обработчики для восстановления работы
    addLoadingStateHandlers<Work>(builder, restoreWork, (state, action) => {
      const restoredWork = action.payload;
      // Убираем из архивных
      state.archivedWorks = state.archivedWorks.filter((w) => w.id !== restoredWork.id);
      // Добавляем в активные
      state.works = [{ ...restoredWork, isArchived: false }, ...state.works];
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
      state.works.push(action.payload);
    });

    // Обработчики для обновления работы
    addLoadingStateHandlers<WorkHistory>(builder, updateWork, (state, action) => {
      // Обновляем работу в массиве всех работ - создаем Work объект из WorkHistory
      const workFromHistory: Work = {
        id: action.payload.workId,
        name: action.payload.name,
        responsibleUserId: action.payload.responsibleUserId,
        salary: action.payload.salary,
        currency: action.payload.currency || 'RUB',
        releaseDate: action.payload.effectiveDate,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        updatedAt: action.payload.updatedAt,
      };

      const index = state.works.findIndex((w) => w.id === workFromHistory.id);
      if (index !== -1) {
        state.works[index] = workFromHistory;
      }

      // Обновляем детальную информацию о работе,
      // сохраняя всю существующую информацию, включая историю
      if (state.currentWork && state.currentWork.id === workFromHistory.id) {
        // Тщательно сохраняем все существующие поля и обновляем только измененные
        state.currentWork = {
          ...state.currentWork,
          name: workFromHistory.name,
          responsibleUserId: workFromHistory.responsibleUserId,
          salary: workFromHistory.salary,
          updatedAt: workFromHistory.updatedAt,
        };

        // тихо обновляем
      }
    });

    // Удалены обработчики createWorkExtended/updateWorkExtended
  },
});

export const {} = worksSlice.actions;
export default worksSlice.reducer;
