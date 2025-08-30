'use client';

import React, { useState } from 'react';
import { WorkAnalyticsByResponsible } from '../../types/workAnalytics';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ResponsibleWorkGroup from './ResponsibleWorkGroup';

interface WorkAnalyticsViewProps {
  grouped: WorkAnalyticsByResponsible[];
  onCreateWork?: () => void;
  onViewWork?: (workId: string) => void;
  userRole?: string;
  showArchived?: boolean;
}

export default function WorkAnalyticsView({
  grouped,
  onCreateWork,
  onViewWork,
  userRole,
  showArchived = false,
}: WorkAnalyticsViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (responsibleUserId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(responsibleUserId)) {
      newExpanded.delete(responsibleUserId);
    } else {
      newExpanded.add(responsibleUserId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Группированные данные с сортировкой по доходу */}
      {grouped
        .sort((a, b) => {
          // Сортируем по доходу в убывающем порядке
          return b.totals.totalIncome - a.totals.totalIncome;
        })
        .map((group) => (
          <ResponsibleWorkGroup
            key={group.responsibleUserId}
            group={group}
            isExpanded={expandedGroups.has(group.responsibleUserId)}
            onToggle={() => toggleGroup(group.responsibleUserId)}
            onViewWork={(workId) => onViewWork?.(workId)}
            showArchived={showArchived}
          />
        ))}

      {grouped.length === 0 && (
        <Card className="p-10 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Нет данных для анализа
            </h3>
            <p className="text-gray-500 mb-6">
              Создайте работы и назначьте ответственных для просмотра
              аналитической информации
            </p>
            {userRole === 'ADMIN' && (
              <Button
                onClick={onCreateWork}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg px-6 py-3 shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200"
              >
                Создать первую работу
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
