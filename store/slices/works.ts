import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from '@reduxjs/toolkit';
import { workService } from '../../services/work';
import {
  Work,
  WorkWithHistory,
  CreateWorkDto,
  UpdateWorkDto,
  WorkHistory,
} from '../../types/work';
import { Role } from '../../types/user';

// Типы состояния
interface WorksState {
  works: Work[];
  userWorks: Work[];
  currentWork: WorkWithHistory | null;
  isLoading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: WorksState = {
  works: [],
  userWorks: [],
  currentWork: null,
  isLoading: false,
  error: null,
};

/**
 * Обработчик ошибок для thunks
 */
const handleThunkError = (error: unknown, defaultMessage: string): string => {
  // Ошибки протаскиваем в state, лишние логи не нужны

  // Игнорируем отмененные запросы
  if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
    // тихий skip
    throw new Error('REQUEST_CANCELLED'); // Прокидываем специальную ошибку
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
};

// Асинхронные thunks
export const fetchAllWorks = createAsyncThunk(
  'works/fetchAll',
  async ({ role }: { role: Role }, { rejectWithValue }) => {
    try {
      return await workService.getAll(role);
    } catch (error) {
      // Проверяем на отмененный запрос
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос всех работ был отменен, возвращаем пустой массив');
        return []; // Возвращаем пустой массив для отмененных запросов
      }
      return rejectWithValue(
        handleThunkError(error, 'Не удалось загрузить работы')
      );
    }
  }
);

export const fetchUserWorks = createAsyncThunk(
  'works/fetchUserWorks',
  async (
    { role, userId }: { role: Role; userId: string },
    { rejectWithValue }
  ) => {
    try {
      return await workService.getByUserId(role, userId);
    } catch (error) {
      // Проверяем на отмененный запрос
      if (error instanceof Error && error.message === 'REQUEST_CANCELLED') {
        console.log(
          'Запрос работ пользователя был отменен, возвращаем пустой массив'
        );
        return []; // Возвращаем пустой массив для отмененных запросов
      }
      return rejectWithValue(
        handleThunkError(error, 'Не удалось загрузить работы пользователя')
      );
    }
  }
);

export const fetchUserWorksWithDuties = createAsyncThunk(
  'works/fetchUserWorksWithDuties',
  async (
    { role, userId }: { role: Role; userId: string },
    { rejectWithValue }
  ) => {
    try {
      return await workService.getByUserId(role, userId);
    } catch (error) {
      return rejectWithValue(
        handleThunkError(
          error,
          'Не удалось загрузить работы с обязанностями пользователя'
        )
      );
    }
  }
);

export const fetchWorkById = createAsyncThunk(
  'works/fetchById',
  async (
    { role, workId }: { role: Role; workId: string },
    { rejectWithValue }
  ) => {
    try {
      return await workService.getById(role, workId);
    } catch (error) {
      return rejectWithValue(
        handleThunkError(error, 'Не удалось загрузить работу')
      );
    }
  }
);

export const createWork = createAsyncThunk(
  'works/create',
  async (
    { role, data }: { role: Role; data: CreateWorkDto },
    { rejectWithValue }
  ) => {
    try {
      return await workService.create(role, data);
    } catch (error) {
      return rejectWithValue(
        handleThunkError(error, 'Не удалось создать работу')
      );
    }
  }
);

export const updateWork = createAsyncThunk(
  'works/update',
  async (
    { role, id, data }: { role: Role; id: string; data: UpdateWorkDto },
    { rejectWithValue }
  ) => {
    try {
      return await workService.update(role, id, data);
    } catch (error) {
      return rejectWithValue(
        handleThunkError(error, 'Не удалось обновить работу')
      );
    }
  }
);

// Удалены расширенные операции: на бэкенде нет /works/extended

// Вспомогательная функция для добавления обработчиков стандартных асинхронных операций
const addLoadingStateHandlers = <T>(
  builder: ActionReducerMapBuilder<WorksState>,
  thunk: any,
  fulfilledHandler: (state: WorksState, action: PayloadAction<T>) => void
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
    addLoadingStateHandlers<Work[]>(
      builder,
      fetchUserWorks,
      (state, action) => {
        state.userWorks = action.payload;
      }
    );

    // Обработчики для загрузки работ пользователя с обязанностями
    addLoadingStateHandlers<Work[]>(
      builder,
      fetchUserWorksWithDuties,
      (state, action) => {
        state.userWorks = action.payload;
      }
    );

    // Обработчики для загрузки работы по ID
    addLoadingStateHandlers<WorkWithHistory>(
      builder,
      fetchWorkById,
      (state, action) => {
        state.currentWork = action.payload;
      }
    );

    // Обработчики для создания работы
    addLoadingStateHandlers<Work>(builder, createWork, (state, action) => {
      state.works.push(action.payload);
    });

    // Обработчики для обновления работы
    addLoadingStateHandlers<WorkHistory>(
      builder,
      updateWork,
      (state, action) => {
        // Обновляем работу в массиве всех работ - создаем Work объект из WorkHistory
        const workFromHistory: Work = {
          id: action.payload.workId,
          name: action.payload.name,
          responsibleUserId: action.payload.responsibleUserId,
          salary: action.payload.salary,
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
      }
    );

    // Удалены обработчики createWorkExtended/updateWorkExtended
  },
});

export const {} = worksSlice.actions;
export default worksSlice.reducer;
