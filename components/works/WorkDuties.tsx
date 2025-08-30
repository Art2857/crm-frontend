import React, { useMemo } from 'react';
import Card from '../ui/Card';
import { Distribution, DistributionWithDetails } from '../../types/duty';
import { User } from '../../types/user';
import { formatDateForDisplay } from '../../utils/date';
import { formatPayment } from '../../utils/currency';
import { formatCurrency } from '../../utils/currency';

interface WorkDutiesProps {
  distributions: DistributionWithDetails[] | null;
  users: User[];
  workSalary: string;
  currentUserId?: string;
  showOnlyCurrentUser?: boolean;
}

/**
 * Компонент для отображения обязанностей работы
 */
const WorkDuties: React.FC<WorkDutiesProps> = ({
  distributions,
  users,
  workSalary,
  currentUserId,
  showOnlyCurrentUser = false,
}) => {
  // Создаем карту пользователей для быстрого поиска по id
  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((user) => {
      if (user && user.id) {
        map[user.id] = user;
      }
    });
    return map;
  }, [users]);

  // Получаем последнее распределение (самое актуальное)
  const latestDistribution = useMemo<DistributionWithDetails | undefined>(
    () => distributions[0],
    [distributions]
  );

  // Фильтруем детали распределения по текущему пользователю, если нужно
  const filteredDetails = useMemo(() => {
    if (!latestDistribution) return [];

    if (showOnlyCurrentUser && currentUserId) {
      return latestDistribution.details.filter(
        (detail) => detail.user.id === currentUserId
      );
    }

    return latestDistribution.details;
  }, [latestDistribution, showOnlyCurrentUser, currentUserId]);

  if (!latestDistribution) {
    return (
      <Card>
        <div className="py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Обязанности
          </h3>
          <p className="text-gray-500 italic">Нет назначенных обязанностей</p>
        </div>
      </Card>
    );
  }

  // Если показываем только для текущего пользователя и нет обязанностей для него
  if (showOnlyCurrentUser && filteredDetails.length === 0) {
    return (
      <Card>
        <div className="py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Обязанности
          </h3>
          <p className="text-gray-500 italic">
            У вас нет назначенных обязанностей по этой работе
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="pb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Обязанности</h3>
            <p className="text-sm text-gray-500">
              Обновлено:{' '}
              {formatDateForDisplay(
                latestDistribution.workHistory.effectiveDate ||
                  latestDistribution.createdAt
              )}
            </p>
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
                    : detail.user.email ||
                        (detail.user.firstName && detail.user.lastName)
                      ? `${detail.user.lastName || ''} ${detail.user.firstName || ''}`.trim()
                      : `ID: ${detail.user.id}`;

                  // Преобразуем строковые значения в числа для функции formatPayment
                  const numericPrice = detail.price
                    ? parseFloat(detail.price)
                    : null;
                  const numericPercentage = detail.percentage
                    ? parseFloat(detail.percentage)
                    : null;
                  const numericCalculatedValue = detail.calculatedValue
                    ? parseFloat(detail.calculatedValue)
                    : null;

                  return (
                    <tr key={detail.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detail.duty.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPayment(
                          numericPrice,
                          numericPercentage,
                          numericCalculatedValue
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(WorkDuties);
