import React, { useMemo } from 'react';
import { DistributionWithDetails } from '../../types/duty';
import { User } from '../../types/user';
import { formatDateForDisplay } from '../../utils/date';
import { formatAmountWithCurrency, formatPaymentWithCurrency } from '../../utils/currency';
import { useUsersMap } from '../../hooks/shared/useUsersMap';
import { getDistributionByWorkHistoryId, getLatestDistribution } from '../../utils/distributions';

interface WorkDutiesProps {
  distributions: DistributionWithDetails[] | null;
  users: User[];
  workSalary: string;
  currentWorkHistoryId?: string;
  currentUserId?: string;
  showOnlyCurrentUser?: boolean;
  canEdit?: boolean;
  onEditDuties?: () => void;
}

/**
 * Компонент для отображения обязанностей работы
 */
const WorkDuties: React.FC<WorkDutiesProps> = ({
  distributions,
  users,
  workSalary,
  currentWorkHistoryId,
  currentUserId,
  showOnlyCurrentUser = false,
  canEdit = false,
  onEditDuties,
}) => {
  // Создаем карту пользователей для быстрого поиска по id
  const usersMap = useUsersMap(users);

  // Получаем последнее распределение (самое актуальное)
  // Всегда берём первое (самое свежее) - даже если оно пустое (обнулено при архивации)
  const latestDistribution = useMemo<DistributionWithDetails | undefined>(() => {
    if (currentWorkHistoryId) {
      return getDistributionByWorkHistoryId(distributions, currentWorkHistoryId) ?? undefined;
    }

    return getLatestDistribution(distributions) ?? undefined;
  }, [currentWorkHistoryId, distributions]);

  // Фильтруем детали распределения по текущему пользователю, если нужно
  const filteredDetails = useMemo(() => {
    if (!latestDistribution) return [];

    if (showOnlyCurrentUser && currentUserId) {
      return latestDistribution.details.filter((detail) => detail.user.id === currentUserId);
    }

    return latestDistribution.details;
  }, [latestDistribution, showOnlyCurrentUser, currentUserId]);

  const totalsByCurrency = useMemo(() => {
    return filteredDetails.reduce(
      (accumulator, detail) => {
        const detailCurrency = detail.currency || detail.duty.currency;
        const numericCalculatedValue = detail.calculatedValue
          ? parseFloat(detail.calculatedValue)
          : Number.NaN;

        if (Number.isNaN(numericCalculatedValue)) {
          return accumulator;
        }

        accumulator[detailCurrency] += numericCalculatedValue;
        return accumulator;
      },
      { RUB: 0, USD: 0 } as Record<'RUB' | 'USD', number>,
    );
  }, [filteredDetails]);

  const totalsSummary = useMemo(() => {
    const segments: string[] = [];

    if (totalsByCurrency.RUB > 0) {
      segments.push(formatAmountWithCurrency(totalsByCurrency.RUB, 'RUB'));
    }

    if (totalsByCurrency.USD > 0) {
      segments.push(formatAmountWithCurrency(totalsByCurrency.USD, 'USD'));
    }

    return segments.join(' + ');
  }, [totalsByCurrency]);

  if (!latestDistribution) {
    return (
      <div className="py-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Обязанности</h3>

          {/* Кнопка создания обязанностей */}
          {canEdit && onEditDuties && (
            <button
              onClick={onEditDuties}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm hover:from-green-700 hover:to-green-800 font-medium transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Распределить обязанности
            </button>
          )}
        </div>
        <p className="text-gray-500 italic">Нет назначенных обязанностей</p>
      </div>
    );
  }

  // Если нет обязанностей (пустое распределение или фильтр по пользователю)
  if (filteredDetails.length === 0) {
    return (
      <div className="py-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Обязанности</h3>

          {/* Кнопка создания обязанностей (только если есть права) */}
          {canEdit && onEditDuties && (
            <button
              onClick={onEditDuties}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm hover:from-green-700 hover:to-green-800 font-medium transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Распределить обязанности
            </button>
          )}
        </div>
        <p className="text-gray-500 italic">
          {showOnlyCurrentUser
            ? 'У вас нет назначенных обязанностей по этой работе'
            : 'Нет назначенных обязанностей'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Обязанности</h3>
            <p className="text-sm text-gray-500">
              Обновлено:{' '}
              {formatDateForDisplay(
                latestDistribution.workHistory.effectiveDate || latestDistribution.createdAt,
              )}
            </p>
          </div>

          {/* Кнопка редактирования обязанностей */}
          {canEdit && onEditDuties && (
            <button
              onClick={onEditDuties}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-5 py-2.5 shadow-sm hover:from-green-700 hover:to-green-800 font-medium transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Распределить обязанности
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
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
                const user = usersMap[detail.user.id];
                const userName = user
                  ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
                  : detail.user.email || (detail.user.firstName && detail.user.lastName)
                    ? `${detail.user.lastName || ''} ${detail.user.firstName || ''}`.trim()
                    : `ID: ${detail.user.id}`;

                // Преобразуем строковые значения в числа для функции formatPayment
                const numericPrice = detail.price ? parseFloat(detail.price) : null;
                const numericPercentage = detail.percentage ? parseFloat(detail.percentage) : null;
                const numericCalculatedValue = detail.calculatedValue
                  ? parseFloat(detail.calculatedValue)
                  : null;
                // Валюта берётся из detail (сохранённая валюта распределения),
                // если не указана — fallback на валюту обязанности
                const detailCurrency = detail.currency || detail.duty.currency;

                return (
                  <tr key={detail.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {detail.duty.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPaymentWithCurrency(
                        numericPrice,
                        numericPercentage,
                        numericCalculatedValue,
                        detailCurrency,
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50">
                <td
                  colSpan={2}
                  className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900"
                >
                  Расходы на обслуживание проекта
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {totalsSummary || '0 ₽'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WorkDuties);
