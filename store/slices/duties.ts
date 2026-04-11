import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dutyService } from '../../services/duty';
import { Duty, Distribution, DistributionWithDetails } from '../../types/duty';
import { Role } from '../../types/user';

interface DutiesState {
  duties: Duty[];
  currentDuty: Duty | null;
  distributions: Distribution[];
  currentDistribution: DistributionWithDetails | null;
  workDistributions: DistributionWithDetails[] | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DutiesState = {
  duties: [],
  currentDuty: null,
  distributions: [],
  currentDistribution: null,
  workDistributions: null,
  isLoading: false,
  error: null,
};

// Асинхронные thunks для обязанностей
export const fetchAllDuties = createAsyncThunk(
  'duties/fetchAll',
  async ({ role }: { role: Role }, { rejectWithValue }) => {
    try {
      const duties = await dutyService.getAll();
      return duties;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        return [];
      }
      return rejectWithValue(error.message || 'Не удалось загрузить обязанности');
    }
  },
);

export const fetchDutyById = createAsyncThunk(
  'duties/fetchById',
  async ({ role, dutyId }: { role: Role; dutyId: string }, { rejectWithValue }) => {
    try {
      const duty = await dutyService.getById(dutyId);
      return duty;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось загрузить обязанность');
    }
  },
);

export const createDuty = createAsyncThunk(
  'duties/create',
  async ({ role, data }: { role: Role; data: any }, { rejectWithValue }) => {
    try {
      const duty = await dutyService.create(data);
      return duty;
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос создания обязанности был отменен, игнорируем ошибку');
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось создать обязанность');
    }
  },
);

export const updateDuty = createAsyncThunk(
  'duties/update',
  async ({ role, id, data }: { role: Role; id: string; data: any }, { rejectWithValue }) => {
    try {
      return await dutyService.update(id, data);
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос обновления обязанности был отменен, игнорируем ошибку');
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось обновить обязанность');
    }
  },
);

// Удаление обязанности
export const deleteDuty = createAsyncThunk(
  'duties/delete',
  async ({ role, id }: { role: Role; id: string }, { rejectWithValue }) => {
    try {
      await dutyService.delete(id);
      return id;
    } catch (error: any) {
      const err = error instanceof Promise ? await error : error;

      if (err?.message === 'REQUEST_CANCELLED') {
        return rejectWithValue('REQUEST_CANCELLED');
      }

      const status = err?.status ?? err?.response?.status ?? err?.originalStatus;

      const serverMessage = err?.response?.data?.message ?? err?.data?.message;

      const apiMessage = err?.message as string | undefined;

      let message =
        (Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage) ||
        apiMessage ||
        'Не удалось удалить обязанность';

      if (status === 400) {
        message = 'Нельзя удалить: обязанность используется в распределениях';
      }

      return rejectWithValue(message);
    }
  },
);

// Асинхронные thunks для распределений
export const fetchAllDistributions = createAsyncThunk(
  'duties/fetchAllDistributions',
  async ({ role }: { role: Role }, { rejectWithValue }) => {
    try {
      return await dutyService.getAllDistributions();
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос распределений был отменен, игнорируем ошибку');
        return [];
      }
      return rejectWithValue(error.message || 'Не удалось загрузить распределения');
    }
  },
);

export const fetchWorkDistributions = createAsyncThunk(
  'duties/fetchWorkDistributions',
  async ({ role, workHistoryId }: { role: Role; workHistoryId: string }, { rejectWithValue }) => {
    try {
      const distribution = await dutyService.getDistributionsByWorkHistoryId(workHistoryId);
      // Возвращаем массив с одним элементом или пустой массив
      return distribution ? [distribution] : [];
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос распределений работы был отменен, игнорируем ошибку');
        return [];
      }
      return rejectWithValue(error.message || 'Не удалось загрузить распределения для работы');
    }
  },
);

export const fetchDistributionById = createAsyncThunk(
  'duties/fetchDistributionById',
  async ({ role, id }: { role: Role; id: string }, { rejectWithValue }) => {
    try {
      return await dutyService.getDistributionById(id);
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос распределения по ID был отменен, игнорируем ошибку');
        return null;
      }
      return rejectWithValue(error.message || 'Не удалось загрузить распределение');
    }
  },
);

export const createDistribution = createAsyncThunk(
  'duties/createDistribution',
  async (
    {
      role,
      ...data
    }: {
      role: Role;
      workHistoryId: string;
      details: any[];
      effectiveDate?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      return await dutyService.createDistribution(data);
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос создания распределения был отменен, игнорируем ошибку');
        return null;
      }

      // Сохраняем детали ошибки валидации, если они есть
      if (
        error.isValidationError &&
        (error.validationErrors || error.details || error.errorMessages)
      ) {
        // Сохраняем полную структуру ошибки для последующей обработки
        return rejectWithValue({
          message: error.message || 'Ошибка валидации данных',
          validationErrors: error.validationErrors || {},
          details: error.details || [],
          errorMessages: error.errorMessages || [],
          formattedMessage: error.formattedMessage || null,
          isValidationError: true,
        });
      }

      // Проверяем, содержит ли ошибка структурированную информацию
      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Попытка извлечь структурированные данные об ошибке
        const errorDetails = {
          message: errorData.message || error.message || 'Не удалось создать распределение',
          details: errorData.details || [],
          statusCode: errorData.statusCode || error.status || 400,
          isValidationError: !!errorData.validationErrors,
          validationErrors: errorData.errors || {},
          errorMessages: Array.isArray(errorData.message) ? errorData.message : [errorData.message],
        };

        return rejectWithValue(errorDetails);
      }

      // Обычная ошибка
      return rejectWithValue(error.message || 'Не удалось создать распределение');
    }
  },
);

export const updateDistribution = createAsyncThunk(
  'duties/updateDistribution',
  async (
    {
      role,
      workHistoryId,
      details,
      effectiveDate,
    }: {
      role: Role;
      workHistoryId: string;
      details: any[];
      effectiveDate?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      return await dutyService.updateDistribution(workHistoryId, {
        details,
        effectiveDate,
      });
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос обновления распределения был отменен, игнорируем ошибку');
        return null;
      }

      // Сохраняем детали ошибки валидации, если они есть
      if (
        error.isValidationError &&
        (error.validationErrors || error.details || error.errorMessages)
      ) {
        // Сохраняем полную структуру ошибки для последующей обработки
        return rejectWithValue({
          message: error.message || 'Ошибка валидации данных',
          validationErrors: error.validationErrors || {},
          details: error.details || [],
          errorMessages: error.errorMessages || [],
          formattedMessage: error.formattedMessage || null,
          isValidationError: true,
        });
      }

      // Проверяем, содержит ли ошибка структурированную информацию
      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Попытка извлечь структурированные данные об ошибке
        const errorDetails = {
          message: errorData.message || error.message || 'Не удалось обновить распределение',
          details: errorData.details || [],
          statusCode: errorData.statusCode || error.status || 400,
          isValidationError: !!errorData.validationErrors,
          validationErrors: errorData.errors || {},
          errorMessages: Array.isArray(errorData.message) ? errorData.message : [errorData.message],
        };

        return rejectWithValue(errorDetails);
      }

      // Обычная ошибка
      return rejectWithValue(error.message || 'Не удалось обновить распределение');
    }
  },
);

// Новый thunk для загрузки всех распределений по workId
export const fetchDistributionsByWorkId = createAsyncThunk(
  'duties/fetchDistributionsByWorkId',
  async ({ role, workId }: { role: Role; workId: string }, { rejectWithValue }) => {
    try {
      return await dutyService.getDistributionsByWorkId(workId);
    } catch (error: any) {
      // Игнорируем отмененные запросы
      if (error.message === 'REQUEST_CANCELLED') {
        console.log('Запрос распределений по работе был отменен, игнорируем ошибку');
        return [];
      }
      return rejectWithValue(error.message || 'Не удалось загрузить распределения для работы');
    }
  },
);

// Слайс
const dutiesSlice = createSlice({
  name: 'duties',
  initialState,
  reducers: {
    clearCurrentDuty: (state) => {
      state.currentDuty = null;
    },
    clearWorkDistributions: (state) => {
      state.workDistributions = null;
    },
  },
  extraReducers: (builder) => {
    // Загрузка всех обязанностей
    builder.addCase(fetchAllDuties.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllDuties.fulfilled, (state, action) => {
      state.isLoading = false;
      state.duties = action.payload;
    });
    builder.addCase(fetchAllDuties.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка обязанности по ID
    builder.addCase(fetchDutyById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDutyById.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.currentDuty = action.payload;
      }
    });
    builder.addCase(fetchDutyById.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Создание обязанности
    builder.addCase(createDuty.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createDuty.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.duties.push(action.payload);
      }
    });
    builder.addCase(createDuty.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Обновление обязанности
    builder.addCase(updateDuty.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateDuty.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        const updatedDuty = action.payload;
        state.duties = state.duties.map((duty) =>
          duty.id === updatedDuty.id ? updatedDuty : duty,
        );
        if (state.currentDuty && state.currentDuty.id === updatedDuty.id) {
          state.currentDuty = updatedDuty;
        }
      }
    });
    builder.addCase(updateDuty.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка всех распределений
    builder.addCase(fetchAllDistributions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllDistributions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.distributions = action.payload;
    });
    builder.addCase(fetchAllDistributions.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка распределений работы
    builder.addCase(fetchWorkDistributions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchWorkDistributions.fulfilled, (state, action) => {
      state.isLoading = false;

      // Убедимся, что распределения отсортированы по дате в порядке убывания
      const sortedDistributions = [...action.payload].sort(
        (a, b) => new Date(b.workHistory.date).getTime() - new Date(a.workHistory.date).getTime(),
      );

      state.workDistributions = sortedDistributions;
    });
    builder.addCase(fetchWorkDistributions.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка распределения по ID
    builder.addCase(fetchDistributionById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDistributionById.fulfilled, (state, action) => {
      state.isLoading = false;
      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        state.currentDistribution = action.payload;
      }
    });
    builder.addCase(fetchDistributionById.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Создание распределения
    builder.addCase(createDistribution.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createDistribution.fulfilled, (state, action) => {
      state.isLoading = false;

      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        // Добавляем новое распределение в список, если список распределений
        // для текущей работы уже загружен
        if (
          state.workDistributions &&
          state.workDistributions.length > 0 &&
          state.workDistributions[0].workHistory.workId === action.payload.workHistory.workId
        ) {
          // Добавляем новое распределение
          state.workDistributions.push(action.payload);

          // Сортируем распределения по дате в порядке убывания
          state.workDistributions.sort(
            (a, b) =>
              new Date(b.workHistory.date).getTime() - new Date(a.workHistory.date).getTime(),
          );
        }
      }
    });
    builder.addCase(createDistribution.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Обновление распределения
    builder.addCase(updateDistribution.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateDistribution.fulfilled, (state, action) => {
      state.isLoading = false;

      // Игнорируем null результаты от отмененных запросов
      if (action.payload !== null) {
        const updatedDistribution = action.payload;
        // Если массив распределений загружен
        if (state.workDistributions && state.workDistributions.length > 0) {
          // Находим индекс распределения, которое было обновлено
          const updatedIndex = state.workDistributions.findIndex(
            (dist) => dist.workHistory.id === updatedDistribution.workHistory.id,
          );

          if (updatedIndex !== -1) {
            // Заменяем обновленное распределение
            state.workDistributions[updatedIndex] = updatedDistribution;
          } else {
            // Если не нашли распределение, добавляем новое в начало списка
            state.workDistributions.unshift(updatedDistribution);
          }

          // Сортируем распределения по дате в порядке убывания для поддержания порядка
          state.workDistributions.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
      }
    });
    builder.addCase(updateDistribution.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Загрузка распределений по workId
    builder.addCase(fetchDistributionsByWorkId.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDistributionsByWorkId.fulfilled, (state, action) => {
      state.isLoading = false;

      // Убедимся, что распределения отсортированы по дате в порядке убывания
      const sortedDistributions = [...action.payload].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      state.workDistributions = sortedDistributions;
    });
    builder.addCase(fetchDistributionsByWorkId.rejected, (state, action) => {
      state.isLoading = false;
      // Игнорируем REQUEST_CANCELLED ошибки
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });

    // Удаление обязанности
    builder.addCase(deleteDuty.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteDuty.fulfilled, (state, action) => {
      state.isLoading = false;
      const deletedId = action.payload as string;
      state.duties = state.duties.filter((d) => d.id !== deletedId);
      if (state.currentDuty?.id === deletedId) {
        state.currentDuty = null;
      }
    });
    builder.addCase(deleteDuty.rejected, (state, action) => {
      state.isLoading = false;
      if (action.payload !== 'REQUEST_CANCELLED') {
        state.error = action.payload as string;
      }
    });
  },
});

export const { clearCurrentDuty, clearWorkDistributions } = dutiesSlice.actions;
export default dutiesSlice.reducer;
