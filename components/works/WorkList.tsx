'use client';

import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import CurrencySwitch from '../ui/CurrencySwitch';
import { Work } from '../../types/work';
import { formatCurrency } from '../../utils/currency';
import { formatDateForDisplay } from '../../utils/date';
import { exchangeRateCacheService } from '../../services/exchangeRateCache';
import { formatAmountWithCurrency } from '../../utils/currency';

interface WorkListProps {
  works: Work[];
  getResponsibleName: (work: Work) => string;
  onViewWork: (workId: string) => void;
}

export default function WorkList({
  works,
  getResponsibleName,
  onViewWork,
}: WorkListProps) {
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>({});
  const [displayMap, setDisplayMap] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('workCurrencyPreferences') : null;
      if (raw) {
        setCurrencyMap(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // Compute display amounts per work based on selected currency
  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      const next: Record<string, number> = {};
      for (const w of works || []) {
        const target = (currencyMap[w.id] || 'RUB') as 'RUB' | 'USD';
        const base = Number(w.salary || 0);
        if (!base || target === 'RUB') {
          next[w.id] = base || 0;
          continue;
        }
        try {
          const res = await exchangeRateCacheService.convertCurrencyFast(base, 'RUB', target);
          next[w.id] = res.result;
        } catch {
          next[w.id] = base; // fallback
        }
      }
      if (!cancelled) setDisplayMap(next);
    };
    compute();
    return () => { cancelled = true; };
  }, [works, currencyMap]);

  // Formatting centralized in utils/currency

  const toggleCurrency = (workId: string) => {
    setCurrencyMap((prev) => {
      const current = (prev[workId] || 'RUB') as 'RUB' | 'USD';
      const nextVal = current === 'RUB' ? 'USD' : 'RUB';
      const next = { ...prev, [workId]: nextVal };
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('workCurrencyPreferences') : null;
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[workId] = nextVal;
        localStorage.setItem('workCurrencyPreferences', JSON.stringify(map));
      } catch {}
      return next;
    });
  };
  if (!works || works.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">Нет доступных работ</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Работа
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ответственный
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Стоимость
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Релиз
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {works.map((work) => (
              <tr key={work.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {work.name}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600">
                  {getResponsibleName(work)}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center justify-center space-x-3">
                    <span>
                      {formatAmountWithCurrency(displayMap[work.id] ?? Number(work.salary || 0), ((currencyMap[work.id] || 'RUB') as 'RUB' | 'USD'))}
                    </span>
                    <CurrencySwitch
                      size="sm"
                      value={((currencyMap[work.id] || 'RUB') as 'RUB' | 'USD')}
                      onChange={() => toggleCurrency(work.id)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-600">
                  {formatDateForDisplay(work.releaseDate)}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                  {work.isArchived ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Архив</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Активна</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => onViewWork(work.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all duration-200"
                    aria-label="Открыть"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
