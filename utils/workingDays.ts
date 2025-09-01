/**
 * @deprecated Этот файл больше не используется
 * 
 * Используйте вместо него специализированные файлы:
 * - salary-working-days.ts - для расчета зарплаты (пн-пт)
 * - cbr-working-days.ts - для котировок ЦБ РФ (вт-сб)
 * 
 * Или импортируйте из services/index.ts
 */

// Перенаправления для обратной совместимости
export { 
  getSalaryWorkingDaysInPeriod as getWorkingDaysInPeriod,
  getSalaryWorkingDaysInMonth as getWorkingDaysInMonth,
  isSalaryWorkingDay,
  getLastSalaryWorkingDay
} from './salary-working-days';

export {
  isCBRWorkingDay as isWorkingDay,
  getLastCBRWorkingDay as getLastWorkingDay  
} from './cbr-working-days';