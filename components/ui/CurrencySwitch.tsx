'use client';

import React from 'react';

interface CurrencySwitchProps {
  value: 'RUB' | 'USD';
  onChange: (value: 'RUB' | 'USD') => void;
  size?: 'sm' | 'md';
  className?: string;
}

export default function CurrencySwitch({
  value,
  onChange,
  size = 'md',
  className = '',
}: CurrencySwitchProps) {
  const isUSD = value === 'USD';

  const containerBase =
    'inline-flex items-stretch rounded-md border bg-white overflow-hidden select-none';
  const containerSize = size === 'sm' ? 'h-6 text-[11px]' : 'h-8 text-sm';
  const containerColor = 'border-gray-300';

  const segmentBase = 'px-3 flex items-center justify-center transition-colors';
  const segmentSize = size === 'sm' ? 'px-2' : 'px-3';

  return (
    <div
      className={`${containerBase} ${containerSize} ${containerColor} ${className}`}
      role="group"
      aria-label="Выбор валюты"
    >
      <button
        type="button"
        className={`${segmentBase} ${segmentSize} ${!isUSD ? 'bg-primary-200 text-black' : 'text-gray-700 hover:bg-gray-50'}`}
        aria-pressed={!isUSD}
        onClick={() => onChange('RUB')}
      >
        RUB
      </button>
      <button
        type="button"
        className={`${segmentBase} ${segmentSize} ${isUSD ? 'bg-primary-200 text-black' : 'text-gray-700 hover:bg-gray-50'}`}
        aria-pressed={isUSD}
        onClick={() => onChange('USD')}
      >
        USD
      </button>
    </div>
  );
}
