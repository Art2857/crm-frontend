import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import { Work } from '../../types/work';
import { User } from '../../types/user';
import { formatDateForDisplay } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { privateApi } from '../../services/ApiClient';

interface WorkDetailsProps {
  work: Work;
  users: User[];
}

/**
 * Компонент для отображения расширенных деталей работы (метрики, статистика, даты)
 */
const WorkDetails: React.FC<WorkDetailsProps> = ({ work, users }) => {
  // Пока что убираем все секции согласно требованию
  return null;
};

export default WorkDetails;
