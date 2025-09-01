/**
 * Провайдер данных от ЦБ РФ
 * Реализует интерфейс IExchangeRateProvider
 * Следует принципам SOLID, DRY, KISS
 * 
 * Single Responsibility: только получение данных от API ЦБ
 * Open/Closed: легко расширяется новыми методами API
 * Liskov Substitution: реализует интерфейс IExchangeRateProvider
 * Interface Segregation: четкий интерфейс для работы с API
 * Dependency Inversion: зависит от интерфейсов
 */

import { IExchangeRateProvider, IExchangeRate } from '../services/exchangeRateService';
import { ExchangeRateDate } from '../utils/exchangeRateDate';

/**
 * Интерфейс ответа от API ЦБ
 */
interface ICBRApiResponse {
  Date: string;
  PreviousDate: string;
  PreviousURL: string;
  Timestamp: string;
  Valute: {
    [key: string]: {
      ID: string;
      NumCode: string;
      CharCode: string;
      Nominal: number;
      Name: string;
      Value: number;
      Previous: number;
    };
  };
}

/**
 * Конфигурация провайдера ЦБ
 */
const CBR_CONFIG = {
  baseUrl: 'https://www.cbr-xml-daily.ru',
  endpoints: {
    daily: '/daily_json.js',
    archive: '/archive/{year}/{month:02d}/{day:02d}/daily_json.js'
  },
  supportedCurrencies: ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'],
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

/**
 * Провайдер данных от ЦБ РФ
 */
export class CBRExchangeRateProvider implements IExchangeRateProvider {
  /**
   * Получает котировки на указанную дату
   */
  async fetchRates(date: ExchangeRateDate): Promise<IExchangeRate[]> {
    const url = this.buildApiUrl(date);
    console.log(`📡 Запрос к ЦБ РФ: ${url}`);

    try {
      const response = await this.fetchWithRetry(url);
      return this.parseApiResponse(response, date);
    } catch (error) {
      console.error(`❌ Ошибка получения данных от ЦБ на ${date.value}:`, error);
      throw new Error(`Failed to fetch rates for ${date.value}: ${error}`);
    }
  }

  /**
   * Получает котировки за диапазон дат
   */
  async fetchRatesRange(startDate: ExchangeRateDate, endDate: ExchangeRateDate): Promise<IExchangeRate[]> {
    const allRates: IExchangeRate[] = [];
    let currentDate = startDate;

    while (!currentDate.isAfter(endDate)) {
      try {
        const rates = await this.fetchRates(currentDate);
        allRates.push(...rates);
      } catch (error) {
        console.warn(`⚠️ Пропускаем ${currentDate.value} из-за ошибки:`, error);
      }
      
      currentDate = currentDate.addDays(1);
    }

    return allRates;
  }

  /**
   * Получает список поддерживаемых валют
   */
  getSupportedCurrencies(): string[] {
    return [...CBR_CONFIG.supportedCurrencies];
  }

  /**
   * Строит URL для API запроса
   */
  private buildApiUrl(date: ExchangeRateDate): string {
    const jsDate = date.toDate();
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();

    // Если дата сегодняшняя, используем текущий endpoint
    const today = new Date();
    if (
      year === today.getFullYear() &&
      month === today.getMonth() + 1 &&
      day === today.getDate()
    ) {
      return `${CBR_CONFIG.baseUrl}${CBR_CONFIG.endpoints.daily}`;
    }

    // Иначе используем архивный endpoint
    const archiveEndpoint = CBR_CONFIG.endpoints.archive
      .replace('{year}', year.toString())
      .replace('{month:02d}', month.toString().padStart(2, '0'))
      .replace('{day:02d}', day.toString().padStart(2, '0'));

    return `${CBR_CONFIG.baseUrl}${archiveEndpoint}`;
  }

  /**
   * Выполняет HTTP запрос с повторными попытками
   */
  private async fetchWithRetry(url: string): Promise<ICBRApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= CBR_CONFIG.retryAttempts; attempt++) {
      try {
        console.log(`📡 Попытка ${attempt}/${CBR_CONFIG.retryAttempts}: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CBR_CONFIG.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as ICBRApiResponse;
        console.log(`✅ Данные получены от ЦБ (попытка ${attempt})`);
        return data;

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Попытка ${attempt} неудачна:`, error);

        if (attempt < CBR_CONFIG.retryAttempts) {
          const delay = CBR_CONFIG.retryDelay * attempt;
          console.log(`⏳ Ожидание ${delay}мс перед следующей попыткой...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Парсит ответ от API ЦБ
   */
  private parseApiResponse(data: ICBRApiResponse, requestedDate: ExchangeRateDate): IExchangeRate[] {
    const rates: IExchangeRate[] = [];
    const apiDate = this.parseApiDate(data.Date);
    const now = new Date().toISOString();

    for (const [currencyCode, currencyData] of Object.entries(data.Valute)) {
      // Проверяем, поддерживается ли валюта
      if (!CBR_CONFIG.supportedCurrencies.includes(currencyCode as any)) {
        continue;
      }

      const rate: IExchangeRate = {
        id: this.generateRateId(currencyCode, apiDate),
        currencyCode,
        rate: currencyData.Value,
        nominal: currencyData.Nominal,
        date: apiDate,
        createdAt: now,
        updatedAt: now
      };

      rates.push(rate);
    }

    console.log(`✅ Обработано ${rates.length} котировок на ${apiDate}`);
    return rates;
  }

  /**
   * Парсит дату из ответа API ЦБ
   */
  private parseApiDate(apiDateString: string): string {
    // API ЦБ возвращает дату в формате "2025-08-30T11:30:00+03:00"
    const date = new Date(apiDateString);
    const exchangeDate = new ExchangeRateDate(date);
    return exchangeDate.value;
  }

  /**
   * Генерирует уникальный ID для котировки
   */
  private generateRateId(currencyCode: string, date: string): string {
    const hash = this.simpleHash(`${currencyCode}_${date}`);
    return `cbr_${currencyCode}_${date.replace(/\./g, '')}_${hash}`;
  }

  /**
   * Простая хеш-функция для генерации ID
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получает информацию о провайдере
   */
  getProviderInfo(): object {
    return {
      name: 'ЦБ РФ',
      baseUrl: CBR_CONFIG.baseUrl,
      supportedCurrencies: this.getSupportedCurrencies(),
      config: {
        timeout: CBR_CONFIG.timeout,
        retryAttempts: CBR_CONFIG.retryAttempts,
        retryDelay: CBR_CONFIG.retryDelay
      }
    };
  }
}

/**
 * Синглтон провайдера ЦБ
 */
export const cbrProvider = new CBRExchangeRateProvider();
