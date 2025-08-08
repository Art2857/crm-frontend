// Моковые данные для системы выплат
import { MyDebt, PaymentHistoryItem } from '../types/payments';

export const myDebts: MyDebt[] = [
  {
    workId: '4',
    workName: 'Мобильное приложение',
    responsibleUser: {
      firstName: 'Алексей',
      lastName: 'Сидоров',
      email: 'alexey@example.com'
    },
    totalDebt: 95000,
    isPaymentDue: true,
    lastClosureDate: '2024-01-01',
    duties: [
      {
        dutyId: '6',
        dutyName: 'Backend разработка',
        monthlyAmount: 80000,
        dailyAmount: 2667,
        debt: 70000
      },
      {
        dutyId: '7',
        dutyName: 'API дизайн',
        monthlyAmount: 30000,
        dailyAmount: 1000,
        debt: 25000
      }
    ]
  },
  {
    workId: '5',
    workName: 'Система аналитики',
    responsibleUser: {
      firstName: 'Елена',
      lastName: 'Козлова',
      email: 'elena@example.com'
    },
    totalDebt: 60000,
    isPaymentDue: false,
    lastClosureDate: '2024-01-15',
    duties: [
      {
        dutyId: '8',
        dutyName: 'Data Science',
        monthlyAmount: 90000,
        dailyAmount: 3000,
        debt: 60000
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