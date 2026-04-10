import React, { useMemo, useState } from 'react';
import Button from '../ui/Button';
import { DistributionWithDetails } from '../../types/duty';
import { User } from '../../types/user';
import { formatDateForDisplay } from '../../utils/date';
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

interface GroupedHistoryItem {
  date: string; // Дата в формате YYYY-MM-DD
  formattedDate: string; // Форматированная дата
  items: Array<{
    type: 'workHistory' | 'distribution';
    data: WorkHistory | DistributionWithDetails;
    createdAt: string;
  }>;
  // Новые поля для группировки изменений одного типа
  collapsibleGroups?: Array<{
    groupKey: string; // Уникальный ключ группы (например, название объекта)
    groupName: string; // Отображаемое название группы
    items: Array<{
      type: 'workHistory' | 'distribution';
      data: WorkHistory | DistributionWithDetails;
      createdAt: string;
    }>;
  }>;
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
  const { user } = useAppSelector((state) => state.auth);

  // Создаем карту пользователей для быстрого поиска по id
  const usersMap = useUsersMap(users);
  const { convertSync } = useCurrencyConversion({ date: releaseDate });

  const renderPayment = (
    detail: DistributionWithDetails['details'][number],
    numericSalaryValue: number
  ): string => {
    const numericPrice = detail.price ? parseFloat(detail.price) : null;
    const numericPercentage = detail.percentage
      ? parseFloat(detail.percentage)
      : null;

    const dutyCurrency: 'RUB' | 'USD' =
      detail.currency ||
      (detail.duty?.currency as 'RUB' | 'USD') ||
      workCurrency ||
      'RUB';

    const pricePart = numericPrice ?? null; // assumed already in duty currency
    let percentPartInDuty: number | null = null;
    if (
      numericPercentage !== null &&
      !Number.isNaN(Number(numericPercentage)) &&
      numericSalaryValue
    ) {
      const percentAmountWork =
        (Number(numericPercentage) / 100) * numericSalaryValue;
      const converted = convertSync(
        percentAmountWork,
        workCurrency || 'RUB',
        dutyCurrency
      );
      percentPartInDuty = converted ?? percentAmountWork;
    }

    if (pricePart === null && percentPartInDuty === null) return 'Нет данных';

    const parts: string[] = [];
    if (pricePart !== null)
      parts.push(formatAmountWithCurrency(pricePart, dutyCurrency));
    if (numericPercentage !== null) parts.push(`${Number(numericPercentage)}%`);

    let text = parts.join(' + ');
    const total = (pricePart ?? 0) + (percentPartInDuty ?? 0);
    if (
      !Number.isNaN(total) &&
      (pricePart !== null || percentPartInDuty !== null)
    ) {
      text += ` = ${formatAmountWithCurrency(total, dutyCurrency)}`;
    }
    return text;
  };

  // Состояние для редактирования effectiveDate
  const [editingEffectiveDate, setEditingEffectiveDate] = useState<
    string | null
  >(null);
  const [tempDate, setTempDate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Состояние для управления сворачиванием/разворачиванием групп
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
          (detail) => detail.user && detail.user.id === currentUserId
        );
        if (!hasUserDuties) {
          return false;
        }
      }

      return true;
    });
  }, [distributions, showOnlyCurrentUser, currentUserId]);

  // Объединяем историю работы и распределения обязанностей
  const groupedHistory = useMemo(() => {
    const allHistoryItems: Array<{
      type: 'workHistory' | 'distribution';
      data: WorkHistory | DistributionWithDetails;
      createdAt: string;
      effectiveDate: string;
      effectiveDateForGrouping: string; // Дата для группировки
    }> = [];

    // Создаем множество ID workHistory, которые уже представлены в распределениях
    const distributionWorkHistoryIds = new Set<string>();
    if (validDistributions.length > 0) {
      validDistributions.forEach((item) => {
        distributionWorkHistoryIds.add(item.workHistory.id);
      });
    }

    // Добавляем элементы истории работы (исключая те, что уже есть в распределениях)
    if (workHistory && workHistory.length > 0) {
      workHistory.forEach((item) => {
        // Пропускаем записи workHistory, которые уже отображаются как распределения
        if (distributionWorkHistoryIds.has(item.id)) {
          return;
        }

        const createdAt = item.updatedAt || item.createdAt;
        const effectiveDate = item.effectiveDate || createdAt; // Используем effectiveDate или fallback на createdAt

        if (createdAt) {
          allHistoryItems.push({
            type: 'workHistory',
            data: item,
            createdAt,
            effectiveDate,
            effectiveDateForGrouping: effectiveDate.split('T')[0],
          });
        }
      });
    }

    // Добавляем элементы распределений
    if (validDistributions.length > 0) {
      validDistributions.forEach((item) => {
        if (item.createdAt) {
          const effectiveDate =
            item.workHistory.effectiveDate || item.createdAt; // Используем effectiveDate или fallback на createdAt

          allHistoryItems.push({
            type: 'distribution',
            data: item,
            createdAt: item.createdAt,
            effectiveDate,
            effectiveDateForGrouping: effectiveDate.split('T')[0],
          });
        }
      });
    }

    // Сортируем все элементы сначала по effectiveDate (новые в начале), потом по createdAt
    allHistoryItems.sort((a, b) => {
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

    allHistoryItems.forEach((item) => {
      if (!dateMap[item.effectiveDateForGrouping]) {
        const newGroup: GroupedHistoryItem = {
          date: item.effectiveDateForGrouping,
          formattedDate: formatDateForDisplay(item.effectiveDateForGrouping),
          items: [],
        };
        dateMap[item.effectiveDateForGrouping] = newGroup;
        groups.push(newGroup);
      }

      dateMap[item.effectiveDateForGrouping].items.push({
        type: item.type,
        data: item.data,
        createdAt: item.createdAt,
      });
    });

    // Сортируем элементы внутри группы по времени создания (новые в начале)
    groups.forEach((group) => {
      group.items.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

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
  }, [validDistributions, workHistory]);

  if (groupedHistory.length === 0) {
    return (
      <div className="py-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          История изменений
        </h3>
        <p className="text-gray-500 italic">История изменений отсутствует</p>
      </div>
    );
  }

  // Находит различия между двумя распределениями
  const getDifferences = (
    current: DistributionWithDetails,
    previous: DistributionWithDetails | null
  ) => {
    if (!previous) return {};

    const diffMap: Record<string, { duty: string; changed: boolean }> = {};

    // Создаем карту текущих деталей
    current.details.forEach((detail) => {
      if (!detail.dutyId || !detail.userId) return;

      diffMap[`${detail.dutyId}-${detail.userId}`] = {
        duty: detail.duty?.name || 'Неизвестная обязанность',
        changed: false,
      };
    });

    // Проверяем изменения
    current.details.forEach((currentDetail) => {
      if (!currentDetail.dutyId || !currentDetail.userId) return;

      const key = `${currentDetail.dutyId}-${currentDetail.userId}`;

      // Ищем соответствующую запись в предыдущем распределении
      const prevDetail = previous.details.find(
        (d) =>
          d.dutyId === currentDetail.dutyId && d.userId === currentDetail.userId
      );

      if (prevDetail) {
        const priceChanged =
          currentDetail.price !== prevDetail.price ||
          currentDetail.percentage !== prevDetail.percentage;

        diffMap[key].changed = priceChanged;
      } else {
        // Новая запись, которой не было в предыдущем распределении
        diffMap[key].changed = true;
      }
    });

    return diffMap;
  };

  // Функции для редактирования effectiveDate
  const startEditingEffectiveDate = (
    distributionId: string,
    currentDate?: string
  ) => {
    setEditingEffectiveDate(distributionId);
    setTempDate(currentDate ? currentDate.split('T')[0] : '');
  };

  const cancelEditingEffectiveDate = () => {
    setEditingEffectiveDate(null);
    setTempDate('');
  };

  const saveEffectiveDate = async (distribution: DistributionWithDetails) => {
    if (!tempDate) return;

    setIsUpdating(true);
    try {
      await workService.updateWorkHistory(distribution.workHistory.id, {
        effectiveDate: tempDate,
      });

      setEditingEffectiveDate(null);
      setTempDate('');

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

  const saveEffectiveDateWorkHistory = async (workHistoryItem: WorkHistory) => {
    if (!tempDate) return;

    setIsUpdating(true);
    try {
      await workService.updateWorkHistory(workHistoryItem.id, {
        effectiveDate: tempDate,
      });

      setEditingEffectiveDate(null);
      setTempDate('');

      // Вызываем callback для обновления данных
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error(
        'Ошибка при обновлении даты вступления в силу для workHistory:',
        error
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Рендерим элемент истории работы
  const renderWorkHistoryItem = (workHistoryItem: WorkHistory) => {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {/* Главный заголовок с типом изменения */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">⚙️</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Изменение работы
                </h4>
                <p className="text-sm text-blue-600 font-medium">
                  {workHistoryItem.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Зарплата</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatAmountWithCurrency(
                  Number(workHistoryItem.salary || 0),
                  (workHistoryItem.currency as 'RUB' | 'USD') ||
                    workCurrency ||
                    'RUB',
                  isConfidential
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ключевая информация */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 text-lg">📅</span>
              <div>
                <div className="text-sm text-green-700 font-medium">
                  Вступило в силу
                </div>
                <div className="flex items-center gap-2">
                  {editingEffectiveDate === workHistoryItem.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={tempDate}
                        onChange={(e) => setTempDate(e.target.value)}
                        className="text-sm border border-green-300 rounded-md px-2 py-1 focus:ring-green-500 focus:border-green-500"
                        disabled={isUpdating}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          saveEffectiveDateWorkHistory(workHistoryItem)
                        }
                        disabled={isUpdating || !tempDate}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelEditingEffectiveDate}
                        disabled={isUpdating}
                        className="text-xs px-2 py-1"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-green-800">
                        {workHistoryItem.effectiveDate
                          ? formatDateForDisplay(workHistoryItem.effectiveDate)
                          : 'Не указано'}
                      </span>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEditingEffectiveDate(
                              workHistoryItem.id,
                              workHistoryItem.effectiveDate
                            )
                          }
                          className="text-xs px-2 py-1 border-green-300 text-green-700 hover:bg-green-50"
                          title="Редактировать дату вступления в силу"
                        >
                          ✏️
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ответственный */}
            {workHistoryItem.responsibleUserId &&
              usersMap[workHistoryItem.responsibleUserId] && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Ответственный</div>
                  <div className="text-sm font-medium text-gray-900">
                    {`${usersMap[workHistoryItem.responsibleUserId].lastName || ''} ${usersMap[workHistoryItem.responsibleUserId].firstName || ''}`.trim() ||
                      usersMap[workHistoryItem.responsibleUserId].email}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Техническая информация */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Дата создания изменения:</span>{' '}
            {formatDateForDisplay(
              workHistoryItem.updatedAt || workHistoryItem.createdAt,
              true
            )}
          </div>
        </div>
      </div>
    );
  };

  // Рендерим элемент распределения обязанностей
  const renderDistributionItem = (
    distribution: DistributionWithDetails,
    index: number,
    groupIndex: number
  ) => {
    // Находим предыдущее распределение для сравнения
    const getNextDistributionItem = () => {
      // В текущей группе
      const groupItems = groupedHistory[groupIndex].items;
      let nextItemIndex = -1;

      // Ищем следующее распределение в текущей группе
      for (let i = index + 1; i < groupItems.length; i++) {
        if (groupItems[i].type === 'distribution') {
          nextItemIndex = i;
          break;
        }
      }

      if (nextItemIndex !== -1) {
        return groupItems[nextItemIndex].data as DistributionWithDetails;
      }

      // Если не нашли в текущей группе, ищем в следующих группах
      for (let g = groupIndex + 1; g < groupedHistory.length; g++) {
        const nextGroupItems = groupedHistory[g].items;
        for (let i = 0; i < nextGroupItems.length; i++) {
          if (nextGroupItems[i].type === 'distribution') {
            return nextGroupItems[i].data as DistributionWithDetails;
          }
        }
      }

      return null;
    };

    const prevDistribution = getNextDistributionItem();
    const differences = getDifferences(distribution, prevDistribution);

    // Фильтруем детали: для WORKER (isConfidential) показываем только его обязанности
    const filteredDetails =
      (showOnlyCurrentUser || isConfidential) && currentUserId
        ? distribution.details.filter(
            (detail) => detail.user && detail.user.id === currentUserId
          )
        : distribution.details;

    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {/* Главный заголовок с типом изменения */}
        <div className="px-6 py-4 bg-green-50 border-b border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm font-medium">👥</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Распределение обязанностей
                </h4>
                <p className="text-sm text-green-600 font-medium">
                  {distribution.workHistory.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Зарплата</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatAmountWithCurrency(
                  Number(distribution.workHistory.salary || 0),
                  (distribution.workHistory.currency as 'RUB' | 'USD') ||
                    workCurrency ||
                    'RUB',
                  isConfidential
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ключевая информация */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600 text-lg">📅</span>
              <div>
                <div className="text-sm text-emerald-700 font-medium">
                  Вступило в силу
                </div>
                <div className="flex items-center gap-2">
                  {editingEffectiveDate === distribution.workHistory.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={tempDate}
                        onChange={(e) => setTempDate(e.target.value)}
                        className="text-sm border border-emerald-300 rounded-md px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
                        disabled={isUpdating}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => saveEffectiveDate(distribution)}
                        disabled={isUpdating || !tempDate}
                        className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelEditingEffectiveDate}
                        disabled={isUpdating}
                        className="text-xs px-2 py-1"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-emerald-800">
                        {distribution.workHistory.effectiveDate
                          ? formatDateForDisplay(
                              distribution.workHistory.effectiveDate
                            )
                          : 'Не указано'}
                      </span>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            startEditingEffectiveDate(
                              distribution.workHistory.id,
                              distribution.workHistory.effectiveDate
                            )
                          }
                          className="text-xs px-2 py-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          title="Редактировать дату вступления в силу"
                        >
                          ✏️
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ответственный */}
            {distribution.workHistory.responsibleUserId &&
              usersMap[distribution.workHistory.responsibleUserId] && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Ответственный</div>
                  <div className="text-sm font-medium text-gray-900">
                    {`${usersMap[distribution.workHistory.responsibleUserId].lastName || ''} ${usersMap[distribution.workHistory.responsibleUserId].firstName || ''}`.trim() ||
                      usersMap[distribution.workHistory.responsibleUserId]
                        .email}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Таблица с обязанностями */}
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Обязанность
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ответственный
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Расчет оплаты
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDetails.map((detail) => {
                if (!detail || !detail.duty || !detail.user) return null;

                // Безопасно получаем пользователя
                const user = detail.user?.id ? usersMap[detail.user.id] : null;
                const userName = user
                  ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
                  : detail.user?.email ||
                      (detail.user?.lastName && detail.user?.firstName)
                    ? `${detail.user?.lastName || ''} ${detail.user?.firstName || ''}`.trim()
                    : `ID: ${detail.user?.id || 'неизвестно'}`;

                // Проверяем, изменилась ли эта запись
                const key = `${detail.dutyId}-${detail.userId}`;
                const diffInfo = differences[key];
                const isChanged = diffInfo?.changed;

                // Преобразуем workSalary в число для расчетов
                const numericSalaryValue =
                  typeof workSalary === 'string'
                    ? parseFloat(workSalary)
                    : workSalary;

                return (
                  <tr
                    key={detail.id}
                    className={isChanged ? 'bg-yellow-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>
                          {detail.duty?.name || 'Неизвестная обязанность'}
                        </span>
                        {isChanged && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Изменено
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
                          : Number(numericSalaryValue || 0)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Техническая информация */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Дата создания изменения:</span>{' '}
            {formatDateForDisplay(distribution.createdAt, true)}
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
      items: Array<{
        type: 'workHistory' | 'distribution';
        data: WorkHistory | DistributionWithDetails;
        createdAt: string;
      }>;
    },
    groupIndex: number
  ) => {
    const isExpanded = expandedGroups.has(collapsibleGroup.groupKey);
    const hasMultipleItems = collapsibleGroup.items.length > 1;

    // Показываем только самое актуальное изменение (первое в списке)
    const latestItem = collapsibleGroup.items[0];
    const hiddenItems = collapsibleGroup.items.slice(1);

    return (
      <div key={collapsibleGroup.groupKey} className="mb-4">
        {/* Самое актуальное изменение (всегда показано) */}
        <div className="history-group">
          {latestItem.type === 'workHistory'
            ? renderWorkHistoryItem(latestItem.data as WorkHistory)
            : renderDistributionItem(
                latestItem.data as DistributionWithDetails,
                0,
                groupIndex
              )}
        </div>

        {/* Кнопка для показа остальных изменений */}
        {hasMultipleItems && hiddenItems.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => toggleGroupExpansion(collapsibleGroup.groupKey)}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 collapsible-header"
              aria-expanded={isExpanded}
              aria-controls={`group-${collapsibleGroup.groupKey}`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {isExpanded
                    ? 'Скрыть предыдущие изменения'
                    : `Показать предыдущие изменения (${hiddenItems.length})`}
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
                className="mt-4 space-y-4 animate-fadeIn"
              >
                {hiddenItems.map((item, index) => (
                  <div
                    key={`${item.type}-${item.createdAt}-hidden`}
                    className="history-group"
                  >
                    {item.type === 'workHistory'
                      ? renderWorkHistoryItem(item.data as WorkHistory)
                      : renderDistributionItem(
                          item.data as DistributionWithDetails,
                          index + 1,
                          groupIndex
                        )}
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
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">📋</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              История изменений
            </h3>
            <p className="text-sm text-gray-500">
              Полная история модификаций обязанностей в проекте
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {groupedHistory.length > 0 ? (
            groupedHistory.map((group, groupIndex) => (
              <div key={group.date} className="relative">
                {/* Улучшенный заголовок группы */}
                <div className="sticky top-0 z-10 bg-white border border-emerald-200 rounded-lg px-6 py-4 mb-6 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-600 text-sm font-medium">
                          📅
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-emerald-800">
                        Вступили в силу: {group.formattedDate}
                      </h4>
                      <p className="text-sm text-emerald-600">
                        {group.items.length}{' '}
                        {group.items.length === 1
                          ? 'изменение'
                          : group.items.length < 5
                            ? 'изменения'
                            : 'изменений'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pl-4">
                  {/* Отображаем сворачиваемые группы, если они есть */}
                  {group.collapsibleGroups && group.collapsibleGroups.length > 0
                    ? group.collapsibleGroups.map((collapsibleGroup) =>
                        renderCollapsibleGroup(collapsibleGroup, groupIndex)
                      )
                    : /* Fallback для старой логики, если нет сворачиваемых групп */
                      group.items.map((item, index) => (
                        <div
                          key={`${item.type}-${item.createdAt}`}
                          className="mb-4"
                        >
                          {item.type === 'workHistory'
                            ? renderWorkHistoryItem(item.data as WorkHistory)
                            : renderDistributionItem(
                                item.data as DistributionWithDetails,
                                index,
                                groupIndex
                              )}
                        </div>
                      ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📝</span>
              </div>
              <p className="text-gray-500 italic text-lg">
                История изменений пуста
              </p>
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
