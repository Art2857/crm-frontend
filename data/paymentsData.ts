// Моковые данные для системы выплат
import { MyDebt } from '../services/analytics';
import { PaymentHistoryItem } from '../types/payments';

export const myDebts: MyDebt[] = [
  {
    workId: '4',
    workName: 'Мобильное приложение',
    responsibleUser: {
      id: 'resp-1',
      firstName: 'Алексей',
      lastName: 'Сидоров',
    },
    totalDebt: 95000,
    totalAccrued: 100000,
    totalPaid: 5000,
    isPaymentDue: true,
    lastClosureDate: '2024-01-01',
    payments: [
      {
        id: 'payment-1',
        amount: 5000,
        paymentType: 'ADVANCE',
        description: 'Аванс за январь',
        paymentDate: '2024-01-10',
        createdAt: '2024-01-10T10:00:00Z',
      },
    ],
    duties: [
      {
        id: '6', // ← ИСПРАВЛЕНО: id вместо dutyId
        name: 'Backend разработка', // ← ИСПРАВЛЕНО: name вместо dutyName
        monthlyAmount: 80000,
        totalAccrued: 75000, // ← ИСПРАВЛЕНО: totalAccrued вместо accrued
        totalDebt: 70000, // ← ИСПРАВЛЕНО: totalDebt вместо debt
        totalPaid: 5000, // ← ИСПРАВЛЕНО: totalPaid вместо paid
        calculatedPeriods: [
          // ← ИСПРАВЛЕНО: calculatedPeriods вместо periods
          {
            accrued: 75000,
            debt: 70000,
            paid: 5000,
            start: '2024-01-01', // ← ИСПРАВЛЕНО: start вместо startDate
            end: '2024-01-31', // ← ИСПРАВЛЕНО: end вместо endDate
          },
        ],
      },
      {
        id: '7', // ← ИСПРАВЛЕНО: id вместо dutyId
        name: 'API дизайн', // ← ИСПРАВЛЕНО: name вместо dutyName
        monthlyAmount: 30000,
        totalAccrued: 25000, // ← ИСПРАВЛЕНО: totalAccrued вместо accrued
        totalDebt: 25000, // ← ИСПРАВЛЕНО: totalDebt вместо debt
        totalPaid: 0, // ← ИСПРАВЛЕНО: totalPaid вместо paid
        calculatedPeriods: [
          // ← ИСПРАВЛЕНО: calculatedPeriods вместо periods
          {
            accrued: 25000,
            debt: 25000,
            paid: 0,
            start: '2024-01-01', // ← ИСПРАВЛЕНО: start вместо startDate
            end: '2024-01-31', // ← ИСПРАВЛЕНО: end вместо endDate
          },
        ],
      },
    ],
  },
  {
    workId: '5',
    workName: 'Система аналитики',
    responsibleUser: {
      id: 'resp-2',
      firstName: 'Елена',
      lastName: 'Козлова',
    },
    totalDebt: 60000,
    totalAccrued: 60000,
    totalPaid: 0,
    isPaymentDue: false,
    lastClosureDate: '2024-01-15',
    payments: [],
    duties: [
      {
        id: '8', // ← ИСПРАВЛЕНО: id вместо dutyId
        name: 'Data Science', // ← ИСПРАВЛЕНО: name вместо dutyName
        monthlyAmount: 90000,
        totalAccrued: 60000, // ← ИСПРАВЛЕНО: totalAccrued вместо accrued
        totalDebt: 60000, // ← ИСПРАВЛЕНО: totalDebt вместо debt
        totalPaid: 0, // ← ИСПРАВЛЕНО: totalPaid вместо paid
        calculatedPeriods: [
          // ← ИСПРАВЛЕНО: calculatedPeriods вместо periods
          {
            accrued: 60000,
            debt: 60000,
            paid: 0,
            start: '2024-01-15', // ← ИСПРАВЛЕНО: start вместо startDate
            end: '2024-01-31', // ← ИСПРАВЛЕНО: end вместо endDate
          },
        ],
      },
    ],
  },
];

export const paymentHistory: PaymentHistoryItem[] = [
  {
    id: '1',
    amount: 50000,
    type: 'SALARY',
    description: 'Зарплата за январь',
    date: '2024-01-25',
    fromUser: { firstName: 'Иван', lastName: 'Петров' },
    toUser: { firstName: 'Мария', lastName: 'Иванова' },
    workName: 'Разработка веб-приложения',
    direction: 'SENT',
  },
  {
    id: '2',
    amount: 30000,
    type: 'ADVANCE',
    description: 'Аванс за февраль',
    date: '2024-02-01',
    fromUser: { firstName: 'Алексей', lastName: 'Сидоров' },
    toUser: { firstName: 'Текущий', lastName: 'Пользователь' },
    workName: 'Мобильное приложение',
    direction: 'RECEIVED',
  },
  {
    id: '3',
    amount: 25000,
    type: 'BONUS',
    description: 'Премия за качественную работу',
    date: '2024-01-30',
    fromUser: { firstName: 'Елена', lastName: 'Козлова' },
    toUser: { firstName: 'Текущий', lastName: 'Пользователь' },
    workName: 'Система аналитики',
    direction: 'RECEIVED',
  },
  {
    id: '4',
    amount: 15000,
    type: 'EXTRA',
    description: 'Доплата за переработки',
    date: '2024-01-28',
    fromUser: { firstName: 'Иван', lastName: 'Петров' },
    toUser: { firstName: 'Мария', lastName: 'Иванова' },
    workName: 'Техническая поддержка',
    direction: 'SENT',
  },
  {
    id: '5',
    amount: 40000,
    type: 'SALARY',
    description: 'Частичная зарплата',
    date: '2024-01-20',
    fromUser: { firstName: 'Алексей', lastName: 'Сидоров' },
    toUser: { firstName: 'Текущий', lastName: 'Пользователь' },
    workName: 'Мобильное приложение',
    direction: 'RECEIVED',
  },
];
