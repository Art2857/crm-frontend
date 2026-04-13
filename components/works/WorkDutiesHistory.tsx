import React, { useMemo, useState } from 'react';
import { DistributionWithDetails } from '../../types/duty';
import { User } from '../../types/user';
import { formatDateForDisplay, formatDateToISO } from '../../utils/date';
import { formatAmountWithCurrency } from '../../utils/currency';
import { WorkHistory } from '../../types/work';
import { workService } from '../../services/work';
import { useAppSelector } from '../../store';
import { useUsersMap } from '../../hooks/shared/useUsersMap';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';

interface WorkDutiesHistoryProps {
  distributions: DistributionWithDetails[] | null;
  workHistory: WorkHistory[] | null;
  users: User[];
  workSalary: string;
  workCurrency?: 'RUB' | 'USD';
  releaseDate?: string;
  currentUserId?: string; // Добавляем ID текущего пользователя
  showOnlyCurrentUser?: boolean; // Флаг для отображения только обязанностей текущего пользователя
  onUpdate?: () => void; // Callback для обновления данных после изменений
  canEdit?: boolean; // Возможность редактирования (для админов)
  isConfidential?: boolean; // Финансовые данные скрыты для текущего пользователя
}

interface TimelineHistoryItem {
  id: string;
  workHistory: WorkHistory;
  distribution: DistributionWithDetails | null;
  createdAt: string;
  effectiveDate: string;
  effectiveDateForGrouping: string;
}

interface GroupedHistoryItem {
  date: string; // Дата в формате YYYY-MM-DD
  formattedDate: string; // Форматированная дата
  primaryItem: TimelineHistoryItem;
  items: TimelineHistoryItem[];
  collapsibleGroups?: Array<{
    groupKey: string; // Уникальный ключ группы (например, название объекта)
    groupName: string; // Отображаемое название группы
    items: TimelineHistoryItem[];
  }>;
}

interface HistoryCardRenderOptions {
  tone?: 'primary' | 'secondary';
  compareWith?: TimelineHistoryItem | null;
}

/**
 * Компонент для отображения истории изменений
 */
const WorkDutiesHistory: React.FC<WorkDutiesHistoryProps> = ({
  distributions,
  workHistory,
  users,
  workSalary,
  workCurrency = 'RUB',
  releaseDate,
  currentUserId,
  showOnlyCurrentUser = false,
  onUpdate,
  canEdit = false,
  isConfidential = false,
}) => {
  // Создаем карту пользователей для быстрого поиска по id
  const usersMap = useUsersMap(users);
  const { convertSync } = useCurrencyConversion({ date: releaseDate });

  const renderPayment = (
    detail: DistributionWithDetails['details'][number],
    numericSalaryValue: number,
  ): string => {
    const numericPrice = detail.price ? parseFloat(detail.price) : null;
    const numericPercentage = detail.percentage ? parseFloat(detail.percentage) : null;

    const dutyCurrency: 'RUB' | 'USD' =
      detail.currency || (detail.duty?.currency as 'RUB' | 'USD') || workCurrency || 'RUB';

    const pricePart = numericPrice ?? null; // assumed already in duty currency
    let percentPartInDuty: number | null = null;
    if (
      numericPercentage !== null &&
      !Number.isNaN(Number(numericPercentage)) &&
      numericSalaryValue
    ) {
      const percentAmountWork = (Number(numericPercentage) / 100) * numericSalaryValue;
      const converted = convertSync(percentAmountWork, workCurrency || 'RUB', dutyCurrency);
      percentPartInDuty = converted ?? percentAmountWork;
    }

    if (pricePart === null && percentPartInDuty === null) return 'Нет данных';

    const parts: string[] = [];
    if (pricePart !== null) parts.push(formatAmountWithCurrency(pricePart, dutyCurrency));
    if (numericPercentage !== null) parts.push(`${Number(numericPercentage)}%`);

    let text = parts.join(' + ');
    const total = (pricePart ?? 0) + (percentPartInDuty ?? 0);
    if (!Number.isNaN(total) && (pricePart !== null || percentPartInDuty !== null)) {
      text += ` = ${formatAmountWithCurrency(total, dutyCurrency)}`;
    }
    return text;
  };

  // Черновики даты вступления в силу для явного подтверждения через галочку
  const [effectiveDateDrafts, setEffectiveDateDrafts] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Состояние для управления сворачиванием/разворачиванием групп
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    setEffectiveDateDrafts({});
  }, [distributions, workHistory]);

  // Функции для управления сворачиванием/разворачиванием
  const toggleGroupExpansion = (groupKey: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey);
    } else {
      newExpandedGroups.add(groupKey);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // Проверяем валидность распределений
  const validDistributions = useMemo(() => {
    if (!distributions || !Array.isArray(distributions)) {
      console.warn('Распределения отсутствуют или не являются массивом');
      return [];
    }

    // Проверяем каждое распределение на валидность
    return distributions.filter((dist) => {
      if (!dist) {
        console.warn('Обнаружено undefined распределение');
        return false;
      }

      // Проверяем необходимые поля
      if (!dist.createdAt) {
        console.warn('Распределение без даты создания:', dist);
        return false;
      }

      if (!dist.workHistory) {
        console.warn('Распределение без истории работы:', dist);
        return false;
      }

      // Если нужно показывать только для текущего пользователя,
      // проверяем, есть ли у него обязанности в этом распределении
      if (showOnlyCurrentUser && currentUserId) {
        const hasUserDuties = dist.details.some(
          (detail) => detail.user && detail.user.id === currentUserId,
        );
        if (!hasUserDuties) {
          return false;
        }
      }

      return true;
    });
  }, [distributions, showOnlyCurrentUser, currentUserId]);

  const distributionByHistoryId = useMemo(() => {
    const distributionMap = new Map<string, DistributionWithDetails>();

    validDistributions.forEach((distribution) => {
      distributionMap.set(distribution.workHistory.id, distribution);
    });

    return distributionMap;
  }, [validDistributions]);

  // Объединяем историю работы и распределения обязанностей в единые снимки состояния
  const groupedHistory = useMemo(() => {
    const timelineItems: TimelineHistoryItem[] = [];
    const seenHistoryIds = new Set<string>();

    if (workHistory && workHistory.length > 0) {
      workHistory.forEach((item) => {
        const relatedDistribution = distributionByHistoryId.get(item.id) ?? null;
        const createdAt = relatedDistribution?.createdAt || item.updatedAt || item.createdAt;
        const effectiveDate =
          relatedDistribution?.workHistory.effectiveDate || item.effectiveDate || createdAt;

        if (!createdAt || !effectiveDate) {
          return;
        }

        timelineItems.push({
          id: item.id,
          workHistory: item,
          distribution: relatedDistribution,
          createdAt,
          effectiveDate,
          effectiveDateForGrouping: effectiveDate.split('T')[0],
        });
        seenHistoryIds.add(item.id);
      });
    }

    // На случай рассинхронизации данных добавляем распределения, которых нет в workHistory
    if (validDistributions.length > 0) {
      validDistributions.forEach((item) => {
        if (seenHistoryIds.has(item.workHistory.id)) {
          return;
        }

        const effectiveDate = item.workHistory.effectiveDate || item.createdAt;

        if (!effectiveDate || !item.createdAt) {
          return;
        }

        timelineItems.push({
          id: item.workHistory.id,
          workHistory: {
            id: item.workHistory.id,
            workId: item.workHistory.workId,
            name: item.workHistory.name,
            responsibleUserId: item.workHistory.responsibleUserId,
            salary: String(item.workHistory.salary),
            currency: item.workHistory.currency,
            effectiveDate: item.workHistory.effectiveDate,
            createdAt: item.createdAt,
            updatedAt: item.createdAt,
          },
          distribution: item,
          createdAt: item.createdAt,
          effectiveDate,
          effectiveDateForGrouping: effectiveDate.split('T')[0],
        });
      });
    }

    // Сортируем все элементы сначала по effectiveDate (новые в начале), потом по createdAt
    timelineItems.sort((a, b) => {
      const effectiveDateA = new Date(a.effectiveDate).getTime();
      const effectiveDateB = new Date(b.effectiveDate).getTime();

      // Сначала сортируем по effectiveDate
      if (effectiveDateA !== effectiveDateB) {
        return effectiveDateB - effectiveDateA;
      }

      // Если effectiveDate одинаковые, сортируем по createdAt
      const createdAtA = new Date(a.createdAt).getTime();
      const createdAtB = new Date(b.createdAt).getTime();
      return createdAtB - createdAtA;
    });

    // Группируем по effectiveDate
    const groups: GroupedHistoryItem[] = [];
    const dateMap: Record<string, GroupedHistoryItem> = {};

    timelineItems.forEach((item) => {
      if (!dateMap[item.effectiveDateForGrouping]) {
        const newGroup: GroupedHistoryItem = {
          date: item.effectiveDateForGrouping,
          formattedDate: formatDateForDisplay(item.effectiveDateForGrouping),
          primaryItem: item,
          items: [],
        };
        dateMap[item.effectiveDateForGrouping] = newGroup;
        groups.push(newGroup);
      }

      dateMap[item.effectiveDateForGrouping].items.push(item);
    });

    // Сортируем элементы внутри группы по времени создания (новые в начале)
    groups.forEach((group) => {
      group.items.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      group.primaryItem = group.items[0];

      // Если в группе больше одного элемента, создаем одну сворачиваемую группу
      if (group.items.length > 1) {
        group.collapsibleGroups = [
          {
            groupKey: `date-${group.date}`, // Уникальный ключ для даты
            groupName: `Изменения от ${group.formattedDate}`, // Название группы
            items: group.items, // Все элементы этой даты
          },
        ];
      } else {
        // Если только одно изменение, не создаем сворачиваемую группу
        group.collapsibleGroups = [];
      }
    });

    return groups;
  }, [distributionByHistoryId, validDistributions, workHistory]);

  const visibleTimelineComparisons = useMemo(() => {
    const comparisonMap = new Map<string, TimelineHistoryItem | null>();

    groupedHistory.forEach((group, index) => {
      const currentVisibleItem = group.primaryItem;
      let previousVisibleItem: TimelineHistoryItem | null = null;
      for (let nextIndex = index + 1; nextIndex < groupedHistory.length; nextIndex += 1) {
        const candidate = groupedHistory[nextIndex].primaryItem;
        if (candidate) {
          previousVisibleItem = candidate;
          break;
        }
      }

      comparisonMap.set(currentVisibleItem.id, previousVisibleItem);
    });

    return comparisonMap;
  }, [groupedHistory]);

  if (groupedHistory.length === 0) {
    return (
      <div className="py-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">История изменений</h3>
        <p className="text-gray-500 italic">История изменений отсутствует</p>
      </div>
    );
  }

  const buildDetailComparisonKey = (detail: DistributionWithDetails['details'][number]) => {
    return `${detail.dutyId}-${detail.userId}`;
  };

  const getDistributionDiff = (
    currentItem: TimelineHistoryItem,
    previousItem: TimelineHistoryItem | null,
    currentDistribution: DistributionWithDetails | null,
    previousDistribution: DistributionWithDetails | null,
  ) => {
    const result = {
      rowStates: {} as Record<string, 'added' | 'changed'>,
      addedCount: 0,
      changedCount: 0,
      removedCount: 0,
      salaryChanged: false,
      responsibleChanged: false,
      workNameChanged: false,
    };

    if (!previousItem) {
      return result;
    }

    result.salaryChanged =
      previousItem.workHistory.salary !== currentItem.workHistory.salary ||
      previousItem.workHistory.currency !== currentItem.workHistory.currency;
    result.responsibleChanged =
      previousItem.workHistory.responsibleUserId !== currentItem.workHistory.responsibleUserId;
    result.workNameChanged = previousItem.workHistory.name !== currentItem.workHistory.name;

    if (!currentDistribution || !previousDistribution) {
      return result;
    }

    const previousDetailsMap = new Map(
      previousDistribution.details.map((detail) => [buildDetailComparisonKey(detail), detail]),
    );
    const currentDetailKeys = new Set<string>();

    currentDistribution.details.forEach((detail) => {
      const key = buildDetailComparisonKey(detail);
      currentDetailKeys.add(key);

      const previousDetail = previousDetailsMap.get(key);
      if (!previousDetail) {
        result.rowStates[key] = 'added';
        result.addedCount += 1;
        return;
      }

      const isChanged =
        previousDetail.price !== detail.price ||
        previousDetail.percentage !== detail.percentage ||
        previousDetail.currency !== detail.currency ||
        previousDetail.calculatedValue !== detail.calculatedValue;

      if (isChanged) {
        result.rowStates[key] = 'changed';
        result.changedCount += 1;
      }
    });

    previousDistribution.details.forEach((detail) => {
      const key = buildDetailComparisonKey(detail);
      if (!currentDetailKeys.has(key)) {
        result.removedCount += 1;
      }
    });

    return result;
  };

  const getDateInputValue = (value?: string | null) => {
    return formatDateToISO(value);
  };

  const getResolvedEffectiveDateValue = (
    currentValue?: string | null,
    fallbackValue?: string | null,
  ) => {
    return getDateInputValue(currentValue) || getDateInputValue(fallbackValue);
  };

  const getEffectiveDateDraft = (
    workHistoryId: string,
    currentValue?: string | null,
    fallbackValue?: string | null,
  ) => {
    return (
      effectiveDateDrafts[workHistoryId] ??
      getResolvedEffectiveDateValue(currentValue, fallbackValue)
    );
  };

  const hasPendingEffectiveDateChange = (
    workHistoryId: string,
    currentValue?: string | null,
    fallbackValue?: string | null,
  ) => {
    const currentDate = getResolvedEffectiveDateValue(currentValue, fallbackValue);
    const draftValue = effectiveDateDrafts[workHistoryId];

    if (draftValue === undefined || draftValue === '') {
      return false;
    }

    return draftValue !== currentDate;
  };

  const handleEffectiveDateDraftChange = (workHistoryId: string, nextDate: string) => {
    setEffectiveDateDrafts((prev) => ({
      ...prev,
      [workHistoryId]: nextDate,
    }));
  };

  const saveEffectiveDateChange = async (
    workHistoryId: string,
    currentValue?: string | null,
    fallbackValue?: string | null,
  ) => {
    const nextDate =
      effectiveDateDrafts[workHistoryId] ??
      getResolvedEffectiveDateValue(currentValue, fallbackValue);
    const currentDate = getResolvedEffectiveDateValue(currentValue, fallbackValue);

    if (!nextDate || nextDate === currentDate) {
      return;
    }

    setIsUpdating(true);
    try {
      await workService.updateWorkHistory(workHistoryId, {
        effectiveDate: nextDate,
      });

      setEffectiveDateDrafts((prev) => {
        const nextDrafts = { ...prev };
        delete nextDrafts[workHistoryId];
        return nextDrafts;
      });

      // Вызываем callback для обновления данных
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Ошибка при обновлении даты вступления в силу:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderEffectiveDateControl = (
    workHistoryId: string,
    currentValue?: string | null,
    fallbackValue?: string | null,
  ) => {
    const resolvedDate = getResolvedEffectiveDateValue(currentValue, fallbackValue);
    const draftDate = getEffectiveDateDraft(workHistoryId, currentValue, fallbackValue);
    const isChanged = hasPendingEffectiveDateChange(workHistoryId, currentValue, fallbackValue);

    if (!canEdit) {
      return (
        <span className="font-semibold text-gray-900">
          {resolvedDate ? formatDateForDisplay(resolvedDate) : 'Не указано'}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={draftDate}
          onChange={(e) => handleEffectiveDateDraftChange(workHistoryId, e.target.value)}
          className="min-w-[180px] rounded-lg border-0 bg-gray-100 px-4 py-3 text-sm font-medium text-gray-900 transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-primary-500"
          disabled={isUpdating}
        />
        {isChanged && (
          <button
            type="button"
            onClick={() => saveEffectiveDateChange(workHistoryId, currentValue, fallbackValue)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdating}
            title="Подтвердить дату вступления в силу"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const getCardAppearance = (tone: HistoryCardRenderOptions['tone'] = 'primary') => {
    if (tone === 'secondary') {
      return {
        container:
          'overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-slate-50/70 shadow-none',
        section: 'border-b border-slate-200 bg-slate-50/80 px-6 py-4',
        footer: 'border-t border-slate-200 bg-slate-100/80 px-6 py-3',
        tableHead: 'bg-slate-100/80',
      };
    }

    return {
      container:
        'overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-primary-400 bg-white shadow-sm',
      section: 'border-b border-slate-200 bg-white px-6 py-4',
      footer: 'border-t border-slate-100 bg-slate-50/80 px-6 py-3',
      tableHead: 'bg-slate-50',
    };
  };

  const renderDistributionChangeSummary = (
    diff: ReturnType<typeof getDistributionDiff>,
    tone: HistoryCardRenderOptions['tone'] = 'primary',
  ) => {
    const chips = [
      diff.salaryChanged
        ? {
            key: 'salary',
            label: 'Изменен бюджет',
            className: 'border-blue-100 bg-blue-50 text-blue-700',
          }
        : null,
      diff.responsibleChanged
        ? {
            key: 'responsible',
            label: 'Сменился ответственный',
            className: 'border-violet-100 bg-violet-50 text-violet-700',
          }
        : null,
      diff.workNameChanged
        ? {
            key: 'work',
            label: 'Изменено название',
            className: 'border-slate-200 bg-slate-100 text-slate-700',
          }
        : null,
      diff.addedCount > 0
        ? {
            key: 'added',
            label: `Добавлено обязанностей: ${diff.addedCount}`,
            className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
          }
        : null,
      diff.changedCount > 0
        ? {
            key: 'changed',
            label: `Обновлено обязанностей: ${diff.changedCount}`,
            className: 'border-amber-100 bg-amber-50 text-amber-700',
          }
        : null,
      diff.removedCount > 0
        ? {
            key: 'removed',
            label: `Снято обязанностей: ${diff.removedCount}`,
            className: 'border-rose-100 bg-rose-50 text-rose-700',
          }
        : null,
    ].filter((chip): chip is { key: string; label: string; className: string } => chip !== null);

    if (chips.length === 0) {
      return null;
    }

    return (
      <div className={`mt-3 flex flex-wrap gap-2 ${tone === 'secondary' ? 'opacity-80' : ''}`}>
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${chip.className}`}
          >
            {chip.label}
          </span>
        ))}
      </div>
    );
  };

  const renderTimelineCard = (
    item: TimelineHistoryItem,
    options: HistoryCardRenderOptions = {},
  ) => {
    const appearance = getCardAppearance(options.tone);
    const workHistoryItem = item.workHistory;
    const distribution = item.distribution;
    const comparison =
      options.tone !== 'secondary'
        ? getDistributionDiff(
            item,
            options.compareWith ?? null,
            distribution,
            options.compareWith?.distribution ?? null,
          )
        : null;

    const responsibleUser = workHistoryItem.responsibleUserId
      ? usersMap[workHistoryItem.responsibleUserId]
      : null;
    const responsibleUserName = responsibleUser
      ? `${responsibleUser.lastName || ''} ${responsibleUser.firstName || ''}`.trim() ||
        responsibleUser.email ||
        'Не указан'
      : '';

    const filteredDetails =
      distribution && (showOnlyCurrentUser || isConfidential) && currentUserId
        ? distribution.details.filter((detail) => detail.user && detail.user.id === currentUserId)
        : (distribution?.details ?? []);

    return (
      <div className={appearance.container}>
        <div className={appearance.section}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <span className="text-gray-500">Работа:</span>
              <span className="max-w-[240px] truncate font-semibold text-gray-900">
                {workHistoryItem.name}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Зарплата:</span>
              <span
                className={`font-semibold ${
                  comparison?.salaryChanged && options.tone !== 'secondary'
                    ? 'text-blue-700'
                    : 'text-gray-900'
                }`}
              >
                {formatAmountWithCurrency(
                  Number(workHistoryItem.salary || 0),
                  (workHistoryItem.currency as 'RUB' | 'USD') || workCurrency || 'RUB',
                  isConfidential,
                )}
              </span>
            </div>

            {responsibleUser && (
              <div className="min-w-0 flex items-center gap-2 text-sm">
                <span className="text-gray-500">Ответственный:</span>
                <span
                  className={`max-w-[220px] truncate font-semibold ${
                    comparison?.responsibleChanged && options.tone !== 'secondary'
                      ? 'text-violet-700'
                      : 'text-gray-900'
                  }`}
                  title={responsibleUserName || undefined}
                >
                  {responsibleUserName}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">Вступило в силу:</span>
              {renderEffectiveDateControl(
                workHistoryItem.id,
                workHistoryItem.effectiveDate,
                item.createdAt,
              )}
            </div>
          </div>

          {comparison !== null && renderDistributionChangeSummary(comparison, options.tone)}
        </div>

        {distribution && (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={appearance.tableHead}>
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Обязанность
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Ответственный
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Расчет оплаты
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDetails.map((detail) => {
                  if (!detail || !detail.duty || !detail.user) return null;

                  const user = detail.user?.id ? usersMap[detail.user.id] : null;
                  const userName = user
                    ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
                    : detail.user?.email || (detail.user?.lastName && detail.user?.firstName)
                      ? `${detail.user?.lastName || ''} ${detail.user?.firstName || ''}`.trim()
                      : `ID: ${detail.user?.id || 'неизвестно'}`;

                  const rowState =
                    comparison !== null && options.tone !== 'secondary'
                      ? comparison.rowStates[buildDetailComparisonKey(detail)]
                      : undefined;

                  const rowClass =
                    rowState === 'added'
                      ? 'bg-emerald-50/70'
                      : rowState === 'changed'
                        ? 'bg-amber-50/70'
                        : options.tone === 'secondary'
                          ? 'bg-transparent'
                          : '';

                  const rowBadge =
                    rowState === 'added'
                      ? {
                          label: 'Новое',
                          className: 'bg-emerald-100 text-emerald-700',
                        }
                      : rowState === 'changed'
                        ? {
                            label: 'Изменено',
                            className: 'bg-amber-100 text-amber-700',
                          }
                        : null;

                  const numericSalaryValue = Number(workHistoryItem.salary || 0);

                  return (
                    <tr key={detail.id} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span>{detail.duty?.name || 'Неизвестная обязанность'}</span>
                          {rowBadge && options.tone !== 'secondary' && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${rowBadge.className}`}
                            >
                              {rowBadge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {renderPayment(
                          detail,
                          typeof numericSalaryValue === 'number'
                            ? numericSalaryValue
                            : Number(numericSalaryValue || 0),
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={appearance.footer}>
          <div className="text-xs text-gray-500">
            <span className="font-medium">Дата создания изменения:</span>{' '}
            {formatDateForDisplay(item.createdAt, true)}
          </div>
        </div>
      </div>
    );
  };

  // Компонент для отображения сворачиваемой группы (без useCallback, чтобы избежать условного вызова хука)
  const renderCollapsibleGroup = (
    collapsibleGroup: {
      groupKey: string;
      groupName: string;
      items: TimelineHistoryItem[];
    },
    groupIndex: number,
  ) => {
    const isExpanded = expandedGroups.has(collapsibleGroup.groupKey);
    const hasMultipleItems = collapsibleGroup.items.length > 1;

    const latestItem = groupedHistory[groupIndex].primaryItem;
    const hiddenItems = collapsibleGroup.items.filter(
      (item) => !(item.id === latestItem.id && item.createdAt === latestItem.createdAt),
    );

    return (
      <div key={collapsibleGroup.groupKey} className="mb-4">
        {/* Самое актуальное изменение (всегда показано) */}
        <div className="history-group">
          {renderTimelineCard(latestItem, {
            tone: 'primary',
            compareWith: visibleTimelineComparisons.get(latestItem.id) ?? null,
          })}
        </div>

        {/* Кнопка для показа остальных изменений */}
        {hasMultipleItems && hiddenItems.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
            <button
              onClick={() => toggleGroupExpansion(collapsibleGroup.groupKey)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors duration-200 hover:bg-slate-50 collapsible-header"
              aria-expanded={isExpanded}
              aria-controls={`group-${collapsibleGroup.groupKey}`}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                  {hiddenItems.length}
                </span>
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-700">
                    {isExpanded ? 'Скрыть предыдущие версии' : 'Показать предыдущие версии'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Старые изменения за {groupedHistory[groupIndex].formattedDate}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {isExpanded ? 'Свернуть' : `Еще ${hiddenItems.length}`}
                </span>
                <span
                  className={`transform transition-transform duration-200 text-gray-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                >
                  ▼
                </span>
              </div>
            </button>

            {/* Остальные изменения (показываются при развертывании) */}
            {isExpanded && (
              <div
                id={`group-${collapsibleGroup.groupKey}`}
                className="mt-4 space-y-3 border-l border-dashed border-slate-200 pl-4 animate-fadeIn"
              >
                {hiddenItems.map((item) => (
                  <div key={`${item.id}-${item.createdAt}-hidden`} className="history-group">
                    {renderTimelineCard(item, {
                      tone: 'secondary',
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <span className="text-slate-600 text-lg">📋</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">История изменений</h3>
            <p className="text-sm text-gray-500">
              Актуальные изменения выделены, предыдущие версии можно раскрыть при необходимости
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {groupedHistory.length > 0 ? (
            groupedHistory.map((group, groupIndex) => (
              <div key={group.date} className="space-y-4">
                {/* Отображаем сворачиваемые группы, если они есть */}
                {group.collapsibleGroups && group.collapsibleGroups.length > 0 ? (
                  group.collapsibleGroups.map((collapsibleGroup) =>
                    renderCollapsibleGroup(collapsibleGroup, groupIndex),
                  )
                ) : (
                  <div
                    key={`${group.primaryItem.id}-${group.primaryItem.createdAt}`}
                    className="mb-4"
                  >
                    {renderTimelineCard(group.primaryItem, {
                      tone: 'primary',
                      compareWith: visibleTimelineComparisons.get(group.primaryItem.id) ?? null,
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📝</span>
              </div>
              <p className="text-gray-500 italic text-lg">История изменений пуста</p>
              <p className="text-gray-400 text-sm mt-2">
                Изменения будут отображаться здесь после их создания
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(WorkDutiesHistory);
