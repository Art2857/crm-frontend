import { privateApi } from './ApiClient';
import {
  WorkIncome,
  CreateWorkIncomeRequest,
  UpdateWorkIncomeRequest,
  WorkIncomeFilters,
  WorkIncomeListResponse,
  WorkIncomeStats,
  WorkIncomeApiResponse,
  WorkIncomeListApiResponse,
  WorkIncomeStatsApiResponse,
} from '../types/work-income';
import { getCurrentDateISO } from '../utils/date';

class WorkIncomeService {
  private api = privateApi;

  /**
   * Создать новую запись о доходе работы
   */
  async createWorkIncome(data: CreateWorkIncomeRequest): Promise<WorkIncome> {
    const response = await this.api.post<WorkIncome>('/work-income', data);
    return response.data;
  }

  /**
   * Получить запись о доходе по ID
   */
  async getWorkIncomeById(id: string): Promise<WorkIncome> {
    const response = await this.api.get<WorkIncome>(`/work-income/${id}`);
    return response.data;
  }

  /**
   * Получить список записей о доходах с фильтрацией и пагинацией
   */
  async getWorkIncomes(filters: WorkIncomeFilters = {}): Promise<WorkIncomeListResponse> {
    const params = this.buildQueryParams(filters);
    const response = await this.api.get<WorkIncomeListResponse>('/work-income', { params });
    return response.data;
  }

  /**
   * Получить все записи о доходах для конкретной работы
   */
  async getWorkIncomesByWorkId(workId: string): Promise<WorkIncome[]> {
    const response = await this.api.get<WorkIncome[]>(`/work-income/work/${workId}`);
    return response.data;
  }

  /**
   * Получить статистику по доходам работы
   */
  async getWorkIncomeStats(workId: string): Promise<WorkIncomeStats> {
    const response = await this.api.get<WorkIncomeStats>(`/work-income/work/${workId}/stats`);
    return response.data;
  }

  /**
   * Обновить запись о доходе
   */
  async updateWorkIncome(id: string, data: UpdateWorkIncomeRequest): Promise<WorkIncome> {
    const response = await this.api.put<WorkIncome>(`/work-income/${id}`, data);
    return response.data;
  }

  /**
   * Удалить запись о доходе
   */
  async deleteWorkIncome(id: string): Promise<void> {
    await this.api.delete(`/work-income/${id}`);
  }

  /**
   * Обновить курсы валют для всех записей о доходах работы
   */
  async refreshCurrencyConversions(workId: string): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>(
      `/work-income/work/${workId}/refresh-conversions`,
    );
    return response.data;
  }

  /**
   * Построить параметры запроса из фильтров
   */
  private buildQueryParams(filters: WorkIncomeFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.workId) {
      params.workId = filters.workId;
    }

    if (filters.currency) {
      params.currency = filters.currency;
    }

    if (filters.fromDate) {
      params.fromDate = filters.fromDate;
    }

    if (filters.toDate) {
      params.toDate = filters.toDate;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.limit) {
      params.limit = filters.limit;
    }

    if (filters.sortBy) {
      params.sortBy = filters.sortBy;
    }

    if (filters.sortOrder) {
      params.sortOrder = filters.sortOrder;
    }

    return params;
  }

  /**
   * Валидировать данные создания записи о доходе
   */
  validateCreateData(data: CreateWorkIncomeRequest): string[] {
    const errors: string[] = [];

    if (!data.workId || data.workId.trim() === '') {
      errors.push('ID работы обязателен');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Сумма должна быть больше 0');
    }

    if (!data.currency || !['RUB', 'USD'].includes(data.currency)) {
      errors.push('Валюта должна быть RUB или USD');
    }

    if (!data.receivedDate || data.receivedDate.trim() === '') {
      errors.push('Дата поступления обязательна');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.receivedDate)) {
        errors.push('Дата должна быть в формате YYYY-MM-DD');
      } else {
        const date = new Date(data.receivedDate);
        if (isNaN(date.getTime())) {
          errors.push('Некорректная дата');
        }
      }
    }

    if (data.description && data.description.length > 500) {
      errors.push('Описание не должно превышать 500 символов');
    }

    return errors;
  }

  /**
   * Валидировать данные обновления записи о доходе
   */
  validateUpdateData(data: UpdateWorkIncomeRequest): string[] {
    const errors: string[] = [];

    if (data.amount !== undefined && data.amount <= 0) {
      errors.push('Сумма должна быть больше 0');
    }

    if (data.currency !== undefined && !['RUB', 'USD'].includes(data.currency)) {
      errors.push('Валюта должна быть RUB или USD');
    }

    if (data.receivedDate !== undefined) {
      if (data.receivedDate.trim() === '') {
        errors.push('Дата поступления не может быть пустой');
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.receivedDate)) {
          errors.push('Дата должна быть в формате YYYY-MM-DD');
        } else {
          const date = new Date(data.receivedDate);
          if (isNaN(date.getTime())) {
            errors.push('Некорректная дата');
          }
        }
      }
    }

    if (data.description !== undefined && data.description.length > 500) {
      errors.push('Описание не должно превышать 500 символов');
    }

    return errors;
  }

  /**
   * Форматировать сумму для отображения
   */
  formatAmount(amount: number, currency: 'RUB' | 'USD'): string {
    const symbol = currency === 'RUB' ? '₽' : '$';
    return (
      new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: currency === 'RUB' ? 0 : 2,
        maximumFractionDigits: currency === 'RUB' ? 0 : 2,
      }).format(amount) + ` ${symbol}`
    );
  }

  /**
   * Форматировать дату для отображения
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Форматировать курс обмена для отображения
   */
  formatExchangeRate(rate: number, fromCurrency: 'RUB' | 'USD', toCurrency: 'RUB' | 'USD'): string {
    const formattedRate = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(rate);

    const fromSymbol = fromCurrency === 'RUB' ? '₽' : '$';
    const toSymbol = toCurrency === 'RUB' ? '₽' : '$';

    return `1 ${fromSymbol} = ${formattedRate} ${toSymbol}`;
  }

  /**
   * Получить текущую дату в формате YYYY-MM-DD
   */
  getCurrentDate(): string {
    return getCurrentDateISO();
  }

  /**
   * Получить дату N дней назад в формате YYYY-MM-DD
   */
  getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Проверить, является ли дата валидной
   */
  isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }
}

export const workIncomeService = new WorkIncomeService();
export default workIncomeService;
