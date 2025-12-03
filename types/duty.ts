export interface Duty {
  id: string;
  name: string;
  basePrice: string | null;
  basePercentage: string | null;
  currency?: 'RUB' | 'USD';
  minValue: string | null;
  maxValue: string | null;
  createdAt: string;
  updatedAt: string;
}

// Представление группы деталей распределения, связанных с одной записью истории работы
export interface Distribution {
  workHistory: {
    id: string;
    workId: string;
    name: string;
    responsibleUserId: string;
    salary: string;
    date: string;
    effectiveDate?: string; // Date as ISO string
  };
  details: DistributionDetail[];
  createdAt: string;
}

export interface DistributionDetail {
  id: string;
  workHistoryId: string;
  dutyId: string;
  userId: string;
  price: string | null;
  percentage: string | null;
  calculatedValue: string | null;
  currency?: 'RUB' | 'USD';
  createdAt: string;
  duty?: Duty;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CreateDutyDto {
  name: string;
  basePrice?: string | null;
  basePercentage?: string | null;
  currency?: 'RUB' | 'USD';
  minValue?: string | null;
  maxValue?: string | null;
}

export interface UpdateDutyDto {
  name?: string;
  basePrice?: string | null;
  basePercentage?: string | null;
  currency?: 'RUB' | 'USD';
  minValue?: string | null;
  maxValue?: string | null;
}

export interface CreateDistributionDto {
  workHistoryId: string;
  effectiveDate?: string; // Date as ISO string
  details: {
    dutyId: string;
    userId: string;
    price?: string | null;
    percentage?: string | null;
    currency?: 'RUB' | 'USD';
  }[];
}

/**
 * Сокращённое представление обязанности в ответе распределения
 * (соответствует DutyResponseDto на бэкенде)
 */
export interface DutyInDistribution {
  id: string;
  name: string;
  basePrice: number | null;
  basePercentage: number | null;
  currency: 'RUB' | 'USD';
}

export interface DistributionWithDetails extends Distribution {
  details: (DistributionDetail & {
    duty: DutyInDistribution;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  })[];
}
