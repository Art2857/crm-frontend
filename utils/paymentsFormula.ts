import { CurrencyType, formatCurrency } from './payments';

export type DutyFormulaView = {
  left: string;
  op?: '×' | '÷';
  rateText?: string;
  right: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatRate(r: number | null | undefined) {
  return r == null ? '…' : r.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function formatCurrencySmart(amount: number, currency: CurrencyType) {
  const abs = Math.abs(amount);
  const fraction = Math.abs(abs - Math.trunc(abs));
  const hasFraction = fraction > 1e-9;

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function buildDutyFormulaView(params: {
  monthlyAmount: number;
  calculatedAmount: number;
  dutyCurrency: CurrencyType;
  days: number;
  monthDays: number;
  displayCurrency: CurrencyType;
  rate?: number | null;
}): DutyFormulaView {
  const { monthlyAmount, calculatedAmount, dutyCurrency, days, monthDays, displayCurrency, rate } =
    params;

  const left = `${formatCurrency(monthlyAmount || 0, dutyCurrency)} × ${days || 0}/${monthDays || 0}`;

  // same currency
  if (displayCurrency === dutyCurrency) {
    return { left, right: formatCurrency(calculatedAmount || 0, dutyCurrency) };
  }

  const rateRounded = typeof rate === 'number' ? round2(rate) : null;
  const base = Number(calculatedAmount) || 0;

  const op: '×' | '÷' = dutyCurrency === 'USD' && displayCurrency === 'RUB' ? '×' : '÷';

  // if no rate, still show structure
  if (rateRounded === null) {
    return {
      left,
      op,
      rateText: '…',
      right: formatCurrencySmart(base, displayCurrency),
    };
  }

  const converted = op === '×' ? base * rateRounded : base / rateRounded;

  return {
    left,
    op,
    rateText: formatRate(rateRounded),
    right: formatCurrencySmart(converted, displayCurrency),
  };
}
