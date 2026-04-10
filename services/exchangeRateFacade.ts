/**
 * Фасад для работы с котировками валют
 * Объединяет все сервисы в единый интерфейс
 * Следует принципам SOLID, DRY, KISS
 * 
 * Facade Pattern: упрощает работу с комплексной системой
 * Single Responsibility: предоставляет единый интерфейс
 * Dependency Inversion: зависит от абстракций
 */

import { ExchangeRateService } from './exchangeRateService';
import { indexedDBStorage } from '../storage/indexedDBStorage';
import { cbrProvider } from '../providers/cbrProvider';
import { exchangeRateWorkingDaysService } from './exchangeRateWorkingDays.service';
import { ExchangeRateDate, ExchangeRateDates } from '../utils/exchangeRateDate';

/**
 * Основной фасад для работы с котировками
 */
export class ExchangeRateFacade {
  private exchangeRateService: ExchangeRateService;

  constructor() {
    // Инициализируем сервис с зависимостями
    this.exchangeRateService = new ExchangeRateService(
      indexedDBStorage,
      cbrProvider,
      exchangeRateWorkingDaysService
    );
  }

  /**
   * Получает последнюю доступную котировку валюты
   */
  async getLatestRate(currencyCode: string) {
    const result = await this.exchangeRateService.getLatestRate(currencyCode);
    
    if (result.found) {
      return {
        currencyCode: result.rate!.currencyCode,
        rate: result.rate!.rate,
        nominal: result.rate!.nominal,
        date: result.rate!.date,
        createdAt: result.rate!.createdAt,
        updatedAt: result.rate!.updatedAt
      };
    }
    
    return null;
  }

  /**
   * Получает котировку на конкретную дату
   */
  async getRate(currencyCode: string, date: string | Date) {
    const exchangeDate = typeof date === 'string' 
      ? ExchangeRateDates.fromString(date)
      : ExchangeRateDates.fromDate(date);
    
    return this.exchangeRateService.getRate(currencyCode, exchangeDate);
  }

  /**
   * Проверяет актуальность данных и загружает недостающие
   */
  async smartUpdate(currencyCode: string = 'USD') {
    const result = await this.exchangeRateService.smartUpdate(currencyCode);
    
    console.log(`🔄 Умное обновление ${currencyCode}:`, {
      needed: result.needsUpdate,
      loaded: result.loaded,
      failed: result.failed.length,
      reason: result.reason
    });
    
    return result;
  }

  /**
   * Принудительное обновление данных
   */
  async forceUpdate(currencyCode: string = 'USD', daysBack: number = 60) {
    const result = await this.exchangeRateService.forceUpdate(currencyCode, daysBack);
    
    console.log(`🔄 Принудительное обновление ${currencyCode}:`, {
      loaded: result.loaded,
      failed: result.failed.length
    });
    
    return result;
  }

  /**
   * Получает информацию о кеше
   */
  async getCacheInfo() {
    return this.exchangeRateService.getCacheStats();
  }

  /**
   * Очищает кеш
   */
  async clearCache() {
    await this.exchangeRateService.clearCache();
    console.log('🗑️ Кеш очищен');
  }

  /**
   * Проверяет, является ли день рабочим
   */
  isWorkingDay(date: string | Date) {
    const exchangeDate = typeof date === 'string' 
      ? ExchangeRateDates.fromString(date)
      : ExchangeRateDates.fromDate(date);
    
    return exchangeRateWorkingDaysService.isWorkingDay(exchangeDate);
  }

  /**
   * Получает последний рабочий день
   */
  getLastWorkingDay() {
    return exchangeRateWorkingDaysService.getLastWorkingDay().toDate();
  }

  /**
   * Получает отладочную информацию
   */
  async getDebugInfo(currencyCode: string = 'USD') {
    return this.exchangeRateService.getDebugInfo(currencyCode);
  }

  /**
   * Получает отладочную информацию о рабочих днях
   */
  getWorkingDaysDebugInfo(date?: string | Date) {
    const targetDate = date 
      ? (typeof date === 'string' ? ExchangeRateDates.fromString(date) : ExchangeRateDates.fromDate(date))
      : ExchangeRateDates.today();
    
    return exchangeRateWorkingDaysService.getDebugInfo(targetDate);
  }

  /**
   * Тестирует логику рабочих дней ЦБ РФ
   */
  testWorkingDays() {
    console.log('📅 Тест рабочих дней ЦБ РФ (выходные: ВС+ПН, рабочие: ВТ-СБ):');
    const days = ['ВОСКР', 'ПОНЕД', 'ВТОРН', 'СРЕДА', 'ЧЕТВ', 'ПЯТН', 'СУББ'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(2025, 7, 25 + i); // 25-31 августа 2025
      const isWorking = this.isWorkingDay(date);
      const dayName = days[date.getDay()];
      const dayNum = date.getDay();
      
      console.log(`${dayNum}: ${dayName} (${new ExchangeRateDate(date).value}) = ${isWorking ? '✅ РАБОЧИЙ ЦБ' : '❌ ВЫХОДНОЙ ЦБ'}`);
    }
    console.log('🏦 Логика ЦБ РФ: Воскресенье(0) и Понедельник(1) - выходные, Вторник(2)-Суббота(6) - рабочие');
  }

  /**
   * Получает поддерживаемые валюты
   */
  getSupportedCurrencies() {
    return cbrProvider.getSupportedCurrencies();
  }
}

/**
 * Синглтон фасада
 */
export const exchangeRateFacade = new ExchangeRateFacade();
