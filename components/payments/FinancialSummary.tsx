"use client";

import React, { useMemo } from "react";
import { formatCurrency } from "../../utils/payments";
import { useCurrencyConversion } from "../../hooks/useCurrencyConversion";

interface FinancialSummaryProps {
  totalAccrued: number;
  totalPaid: number;
  remainingDebt: number;
  overpaidAmount?: number; // base amounts are RUB
  isPaymentDue?: boolean;
  className?: string;
  currency?: "RUB" | "USD"; // display currency
}

export default function FinancialSummary({
  totalAccrued,
  totalPaid,
  remainingDebt,
  overpaidAmount = 0,
  isPaymentDue = false,
  className = "",
  currency = "RUB",
}: FinancialSummaryProps) {
  const { convert } = useCurrencyConversion();

  // Convert base RUB values to display currency
  const display = useMemo(() => {
    const to = currency;
    return {
      accrued: convert(totalAccrued, "RUB", to),
      paid: convert(totalPaid, "RUB", to),
      overpaid: convert(overpaidAmount, "RUB", to),
      remaining: convert(remainingDebt, "RUB", to),
    };
  }, [convert, totalAccrued, totalPaid, overpaidAmount, remainingDebt, currency]);

  return (
    <div className={`grid grid-cols-4 gap-3 text-center ${className}`}>
      <div className="bg-blue-50 rounded-lg p-2">
        <p className="text-xs text-blue-600 font-medium">Начислено</p>
        <p className="text-sm font-bold text-blue-800">
          {formatCurrency(display.accrued, currency)}
        </p>
      </div>
      <div className="bg-green-50 rounded-lg p-2">
        <p className="text-xs text-green-600 font-medium">Выплачено123</p>
        <p className="text-sm font-bold text-green-800">
          {formatCurrency(display.paid, currency)}
        </p>
      </div>
      <div className="bg-yellow-50 rounded-lg p-2">
        <p className="text-xs text-yellow-700 font-medium">Переплата</p>
        <p className="text-sm font-bold text-yellow-800">
          {formatCurrency(display.overpaid, currency)}
        </p>
      </div>
      <div
        className={`rounded-lg p-2 ${remainingDebt > 0 ? "bg-red-50" : "bg-orange-50"
          }`}
      >
        <p
          className={`text-xs font-medium ${remainingDebt > 0 ? "text-red-600" : "text-orange-600"
            }`}
        >
          Остаток
        </p>
        <p
          className={`text-sm font-bold ${remainingDebt > 0 ? "text-red-800" : "text-orange-800"
            }`}
        >
          {formatCurrency(display.remaining, currency)}
        </p>
      </div>
    </div>
  );
}

