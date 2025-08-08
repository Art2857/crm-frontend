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
      lastName: 'Сидоров'
    },
    totalDebt: 95000,
    totalAccrued: 100000,
    totalPaid: 5000,
    isPaymentDue: true,
    lastClosureDate: '2024-01-01',
    duties: [
      {
        dutyId: '6',
        dutyName: 'Backend разработка',
        debt: 70000,
        accrued: 75000,
        paid: 5000,
        monthlyAmount: 80000,
        periods: [
          {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            daysInPeriod: 31,
            debt: 70000,
            accrued: 75000
          }
        ]
      },
      {
        dutyId: '7',
        dutyName: 'API дизайн',
        debt: 25000,
        accrued: 25000,
        paid: 0,
        monthlyAmount: 30000,
        periods: [
          {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            daysInPeriod: 31,
            debt: 25000,
            accrued: 25000
          }
        ]
      }
    ]
  },
  {
    workId: '5',
    workName: 'Система аналитики',
    responsibleUser: {
      id: 'resp-2',
      firstName: 'Елена',
      lastName: 'Козлова'
    },
    totalDebt: 60000,
    totalAccrued: 60000,
    totalPaid: 0,
    isPaymentDue: false,
    lastClosureDate: '2024-01-15',
    duties: [
      {
        dutyId: '8',
        dutyName: 'Data Science',
        debt: 60000,
        accrued: 60000,
        paid: 0,
        monthlyAmount: 90000,
        periods: [
          {
            startDate: '2024-01-15',
            endDate: '2024-01-31',
            daysInPeriod: 17,
            debt: 60000,
            accrued: 60000
          }
        ]
      }
    ]
  }
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
    direction: 'SENT'
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
    direction: 'RECEIVED'
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
    direction: 'RECEIVED'
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
    direction: 'SENT'
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
    direction: 'RECEIVED'
  }
]; 