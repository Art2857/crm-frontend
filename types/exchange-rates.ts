export interface ExchangeRate {
  id: string;
  currencyCode: string;
  rate: number;
  nominal: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}



export interface ChartDataPoint {
  date: string;
  rate: number;
  nominal: number;
  displayRate?: number; // rate / nominal для отображения
}

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  result: number;
  date: string;
}



export interface CurrencyConverterRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date?: Date;
}






