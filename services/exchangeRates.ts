import { privateApi } from './ApiClient';
import {
  ExchangeRate,
  ChartDataPoint,
  CurrencyConversion,
  CurrencyConverterRequest,
} from '../types/exchange-rates';

class ExchangeRatesService {
  private api = privateApi;

  async getExchangeRates(params?: any): Promise<{ data: ExchangeRate[]; total: number }> {
    const response = await this.api.get<{ data: ExchangeRate[]; total: number }>('/exchange-rates', { params });
    
    // Возвращаем данные как есть (строковые даты)
    return response.data;
  }

  // Получение последней котировки для валюты
  async getLatestRate(currencyCode: string): Promise<ExchangeRate | null> {
    const response = await this.api.get<ExchangeRate | null>(`/exchange-rates/latest/${currencyCode}`);
    
    if (!response.data) {
      return null;
    }

    // Возвращаем данные как есть (строковые даты)
    return response.data;
  }

  // Получение данных для графика
  async getChartData(
    currencyCode: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<ChartDataPoint[]> {
    const params: any = {};
    
    if (fromDate) {
      params.fromDate = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    if (toDate) {
      params.toDate = toDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    const response = await this.api.get<ChartDataPoint[]>(
      `/exchange-rates/chart/${currencyCode}`,
      { params, timeout: 120000 }
    );

    // Обрабатываем данные для графика
    return response.data.map(point => ({
      ...point,
      displayRate: point.rate / point.nominal, // Рассчитываем курс за единицу валюты
    }));
  }



  // Получение списка доступных валют
  async getAvailableCurrencies(): Promise<string[]> {
    const response = await this.api.get<string[]>('/exchange-rates/currencies');
    return response.data;
  }

  async convertCurrency(request: CurrencyConverterRequest): Promise<CurrencyConversion> {
    const payload = {
      ...request,
      date: request.date?.toISOString(),
    };

    const response = await this.api.post<CurrencyConversion>('/exchange-rates/convert', payload);
    
    // Возвращаем данные как есть (строковые даты)
    return response.data;
  }



  // Административные методы
  async syncCurrentRates(): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/exchange-rates/sync/current');
    return response.data;
  }

  async syncHistoricalRates(fromDate: Date, toDate: Date): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/exchange-rates/sync/historical', {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
    });
    return response.data;
  }

  async initializeHistoricalData(daysBack: number = 365): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/exchange-rates/sync/initialize', {
      daysBack,
    });
    return response.data;
  }

  async getSyncStatus(): Promise<{ lastSyncDate: Date | null }> {
    const response = await this.api.get<{ lastSyncDate: string | null }>('/exchange-rates/sync/status');
    return {
      lastSyncDate: response.data.lastSyncDate ? new Date(response.data.lastSyncDate) : null,
    };
  }

  // Утилитарные методы
  formatRate(rate: number, nominal: number = 1): string {
    const actualRate = rate / nominal;
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(actualRate);
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency === 'RUB' ? 'RUB' : 'USD', // Fallback для неизвестных валют
    }).format(amount);
  }

  calculateRateChange(current: number, previous: number): {
    absolute: number;
    percentage: number;
  } {
    const absolute = current - previous;
    const percentage = previous !== 0 ? (absolute / previous) * 100 : 0;
    
    return { absolute, percentage };
  }

  // Получение исторических данных за период
  async getHistoricalRates(
    currencyCode: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ExchangeRate[]> {
    const result = await this.getExchangeRates({
      currencyCode,
      fromDate,
      toDate,
      limit: 1000, // Достаточно для годовых данных
    });
    return result.data;
  }

  // Получение котировки на конкретную дату
  async getRateByDate(currencyCode: string, date: Date): Promise<ExchangeRate | null> {
    const result = await this.getExchangeRates({
      currencyCode,
      fromDate: date,
      toDate: date,
      limit: 1,
    });

    return result.data.length > 0 ? result.data[0] : null;
  }
}

export const exchangeRatesService = new ExchangeRatesService();
export default exchangeRatesService;
