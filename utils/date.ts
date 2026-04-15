export {
  formatDateForDisplay,
  formatDateToISO,
  getCurrentDateISO,
  isValidRussianDateFormat,
  shiftDateISOByDays,
  toDateObject,
} from './DateManager';

/** Пробелы и типографское тире (U+2014) между датами диапазона; не ASCII «-». */
export const DATE_RANGE_SEPARATOR = ` \u2014 `;
