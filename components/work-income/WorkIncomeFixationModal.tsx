'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

import {
  CreateWorkIncomeFixationRequest,
  WorkIncome,
  WorkIncomeFixationPreview,
} from '../../types/work-income';
import { formatAmountWithCurrency } from '../../utils/currency';
import {
  formatDateForDisplay,
  formatDateToISO,
  getCurrentDateISO,
  shiftDateISOByDays,
} from '../../utils/date';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Notification from '../ui/Notification';

interface WorkIncomeFixationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workCurrency: 'RUB' | 'USD';
  currentSalary: number;
  incomeFixationDate?: string;
  hasFixations: boolean;
  defaultEndDate: string;
  isSubmitting?: boolean;
  error?: string | null;
  successMessage?: string | null;
  onClearMessages?: () => void;
  onPreview: (data: CreateWorkIncomeFixationRequest) => Promise<WorkIncomeFixationPreview | null>;
  onSubmit: (data: CreateWorkIncomeFixationRequest) => Promise<void>;
}

const WorkIncomeFixationModal: React.FC<WorkIncomeFixationModalProps> = ({
  isOpen,
  onClose,
  workCurrency,
  currentSalary,
  incomeFixationDate,
  hasFixations,
  defaultEndDate,
  isSubmitting = false,
  error,
  successMessage,
  onClearMessages,
  onPreview,
  onSubmit,
}) => {
  const normalizedDefaultEndDate = formatDateToISO(defaultEndDate);
  const normalizedIncomeFixationDate = formatDateToISO(incomeFixationDate);
  const maxDate = getCurrentDateISO();
  const minEndDate = normalizedIncomeFixationDate
    ? hasFixations
      ? shiftDateISOByDays(normalizedIncomeFixationDate, 1)
      : normalizedIncomeFixationDate
    : '';
  const hasAvailableFixationRange = minEndDate === '' || minEndDate <= maxDate;
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState<WorkIncomeFixationPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setEndDate('');
      setIsPreviewLoading(false);
      return;
    }

    setPreview(null);
    setEndDate(resolveInitialEndDate(normalizedDefaultEndDate, minEndDate, maxDate));
  }, [isOpen, maxDate, minEndDate, normalizedDefaultEndDate]);

  useEffect(() => {
    if (!isOpen || !endDate || !hasAvailableFixationRange) {
      return;
    }

    let isCancelled = false;

    const loadPreview = async () => {
      setIsPreviewLoading(true);
      const nextPreview = await onPreview({ endDate });
      if (!isCancelled) {
        setPreview(nextPreview);
        setIsPreviewLoading(false);
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [endDate, hasAvailableFixationRange, isOpen, onPreview]);

  const expression = useMemo(() => {
    if (!preview) {
      return '';
    }

    if (preview.incomes.length === 0) {
      return formatAmountWithCurrency(0, workCurrency);
    }

    const terms = preview.incomes.map((income) =>
      formatAmountWithCurrency(income.amount, income.currency),
    );
    return `${terms.join(' + ')} = ${formatAmountWithCurrency(preview.fixedAmount, workCurrency)}`;
  }, [preview, workCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endDate) {
      return;
    }

    await onSubmit({ endDate });
  };

  const renderIncomeValue = (income: WorkIncome) => {
    const inWorkCurrency =
      income.currency === workCurrency ? income.amount : (income.convertedAmount ?? income.amount);

    return `${formatAmountWithCurrency(income.amount, income.currency)} -> ${formatAmountWithCurrency(
      inWorkCurrency,
      workCurrency,
    )}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      unstyled
      className="overflow-hidden rounded-2xl bg-transparent shadow-none"
    >
      <div className="w-[min(760px,94vw)] overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-800 shadow-2xl">
        <div className="p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/15 p-2.5">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Зафиксировать поступления</h3>
                <p className="mt-1 text-sm text-blue-100">
                  Период будет закрыт, сумма станет текущим бюджетом работы, а дата фиксации
                  закрепится на выбранном дне.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="modal-scrollbar max-h-[calc(88vh-84px)] overflow-y-auto bg-white p-5">
          {(error || successMessage) && (
            <div className="mb-4">
              <Notification
                successMessage={successMessage || ''}
                errorMessage={error || ''}
                onClearSuccess={onClearMessages || (() => {})}
                onClearError={onClearMessages || (() => {})}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                  Параметры периода
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Текущая дата фиксации
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {normalizedIncomeFixationDate
                        ? formatDateForDisplay(normalizedIncomeFixationDate)
                        : 'Не указана'}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="income-fixation-end-date"
                      className="text-xs font-medium uppercase tracking-wide text-slate-500"
                    >
                      По дату включительно
                    </label>
                    <input
                      id="income-fixation-end-date"
                      type="date"
                      value={endDate}
                      min={minEndDate || undefined}
                      max={maxDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      disabled={isSubmitting || !hasAvailableFixationRange}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  {preview ? (
                    <>
                      Будет зафиксирован период с{' '}
                      <span className="font-semibold">
                        {formatDateForDisplay(preview.startDate)}
                      </span>{' '}
                      по{' '}
                      <span className="font-semibold">{formatDateForDisplay(preview.endDate)}</span>
                      .
                    </>
                  ) : !hasAvailableFixationRange ? (
                    <>
                      На текущий момент новых дней для фиксации нет. Следующий период можно будет
                      закрыть начиная с{' '}
                      <span className="font-semibold">{formatDateForDisplay(minEndDate)}</span>.
                    </>
                  ) : (
                    <>Подготовка периода фиксации...</>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <CurrencyDollarIcon className="h-5 w-5 text-emerald-700" />
                  Итог фиксации
                </div>

                {isPreviewLoading && !preview ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
                  </div>
                ) : preview ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Новая сумма работы
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-950">
                        {formatAmountWithCurrency(preview.fixedAmount, preview.currency)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/80 bg-white/70 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Математика периода
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{expression}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/80 bg-white/70 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Было
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatAmountWithCurrency(currentSalary, workCurrency)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/80 bg-white/70 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Новая дата фиксации
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDateForDisplay(preview.fixationDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      <ClockIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>
                        После фиксации поступления из этого периода нельзя будет редактировать,
                        удалять или добавлять задним числом.
                      </span>
                    </div>
                  </div>
                ) : !hasAvailableFixationRange ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                    Текущая дата фиксации уже совпадает с сегодняшним днём. Новый период можно будет
                    закрыть, когда появится следующий календарный день.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                    Укажите дату, чтобы увидеть итог периода.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h4 className="text-sm font-semibold text-slate-900">Поступления в периоде</h4>
              </div>

              {isPreviewLoading && !preview ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Загрузка...</div>
              ) : preview && preview.incomes.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {preview.incomes.map((income) => (
                    <div
                      key={income.id}
                      className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <div className="font-medium text-slate-900">
                        {formatDateForDisplay(income.receivedDate)}
                      </div>
                      <div className="text-slate-700">{renderIncomeValue(income)}</div>
                      <div className="text-slate-500">{income.description || 'Без описания'}</div>
                    </div>
                  ))}
                </div>
              ) : !hasAvailableFixationRange ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Для новой фиксации пока нет доступного периода.
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  За выбранный период поступлений не найдено. Будет зафиксирована нулевая сумма.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={
                  isSubmitting || isPreviewLoading || !preview || !hasAvailableFixationRange
                }
                className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              >
                Зафиксировать период
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

function resolveInitialEndDate(
  defaultEndDate: string,
  minEndDate: string,
  maxDate: string,
): string {
  if (minEndDate !== '' && minEndDate > maxDate) {
    return '';
  }

  const candidate = defaultEndDate || maxDate;
  if (candidate === '') {
    return minEndDate;
  }

  if (minEndDate !== '' && candidate < minEndDate) {
    return minEndDate;
  }

  if (candidate > maxDate) {
    return maxDate;
  }

  return candidate;
}

export default WorkIncomeFixationModal;
