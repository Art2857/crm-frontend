'use client';

import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import {
  CurrencyDollarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../store';

// Импорт новых компонентов
import PaymentStatistics from '../../components/payments/PaymentStatistics';
import PaymentTabs from '../../components/payments/PaymentTabs';
import MyDebtsTab from '../../components/payments/MyDebtsTab';
import PaymentHistoryTab from '../../components/payments/PaymentHistoryTab';
import CalculationModal from '../../components/payments/CalculationModal';
import PaymentModal from '../../components/payments/PaymentModal';
import CustomPaymentModal from '../../components/payments/CustomPaymentModal';
import UserCard from '../../components/payments/UserCard';
import WorkCard from '../../components/payments/WorkCard';
import WorkPeriodSelector from '../../components/payments/WorkPeriodSelector';
import DutyCard from '../../components/payments/DutyCard';
import UserPeriodSelector from '../../components/payments/UserPeriodSelector';

// Импорт типов и данных
import {
  DetailedCalculation,
  PaymentFormData,
  PaymentModalData,
  CustomPaymentFormData,
  WorkDetail,
  ResponsibleUser,
  DutyDetail,
  PeriodCalculation, UserWorkDebt,
  MyDebt,
  DutyDebt
} from '../../types/payments';
import { fetchMyDebts, fetchPaymentHistory, makePayment, createPaymentAndClose } from '../../services/payment';
import { PaymentType } from '../../types/payment';
import { analyticsService } from '../../services/analytics';
import { useNotification } from '../../contexts/NotificationContext';

export default function PaymentsPage() {
  // Получаем данные текущего пользователя из Redux store
  const { user } = useAppSelector((state) => state.auth);
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState<'management' | 'debts' | 'history'>('management');
  const [workPeriodDates, setWorkPeriodDates] = useState<Record<string, string>>({});
  const [userPeriodDates, setUserPeriodDates] = useState<Record<string, string>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Модальные окна
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customPaymentModalOpen, setCustomPaymentModalOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<DetailedCalculation | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentFormData | null>(null);
  const [isUserCalculation, setIsUserCalculation] = useState(false);
  const [calculationType, setCalculationType] = useState<'work' | 'user'>('work');
  const [isDutyCalculation, setIsDutyCalculation] = useState(false);
  const [calculationModalShowPaymentHistory, setCalculationModalShowPaymentHistory] = useState(true);

  // Данные работ с вложенными пользователями (новый формат отображения)
  const [worksData, setWorksData] = useState<WorkDetail[]>([]);
  // Данные пользователей с вложенными работами (новый формат)
  const [usersData, setUsersData] = useState<ResponsibleUser[]>([]);
  // Данные о задолженностях текущего пользователя
  const [myDebts, setMyDebts] = useState<MyDebt[]>([]);

  // Сводный массив пользователей для статистики/бейджей, рассчитывается из worksData
  const responsibleUsersSummary: ResponsibleUser[] = React.useMemo(() => {
    return usersData;
  }, [usersData]);

  /**
   * Преобразует результат аналитики в формат ResponsibleUser[]
   */
  const mapAnalysisToUsers = (analysis: any): ResponsibleUser[] => {
    if (!analysis || !Array.isArray(analysis.users)) return [];

    return analysis.users.map((user: any) => {
      const { userId, firstName, lastName, email } = user;

      let totalDebt = 0;
      let totalAccrued = 0;
      let totalPaid = 0;
      const works: any[] = [];

      user.works?.forEach((work: any) => {
        const salary = Number(work.salary) || 0;
        const workUsers: any[] = [];

        work.usersClosuresWithPeriods.forEach((closureWrap: any) => {
          const { closure, userPeriods, paymentHistory } = closureWrap;

          // Build duty map for this user
          const dutyMap: Record<string, DutyDetail> = {} as any;

          userPeriods?.dutiesPeriods?.forEach((period: any) => {
            period.distributionDetails?.forEach((dd: any) => {
              const dutyId = dd.dutyId;
              if (!dutyMap[dutyId]) {
                const price = Number(dd.price) || 0;
                const perc = Number(dd.percentage) || 0;
                const monthlyAmount = price + (salary * perc) / 100;
                dutyMap[dutyId] = {
                  dutyId,
                  dutyName: dd.duty?.name || '—',
                  monthlyAmount,
                  dailyAmount: monthlyAmount / 30,
                  debt: 0,
                } as any;
              }
              dutyMap[dutyId].debt += Number(dd.calculatedValuePeriod || 0);
            });
          });

          const dutiesArr = Object.values(dutyMap);
          const totalAccruedUser = dutiesArr.reduce((s, d) => s + d.debt, 0);
          const totalPaidUser = (paymentHistory || []).reduce((s, p) => s + p.amount, 0);
          totalAccrued += totalAccruedUser;
          totalPaid += totalPaidUser;
          totalDebt += (totalAccruedUser - totalPaidUser);

          const toIso = (dStr: string | null) => {
            if (!dStr) return null;
            if (dStr.includes('.')) {
              const [day, month, year] = dStr.split('.');
              return `${year}-${month}-${day}`;
            }
            return dStr;
          };

          // Преобразуем историю выплат в правильный формат
          const formattedPaymentHistory = (paymentHistory || []).map((payment: any) => {
            // Отладочная информация
            console.log('Payment from backend:', payment);
            console.log('payment.paymentType:', payment.paymentType);
            console.log('payment.type:', payment.type);

            const paymentType = payment.paymentType || payment.type || 'ADVANCE';
            console.log('Final paymentType:', paymentType);

            return {
              id: payment.id,
              amount: payment.amount,
              type: paymentType,
              description: payment.description || '',
              date: payment.paymentDate,
            };
          });

          workUsers.push({
            userId,
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            totalDebt: totalAccruedUser - totalPaidUser,
            totalAccrued: totalAccruedUser,
            totalPaid: totalPaidUser,
            remainingDebt: totalAccruedUser - totalPaidUser,
            isPaymentDue: (totalAccruedUser - totalPaidUser) > 0,
            lastClosureDate: toIso(closure.closureDate),
            duties: dutiesArr,
            paymentHistory: formattedPaymentHistory,
            userPeriods,
          });
        });

        // Вычисляем общие суммы для работы
        const totalWorkDebt = workUsers.reduce((sum, u) => sum + (u.totalAccrued - u.totalPaid), 0);
        const totalWorkPaid = workUsers.reduce((sum, u) => sum + u.totalPaid, 0);

        works.push({
          workId: work.workId,
          workName: work.workName,
          duties: [],
          totalDebt: totalWorkDebt,
          paidAmount: totalWorkPaid,
          isPaymentDue: totalWorkDebt > 0,
          lastClosureDate: work.createdAt,
          users: workUsers,
          salary: salary,
          rawClosureWraps: work.usersClosuresWithPeriods,
        });
      });

      // Рассчитываем общую выплаченную сумму (не больше начисленного по каждой работе)
      const totalPaidCorrected = works.reduce((sum, work) => {
        const workAccrued = work.users?.reduce((userSum, user) => userSum + user.totalAccrued, 0) || 0;
        const workPaid = work.paidAmount;
        // Учитываем выплаты только в пределах начисленного
        return sum + Math.min(workPaid, workAccrued);
      }, 0);

      // Рассчитываем общий остаток как сумму только положительных остатков по работам
      const remainingDebt = works.reduce((sum, work) => {
        const workRemaining = work.totalDebt;
        return sum + (workRemaining > 0 ? workRemaining : 0);
      }, 0);

              return {
          userId,
          firstName,
          lastName,
          email,
          salaryDay: 15,
          works,
          totalDebt,
          totalAccrued,
          totalPaid: totalPaidCorrected,
          remainingDebt,
          isPaymentDue: remainingDebt > 0,
          lastPaymentDate: null,
          lastPaymentAmount: null,
        };
    });
  };

  const getWorksData = async (data: { endDate?: string, targetWorkId?: string, targetUserId?: string } = {}) => {
    const { endDate, targetWorkId, targetUserId } = data;

    const analysis = await analyticsService.getUserWorksClosurePeriodsAnalysis(
        endDate,
        targetWorkId ? [targetWorkId] : undefined,
        targetUserId
    );
    const mappedUsers = mapAnalysisToUsers(analysis);

    const sortByName = (arr: ResponsibleUser[]) =>
        arr.slice().sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return nameA.localeCompare(nameB, 'ru');
        });

    return sortByName(mappedUsers);
  }

  const fetchWorksData = async (data: { endDate?: string, targetWorkId?: string, targetUserId?: string } = {}) => {
    setLoading(true);
    try {
      const mappedUsers = await getWorksData(data);
      setUsersData(mappedUsers);
    } finally {
      setLoading(false);
    }
  };

  const updateWorksData = async (data: { endDate?: string, targetWorkId?: string, targetUserId?: string } = {}) => {
    setLoading(true);
    try {
      const mappedUsers = await getWorksData(data);
      const updatedUsers = usersData.map((user) => {
        const updatedUserInNewResult = mappedUsers.find((mappedUser) => {
          return mappedUser.userId === user.userId;
        })
        if (updatedUserInNewResult) {
          const works = user.works.map((oldWorkData) => {
            const updatedWorkInNewResult = updatedUserInNewResult.works.find((newWorkData) => {
              return oldWorkData.workId === newWorkData.workId;
            });
            if (updatedWorkInNewResult) return updatedWorkInNewResult;
            return oldWorkData;
          })
          return {
            ...updatedUserInNewResult,
            works,
          };
        }
        return user;
      })
      setUsersData(updatedUsers);
    } finally {
      setLoading(false);
    }
  }

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchWorksData().catch((err) => console.error('Ошибка инициализации выплат', err));
    fetchMyDebtsData().catch((err) => console.error('Ошибка загрузки моих задолженностей', err));
  }, []);

  // Загрузка данных о задолженностях текущего пользователя
  const fetchMyDebtsData = async () => {
    try {
      const myDebtsData = await analyticsService.getMyDebts();
      setMyDebts(myDebtsData.debts as unknown as MyDebt[]);
    } catch (error) {
      console.error('Ошибка загрузки моих задолженностей:', error);
      notification.showError('Не удалось загрузить данные о задолженностях');
    }
  };

  // Утилита: возвращает выбранную дату периода для работы
  function getWorkPeriodDate(workId: string): string {
    if (workPeriodDates[workId]) return workPeriodDates[workId];

    const d = new Date();
    d.setDate(d.getDate() - 1); // вчера
    return d.toISOString().split('T')[0];
  }

  // Утилита: возвращает выбранную дату периода для пользователя
  function getUserPeriodDate(userId: string): string {
    if (userPeriodDates[userId]) return userPeriodDates[userId];

    const d = new Date();
    d.setDate(d.getDate() - 1); // вчера
    return d.toISOString().split('T')[0];
  }

  // Обработчик показа детального расчета
  const handleShowCalculation = async (userId: string, workId: string, dutyId?: string) => {
    try {
      setLoading(true);

      let work: { workId: string, workName: string, lastClosureDate: string, salary: number} | null = null;
      let userWorkEntry: UserWorkDebt | null = null
      let workEntry: WorkDetail | null = null;
      let myDebtData: MyDebt | null = null;

      // Найти пользователя и работу в usersData
      const userData = usersData.find((user) => user.userId === userId);
      if (userData) {
        workEntry = userData.works?.find((work) => work.workId === workId);
        if (workEntry) {
          work = { workId: workEntry.workId, workName: workEntry.workName, lastClosureDate: workEntry.lastClosureDate, salary: workEntry.salary };
          userWorkEntry = workEntry.users?.find((user) => user.userId === userId);
        }
      }

      // Если не нашли – попробуем долги текущего пользователя
      if (!work) {
        const debt = myDebts.find(d => d.workId === workId);
        if (debt) {
          work = { workId: debt.workId, workName: debt.workName, salary: 0 } as any;
          myDebtData = debt;
        }
      }

      if (!work) return;

      // История выплат
      let rawPaymentHistory: any[] = [];
      let paymentHistoryData: any[] = [];
      
      if (userWorkEntry) {
        // История выплат из worksData
        rawPaymentHistory = userWorkEntry.paymentHistory || [];
        paymentHistoryData = rawPaymentHistory.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        type: payment.type,
        description: payment.description || '',
        date: payment.date,
      }));
      } else if (myDebtData) {
        // Для данных из myDebts используем данные о платежах из myDebtData.payments
        paymentHistoryData = (myDebtData.payments || []).map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          type: payment.paymentType,
          description: payment.description || '',
          date: payment.paymentDate,
        }));
      }

      const totalPaidAmount = paymentHistoryData.reduce((sum, p: any) => sum + p.amount, 0);

      // 1. Получаем endDate (до которой смотрим периоды)
      const calculationDate = getWorkPeriodDate(workId);

      // 2. Берём анализ периодов из сохранённых данных worksData, т.к. он уже обновляется при смене даты

      let userPeriodsSource: any | null = null;

      if (userData && workEntry) {
        // Найдём wrap, соответствующий пользователю
        const closureWrap = (workEntry as any).rawClosureWraps?.find((cw: any) => cw.closure.userId === userId);
        if (closureWrap) {
          userPeriodsSource = closureWrap.userPeriods;
        }
      }

      // Функция-парсер даты в формате DD.MM.YYYY -> Date
      const parseRuDate = (dStr: string): Date => {
        const [day, month, year] = dStr.split('.').map(Number);
        return new Date(year, month - 1, day);
      };

      // Подготовка данных периодов
      const periods: PeriodCalculation[] = [];

      // Если это данные из myDebts (для текущего пользователя), используем их
      if (myDebtData) {
        if (dutyId) {
          // Расчет по конкретной обязанности
          const duty = myDebtData.duties.find(d => d.id === dutyId);
          if (duty && duty.calculatedPeriods) {
            // Создаем отдельные периоды для каждого периода из duty.calculatedPeriods
            duty.calculatedPeriods.forEach((period: any) => {
              const startDate = new Date(period.start);
              const endDate = new Date(period.end);
              const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const monthDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
              periods.push({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                days: daysInPeriod,
                monthDays,
                duties: [{
                  dutyId: duty.id,
                  dutyName: duty.name,
                  monthlyAmount: duty.monthlyAmount,
                  calculatedAmount: period.accrued,
                }],
                totalAmount: period.accrued,
              });
            });
          }
        } else {
          // Расчет по всей работе - собираем все уникальные периоды из всех обязанностей
          const allPeriods: any[] = [];
          myDebtData.duties.forEach((duty) => {
            (duty.calculatedPeriods || []).forEach((period: any) => {
              allPeriods.push({
                duty,
                period,
              });
            });
          });
          // Группируем периоды по start/end
          const periodMap = new Map<string, any>();
          allPeriods.forEach(({duty, period}) => {
            const key = period.start + '|' + period.end;
            if (!periodMap.has(key)) {
              periodMap.set(key, []);
            }
            periodMap.get(key).push({ duty, period });
          });
          Array.from(periodMap.entries()).forEach(([key, dutyPeriods]) => {
            const [start, end] = key.split('|');
            const startDate = new Date(start);
            const endDate = new Date(end);
            const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const monthDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            const dutiesForPeriod = dutyPeriods.map(({duty, period}: any) => ({
              dutyId: duty.id,
              dutyName: duty.name,
              monthlyAmount: duty.monthlyAmount,
              calculatedAmount: period.accrued,
            }));
            const totalAmount = dutiesForPeriod.reduce((sum, d) => sum + d.calculatedAmount, 0);
            periods.push({
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              days: daysInPeriod,
              monthDays,
              duties: dutiesForPeriod,
              totalAmount,
            });
          });
        }
      } else if (userPeriodsSource && userPeriodsSource.dutiesPeriods?.length) {
        const salary = Number(work.salary) || 0;

        userPeriodsSource.dutiesPeriods.forEach((p: any) => {
          const periodStartDate = parseRuDate(p.startDate);
          const periodEndDate = parseRuDate(p.endDate);

          const monthDays = new Date(
            periodEndDate.getFullYear(),
            periodEndDate.getMonth() + 1,
            0
          ).getDate();

          const dutiesCalc = p.distributionDetails.map((dd: any) => {
            const price = Number(dd.price) || 0;
            const perc = Number(dd.percentage) || 0;
            const monthlyAmount = price + (salary * perc) / 100;
            return {
              dutyId: dd.dutyId,
              dutyName: dd.duty?.name || '—',
              monthlyAmount,
              calculatedAmount: Math.round(Number(dd.calculatedValuePeriod) || 0),
            };
          });

          // При фильтрации по конкретной dutyId оставляем только нужную обязанность
          const filteredDuties = dutyId
            ? dutiesCalc.filter((d: any) => d.dutyId === dutyId)
            : dutiesCalc;

          if (filteredDuties.length === 0) return; // если после фильтра ничего не осталось

          const totalAmount = filteredDuties.reduce((s: number, d: any) => s + d.calculatedAmount, 0);

          periods.push({
            startDate: p.startDate.split('.').reverse().join('-'), // to ISO YYYY-MM-DD
            endDate: p.endDate.split('.').reverse().join('-'),
            days: p.daysInPeriod,
            monthDays,
            duties: filteredDuties,
            totalAmount,
          });
        });
      }

      // Если по каким-то причинам периодов нет — fallback на пустой расчёт
      if (periods.length === 0) {
        periods.push({
          startDate: work.lastClosureDate || '2024-01-01',
          endDate: calculationDate,
          days: 0,
          monthDays: 0,
          duties: [],
          totalAmount: 0,
        });
      }

      // Для данных из myDebts используем поля из обязанности или работы
      let totalAccrued, totalPaid, remainingDebt;
      
      if (myDebtData) {
        if (dutyId) {
          // Расчет по конкретной обязанности
          const duty = myDebtData.duties.find(d => d.id === dutyId);
          if (duty) {
            totalAccrued = duty.totalAccrued || periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
            totalPaid = duty.totalPaid || 0;
            remainingDebt = duty.totalDebt || (totalAccrued - totalPaid);
          } else {
            totalAccrued = periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
            totalPaid = totalPaidAmount;
            remainingDebt = totalAccrued - totalPaidAmount;
          }
        } else {
          // Расчет по всей работе
          totalAccrued = myDebtData.totalAccrued || periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
          totalPaid = myDebtData.totalPaid || totalPaidAmount;
          remainingDebt = myDebtData.totalDebt || (totalAccrued - totalPaid);
        }
      } else {
        totalAccrued = periods.reduce((sum, pr) => sum + pr.totalAmount, 0);
        totalPaid = totalPaidAmount;
        remainingDebt = totalAccrued - totalPaidAmount;
      }

      // Получаем имя пользователя
      let userName = 'Пользователь';
      let workName = work.workName;
      
      if (userData) {
        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Пользователь';
      }

      const detailedCalc: DetailedCalculation = {
        userId,
        workId,
        userName,
        workName,
        periods,
        totalAccrued,
        totalPaid,
        remainingDebt,
        lastClosureDate: work.lastClosureDate || null,
        paymentHistory: paymentHistoryData,
      };

      setSelectedCalculation(detailedCalc);
      setIsUserCalculation(false);
      setCalculationType('work');
      setIsDutyCalculation(!!dutyId);
      setCalculationModalOpen(true);

      console.log('dutyId: ', dutyId);
      if (dutyId) {
        setCalculationModalShowPaymentHistory(false)
      } else {
        setCalculationModalShowPaymentHistory(true)
      }
    } catch (error) {
      console.error('Ошибка при загрузке расчета:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для показа общего расчета пользователя по всем работам
  const handleShowUserCalculation = async (userId: string) => {
    try {
      setLoading(true);

      const userData = usersData.find(u => u.userId === userId);
      if (!userData || !userData.works || userData.works.length === 0) return;

      // Берем первую работу как основную для отображения
      const firstWork = userData.works[0];

      // Используем уже правильно рассчитанные данные из userData
      const totalAccrued = userData.totalAccrued;
      const totalPaid = userData.totalPaid;
      // Рассчитываем общий остаток как сумму только положительных остатков по работам
      const remainingDebt = userData.works.reduce((sum, work) => {
        const workRemaining = work.totalDebt;
        return sum + (workRemaining > 0 ? workRemaining : 0);
      }, 0);

      // Собираем все обязанности пользователя из всех работ с группировкой по работам
      const allDuties: any[] = [];
      const allPaymentHistory: any[] = [];
      const workGroups: any[] = [];

      userData.works.forEach(work => {
        const userWork = work.users?.find(u => u.userId === userId);
        if (userWork) {
          allDuties.push(...userWork.duties);
          // Собираем историю выплат из всех работ
          if (userWork.paymentHistory && userWork.paymentHistory.length > 0) {
            allPaymentHistory.push(...userWork.paymentHistory);
          }

          // Создаем группу для каждой работы
          if (userWork.duties && userWork.duties.length > 0) {
            workGroups.push({
              workId: work.workId,
              workName: work.workName,
              duties: userWork.duties.map((duty: any, index: number) => ({
                dutyId: `${duty.dutyId}-${index}`, // Добавляем индекс для уникальности ключа
                dutyName: duty.dutyName,
                monthlyAmount: duty.monthlyAmount,
                calculatedAmount: duty.debt,
              }))
            });
          }
        }
      });

      // Сортируем историю выплат по дате (новые сначала)
      const sortedPaymentHistory = allPaymentHistory.sort((a, b) => {
        const dateA = new Date(a.date || a.paymentDate || 0);
        const dateB = new Date(b.date || b.paymentDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Создаем один период с общими обязанностями
      const startDate = firstWork.lastClosureDate || '2024-01-01';
      const endDate = getWorkPeriodDate(firstWork.workId);

      // Рассчитываем количество дней между датами (включительно)
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Отладочная информация
      console.log('Расчет дней для общего расчета пользователя:');
      console.log('startDate:', startDate, 'startDateObj:', startDateObj);
      console.log('endDate:', endDate, 'endDateObj:', endDateObj);

      // Более надежный способ расчета дней
      const startYear = startDateObj.getFullYear();
      const startMonth = startDateObj.getMonth();
      const startDay = startDateObj.getDate();

      const endYear = endDateObj.getFullYear();
      const endMonth = endDateObj.getMonth();
      const endDay = endDateObj.getDate();

      // Создаем даты без времени для точного расчета
      const startDateOnly = new Date(startYear, startMonth, startDay);
      const endDateOnly = new Date(endYear, endMonth, endDay);

      const timeDiff = endDateOnly.getTime() - startDateOnly.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 для включительного подсчета

      console.log('startDateOnly:', startDateOnly);
      console.log('endDateOnly:', endDateOnly);
      console.log('timeDiff (мс):', timeDiff);
      console.log('days:', days);

      // Получаем количество дней в месяце для конечной даты
      const monthDays = new Date(
        endDateObj.getFullYear(),
        endDateObj.getMonth() + 1,
        0
      ).getDate();

      const periods: PeriodCalculation[] = [{
        startDate,
        endDate,
        days,
        monthDays,
        duties: allDuties.map((duty, index) => ({
          dutyId: `${duty.dutyId}-${index}`, // Добавляем индекс для уникальности ключа
          dutyName: duty.dutyName,
          monthlyAmount: duty.monthlyAmount,
          calculatedAmount: duty.debt,
        })),
        workGroups: workGroups, // Добавляем группировку по работам
        totalAmount: totalAccrued,
      }];

      // Получаем имя пользователя
      let userName = 'Пользователь';
      if (userData) {
        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Пользователь';
      }

      const detailedCalc: DetailedCalculation = {
        userId,
        workId: firstWork.workId,
        userName,
        workName: firstWork.workName,
        periods,
        totalAccrued,
        totalPaid,
        remainingDebt,
        lastClosureDate: firstWork.lastClosureDate || null,
        paymentHistory: sortedPaymentHistory, // Общая история выплат из всех работ
      };

      setSelectedCalculation(detailedCalc);
      setIsUserCalculation(true);
      setCalculationType('user');
      setCalculationModalOpen(true);
    } catch (error) {
      console.error('Ошибка при загрузке расчета пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик создания выплаты
  const handleCreatePayment = (userId: string, workId: string, amount: number, userName: string, workName: string, dutyId?: string) => {
    // Устанавливаем данные для PaymentModal
    setSelectedPayment({
      userId,
      workId,
      amount,
      userName,
      workName,
      dutyId,
    });
    setPaymentModalOpen(true);
  };

  // состояние для предзаполнения произвольной выплаты
  const [customPaymentPrefill, setCustomPaymentPrefill] = useState<{ workId: string; userId: string; amount: number } | null>(null);

  // Обработчики раскрытия/скрытия
  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleWorkExpanded = (workId: string) => {
    const newExpanded = new Set(expandedWorks);
    if (newExpanded.has(workId)) {
      newExpanded.delete(workId);
    } else {
      newExpanded.add(workId);
    }
    setExpandedWorks(newExpanded);
  };

  // Обработчики для дат и произвольных выплат
  const handleCreateCustomPayment = () => {
    setCustomPaymentModalOpen(true);
  };

  const { showError } = useNotification();

  const handleWorkPeriodDateChange = async (workId: string, date: string, userId?: string) => {
    if (new Date(date) > new Date()) {
      showError('Дата окончания не может быть в будущем');
      return;
    }

    // Сохраняем предыдущую дату для возможного отката
    const previousDate = getWorkPeriodDate(workId);

    // Обновляем UI сразу (optimistic)
    setWorkPeriodDates((prev) => ({
      ...prev,
      [workId]: date,
    }));

    // Пытаемся получить свежие данные
    try {
      await updateWorksData({ endDate: date, targetWorkId: workId, targetUserId: userId });
    } catch (err: any) {
      // Откатываем дату назад
      setWorkPeriodDates((prev) => ({
        ...prev,
        [workId]: previousDate,
      }));

      const message = err?.message || 'Ошибка при получении данных';
      showError(message);
    }
  };

  const handleUserPeriodDateChange = async (userId: string, date: string) => {
    if (new Date(date) > new Date()) {
      showError('Дата окончания не может быть в будущем');
      return;
    }

    // Сохраняем предыдущую дату для возможного отката
    const previousDate = getUserPeriodDate(userId);
    if (previousDate === date) return;

    // Обновляем UI сразу (optimistic)
    setUserPeriodDates((prev) => ({
      ...prev,
      [userId]: date,
    }));

    const user = usersData.find((userData) => userData.userId === userId);
    user.works.forEach((work) => {
      setWorkPeriodDates((prev) => ({
        ...prev,
        [work.workId]: date,
      }))
    })

    // Пытаемся получить свежие данные
    try {
      await updateWorksData({ endDate: date, targetUserId: userId });
    } catch (err: any) {
      // Откатываем дату назад
      setUserPeriodDates((prev) => ({
        ...prev,
        [userId]: previousDate,
      }));

      const message = err?.message || 'Ошибка при получении данных';
      showError(message);
    }
  };

  /**
   * Обновляет данные после успешной выплаты: перезапрашивает данные по работе
   * и, если открыт модал расчёта, обновляет его содержимое.
   */
  const refreshAfterPayment = async (
    workId: string,
    userId: string,
    dutyId?: string
  ) => {
    try {
      // Обновляем данные для всех работ пользователя, чтобы не потерять другие работы
      const userData = usersData.find(u => u.userId === userId);
      if (!userData || !userData.works) return;

      // Получаем самую раннюю дату из всех работ пользователя
      const dates = userData.works.map(work => getWorkPeriodDate(work.workId));
      const earliestDate = dates.reduce((earliest, current) =>
        current < earliest ? current : earliest, dates[0]
      );

      // Обновляем все данные, так как API не поддерживает фильтрацию по пользователю
      await fetchWorksData({ endDate: earliestDate });

      // Если модальное окно детального расчёта открыто – обновим данные в нём
      if (calculationModalOpen) {
        if (calculationType === 'work') {
          await handleShowCalculation(userId, workId, dutyId);
        } else {
          await handleShowUserCalculation(userId);
        }
      }
    } catch (err) {
      console.error('Не удалось обновить данные после выплаты', err);
    }

    // Обновляем данные о задолженностях текущего пользователя
    await fetchMyDebtsData();
  };

  // Функция для обновления данных после выплаты через общий расчет пользователя
  const refreshAfterUserPayment = async (userId: string) => {
    try {
      // Обновляем данные для всех работ пользователя
      const userData = usersData.find(u => u.userId === userId);
      if (!userData || !userData.works) return;

      // Получаем самую раннюю дату из всех работ пользователя
      const dates = userData.works.map(work => getWorkPeriodDate(work.workId));
      const earliestDate = dates.reduce((earliest, current) =>
        current < earliest ? current : earliest, dates[0]
      );

      // Обновляем все данные, так как API не поддерживает фильтрацию по пользователю
      await updateWorksData({ endDate: earliestDate, targetUserId: userId });

      // Если модальное окно детального расчёта открыто – обновим данные в нём
      if (calculationModalOpen && selectedCalculation) {
        if (calculationType === 'user') {
          await handleShowUserCalculation(userId);
        } else {
          // Если это был расчет конкретной работы, но мы обновляем пользователя,
          // то нужно найти эту работу и обновить расчет
          const userData = usersData.find(u => u.userId === userId);
          if (userData && selectedCalculation.workId) {
            await handleShowCalculation(userId, selectedCalculation.workId);
          }
        }
      }
    } catch (err) {
      console.error('Не удалось обновить данные после выплаты пользователя', err);
    }

    // Обновляем данные о задолженностях текущего пользователя
    await fetchMyDebtsData();
  };

  // Обработчики модальных окон
  const handlePaymentSubmit = async (data: PaymentModalData) => {
    try {
      // Используем новый эндпоинт create-payment-and-close
      const result = await createPaymentAndClose({
        workId: selectedPayment?.workId || '',
        userId: selectedPayment?.userId || '',
        amount: Math.round(data.amount), // Конвертируем в копейки
        paymentDate: data.date, // Текущая дата
        description: data.description,
      });

      if (selectedPayment?.workId && selectedPayment?.userId) {
        await refreshAfterPayment(
          selectedPayment.workId,
          selectedPayment.userId,
          selectedPayment?.dutyId
        );
      }

      // Оптимистично добавляем новую выплату в открытый расчёт
      if (calculationModalOpen && selectedCalculation && result) {
        const newHistItem = {
          id: result.payment.id,
          amount: result.payment.amount,
          type: result.payment.paymentType,
          description: result.payment.description || '',
          date: result.payment.paymentDate,
        };

        setSelectedCalculation((prev) => {
          if (!prev) return prev;
          const paymentHistory = [newHistItem, ...prev.paymentHistory];
          const totalPaid = prev.totalPaid + result.payment.amount;
          return {
            ...prev,
            paymentHistory,
            totalPaid,
            remainingDebt: Math.max(prev.remainingDebt - result.payment.amount, 0),
          };
        });
      }
    } catch (e) {
      console.error('Ошибка создания выплаты', e);
    } finally {
      setPaymentModalOpen(false);
      setSelectedPayment(null);
      // Закрываем модальное окно "Детальный расчет выплаты" после успешного создания выплаты
      setCalculationModalOpen(false);
      setSelectedCalculation(null);
    }
  };

  const handleCustomPaymentSubmit = async (data: CustomPaymentFormData) => {
    try {
      const created = await makePayment({
        workId: data.workId,
        userId: data.userId,
        amount: Math.round(data.amount),
        paymentType: data.type as PaymentType,
        description: data.description,
        paymentDate: data.paymentDate, // Добавлено поле даты выплаты
      });

      // Определяем, нужно ли обновлять данные для всех работ пользователя
      // Если это выплата через общий расчет пользователя
      const isUserCalculation = calculationType === 'user';

      if (isUserCalculation) {
        // Обновляем данные для всех работ пользователя
        await refreshAfterUserPayment(data.userId);
      } else {
        // Обновляем данные только для конкретной работы
        await refreshAfterPayment(data.workId, data.userId);
      }

      if (calculationModalOpen && selectedCalculation && created) {
        if (selectedCalculation.workId === data.workId) {
          const c: any = created as any;
          const newHistItem = {
            id: c.id,
            amount: c.amount,
            type: c.paymentType,
            description: c.description || '',
            date: c.paymentDate,
          };

          setSelectedCalculation((prev) => {
            if (!prev) return prev;
            const paymentHistory = [newHistItem, ...prev.paymentHistory];
            const totalPaid = prev.totalPaid + c.amount;
            const remainingDebt = Math.max(prev.remainingDebt - c.amount, 0);
            return {
              ...prev,
              paymentHistory,
              totalPaid,
              remainingDebt,
            };
          });
        }
      }
    } catch (e) {
      console.error('Ошибка создания произвольной выплаты', e);
    } finally {
      setCustomPaymentModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex items-center space-x-3 mb-4 lg:mb-0">
            <div className="bg-blue-600 p-3 rounded-xl">
              <CurrencyDollarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Система выплат</h1>
              <p className="text-gray-600">Управление выплатами и задолженностями</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Кнопка создания произвольной выплаты */}
            <Button
              onClick={handleCreateCustomPayment}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-3 px-6 py-4 text-lg font-medium shadow-sm border"
            >
              <BanknotesIcon className="h-6 w-6" />
              <span>Создать выплату</span>
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <PaymentStatistics
          responsibleUsers={responsibleUsersSummary}
          myDebts={myDebts}
        />

        {/* Навигация по вкладкам */}
        <PaymentTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          responsibleUsers={responsibleUsersSummary}
          myDebts={myDebts}
        />

        {/* Содержимое вкладок */}
        {activeTab === 'management' && (
          <div className="space-y-6">
            {usersData.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                isExpanded={expandedUsers.has(user.userId)}
                onToggleExpanded={toggleUserExpanded}
                onShowCalculation={(userId) => {
                  handleShowUserCalculation(userId);
                }}
              >
                <div className="space-y-4">
                  {/* Дата расчетного периода для пользователя */}
                  <UserPeriodSelector
                    userId={user.userId}
                    selectedDate={getUserPeriodDate(user.userId)}
                    onDateSet={handleUserPeriodDateChange}
                  />

                  {user.works?.map((work) => (
                    <WorkCard
                      key={work.workId}
                      work={work}
                      isExpanded={expandedWorks.has(work.workId)}
                      onToggleExpanded={toggleWorkExpanded}
                      onShowCalculation={(workId) => {
                        handleShowCalculation(user.userId, workId);
                      }}
                    >
                      <div className="space-y-4">
                        {/* Дата расчетного периода */}
                        <WorkPeriodSelector
                          userId={user.userId}
                          workId={work.workId}
                          selectedDate={getWorkPeriodDate(work.workId)}
                          onDateChange={handleWorkPeriodDateChange}
                        />

                        {/* Обязанности пользователя */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">Обязанности:</h5>
                          <div className="space-y-2">
                            {work.users?.find(u => u.userId === user.userId)?.duties.map((duty, index) => (
                              <DutyCard
                                key={duty.dutyId}
                                duty={duty}
                                index={index}
                                onShowCalculation={(dutyId) => {
                                  handleShowCalculation(user.userId, work.workId, dutyId);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </WorkCard>
                  ))}
                </div>
              </UserCard>
            ))}
          </div>
        )}

        {activeTab === 'debts' && (
          <MyDebtsTab
            myDebts={myDebts}
            onShowCalculation={handleShowCalculation}
          />
        )}

        {activeTab === 'history' && (
          <PaymentHistoryTab currentUserId={user?.id} />
        )}

        {/* Модальные окна */}
        <CalculationModal
          isOpen={calculationModalOpen}
          onClose={() => {
            setCalculationModalOpen(false);
            setSelectedCalculation(null);
            setIsDutyCalculation(false);
          }}
          calculation={selectedCalculation}
          onCreatePayment={handleCreatePayment}
          isDebtsView={myDebts.some(debt => debt.workId === selectedCalculation?.workId) && !isDutyCalculation}
          calculationDate={selectedCalculation ? getWorkPeriodDate(selectedCalculation.workId) : undefined}
          isUserCalculation={isUserCalculation}
          showPaymentHistory={calculationModalShowPaymentHistory}
        />

        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          paymentDate={selectedCalculation ? getWorkPeriodDate(selectedCalculation.workId) : null}
          onSubmit={handlePaymentSubmit}
        />

        <CustomPaymentModal
          isOpen={customPaymentModalOpen}
          onClose={() => {
            setCustomPaymentModalOpen(false);
            setCustomPaymentPrefill(null);
          }}
          onSubmit={handleCustomPaymentSubmit}
          defaultWorkId={customPaymentPrefill?.workId}
          defaultUserId={customPaymentPrefill?.userId}
          defaultAmount={customPaymentPrefill?.amount}
        />
      </div>
    </div>
  );
} 