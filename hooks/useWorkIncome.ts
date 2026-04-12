import { useState, useEffect, useCallback } from 'react';
import { workIncomeService } from '../services/workIncome';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
  WorkIncomeFilters,
  WorkIncomeState,
  INITIAL_WORK_INCOME_STATE,
  DEFAULT_WORK_INCOME_FILTERS,
} from '../types/work-income';

interface UseWorkIncomeOptions {
  workId?: string;
  autoLoad?: boolean;
}

export const useWorkIncome = (options: UseWorkIncomeOptions = {}) => {
  const { workId, autoLoad = false } = options;

  const [state, setState] = useState<WorkIncomeState>(INITIAL_WORK_INCOME_STATE);

  // Обновление состояния
  const updateState = useCallback((updates: Partial<WorkIncomeState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Очистка сообщений
  const clearMessages = useCallback(() => {
    updateState({ error: null, successMessage: null });
  }, [updateState]);

  // Автозагрузка данных
  useEffect(() => {
    if (autoLoad && workId) {
      loadWorkIncomes();
    }
  }, [workId, autoLoad]);

  // Загрузка списка доходов
  const loadWorkIncomes = useCallback(
    async (filters?: WorkIncomeFilters) => {
      if (!workId) return;

      try {
        updateState({ isLoading: true, error: null });

        const mergedFilters = {
          ...DEFAULT_WORK_INCOME_FILTERS,
          ...state.filters,
          ...filters,
          workId,
        };

        const incomes = await workIncomeService.getWorkIncomesByWorkId(workId);

        updateState({
          incomes,
          filters: mergedFilters,
          isLoading: false,
        });
      } catch (error: any) {
        updateState({
          error: error.message || 'Ошибка при загрузке доходов',
          isLoading: false,
        });
      }
    },
    [workId, state.filters, updateState],
  );

  // Создание нового дохода
  const createIncome = useCallback(
    async (data: CreateWorkIncomeRequest): Promise<WorkIncome | null> => {
      try {
        updateState({ isSubmitting: true, error: null });

        // Валидация
        const validationErrors = workIncomeService.validateCreateData(data);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }

        const newIncome = await workIncomeService.createWorkIncome(data);

        // Обновляем список - используем функциональное обновление
        setState((prevState) => ({
          ...prevState,
          incomes: [newIncome, ...prevState.incomes],
          isSubmitting: false,
          successMessage: 'Запись о доходе успешно создана',
          error: null,
        }));

        return newIncome;
      } catch (error: any) {
        updateState({
          error: error.message || 'Ошибка при создании записи о доходе',
          isSubmitting: false,
        });
        return null;
      }
    },
    [setState, updateState],
  );

  // Обновление дохода
  const updateIncome = useCallback(
    async (id: string, data: UpdateWorkIncomeRequest): Promise<WorkIncome | null> => {
      try {
        updateState({ isSubmitting: true, error: null });

        // Валидация
        const validationErrors = workIncomeService.validateUpdateData(data);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }

        const updatedIncome = await workIncomeService.updateWorkIncome(id, data);

        // Обновляем список - используем функциональное обновление
        setState((prevState) => ({
          ...prevState,
          incomes: prevState.incomes.map((income) => (income.id === id ? updatedIncome : income)),
          selectedIncome:
            prevState.selectedIncome?.id === id ? updatedIncome : prevState.selectedIncome,
          isSubmitting: false,
          successMessage: 'Запись о доходе успешно обновлена',
          error: null,
        }));

        return updatedIncome;
      } catch (error: any) {
        updateState({
          error: error.message || 'Ошибка при обновлении записи о доходе',
          isSubmitting: false,
        });
        return null;
      }
    },
    [updateState, setState],
  );

  // Удаление дохода
  const deleteIncome = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        updateState({ isSubmitting: true, error: null });

        await workIncomeService.deleteWorkIncome(id);

        // Обновляем список - используем функциональное обновление
        setState((prevState) => ({
          ...prevState,
          incomes: prevState.incomes.filter((income) => income.id !== id),
          selectedIncome: prevState.selectedIncome?.id === id ? null : prevState.selectedIncome,
          isSubmitting: false,
          successMessage: 'Запись о доходе успешно удалена',
          error: null,
        }));

        return true;
      } catch (error: any) {
        updateState({
          error: error.message || 'Ошибка при удалении записи о доходе',
          isSubmitting: false,
        });
        return false;
      }
    },
    [updateState, setState],
  );

  // Выбор дохода
  const selectIncome = useCallback(
    (income: WorkIncome | null) => {
      updateState({ selectedIncome: income });
    },
    [updateState],
  );

  // Получение дохода по ID
  const getIncomeById = useCallback(
    async (id: string): Promise<WorkIncome | null> => {
      try {
        updateState({ isLoading: true, error: null });

        const income = await workIncomeService.getWorkIncomeById(id);

        updateState({
          selectedIncome: income,
          isLoading: false,
        });

        return income;
      } catch (error: any) {
        updateState({
          error: error.message || 'Ошибка при загрузке записи о доходе',
          isLoading: false,
        });
        return null;
      }
    },
    [updateState],
  );

  // Обновление фильтров
  const updateFilters = useCallback(
    (newFilters: Partial<WorkIncomeFilters>) => {
      const updatedFilters = { ...state.filters, ...newFilters };
      updateState({ filters: updatedFilters });
    },
    [state.filters, updateState],
  );

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    updateState({ filters: { ...DEFAULT_WORK_INCOME_FILTERS, workId } });
  }, [workId, updateState]);

  // Форматтеры (проксирование из сервиса)
  const formatAmount = useCallback((amount: number, currency: 'RUB' | 'USD') => {
    return workIncomeService.formatAmount(amount, currency);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return workIncomeService.formatDate(dateString);
  }, []);

  const formatExchangeRate = useCallback(
    (rate: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD') => {
      return workIncomeService.formatExchangeRate(rate, fromCurrency, toCurrency);
    },
    [],
  );

  // Получение текущей даты
  const getCurrentDate = useCallback(() => {
    return workIncomeService.getCurrentDate();
  }, []);

  // Вычисляемые значения
  const totalIncomes = state.incomes.length;
  const totalAmountRub = state.incomes
    .filter((income) => income.currency === 'RUB')
    .reduce((sum, income) => sum + income.amount, 0);
  const totalAmountUsd = state.incomes
    .filter((income) => income.currency === 'USD')
    .reduce((sum, income) => sum + income.amount, 0);

  return {
    // Состояние
    ...state,

    // Вычисляемые значения
    totalIncomes,
    totalAmountRub,
    totalAmountUsd,

    // Действия
    loadWorkIncomes,
    createIncome,
    updateIncome,
    deleteIncome,
    selectIncome,
    getIncomeById,
    updateFilters,
    resetFilters,
    clearMessages,

    // Форматтеры
    formatAmount,
    formatDate,
    formatExchangeRate,
    getCurrentDate,

    // Утилиты
    updateState,
  };
};

export default useWorkIncome;
