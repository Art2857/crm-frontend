// Централизованные пути API

import { Role } from '../types/user';

export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
} as const;

export const USERS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/users`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/users/${id}`,
  me: (role: Role) => `${role.toLowerCase()}/users/me`,
  meHistory: (role: Role) => `${role.toLowerCase()}/users/me/history`,
  history: (role: Role, id: string) =>
    `${role.toLowerCase()}/users/${id}/history`,
  profile: (role: Role, id: string) =>
    `${role.toLowerCase()}/users/${id}/profile`,
  sensitive: (role: Role, id: string) =>
    `${role.toLowerCase()}/users/${id}/sensitive`,
} as const;

export const WORKS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/works`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/works/${id}`,
  responsible: (role: Role, userId: string) =>
    `${role.toLowerCase()}/works/responsible/${userId}`,
  byDuties: (role: Role, userId: string) =>
    `${role.toLowerCase()}/works/duties/${userId}`,
  executers: (role: Role, workId: string) =>
    `${role.toLowerCase()}/works/${workId}/executers`,
} as const;

export const WORK_HISTORY_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/work-history`,
  work: (role: Role, workId: string) =>
    `${role.toLowerCase()}/work-history/work/${workId}`,
  latest: (role: Role, workId: string) =>
    `${role.toLowerCase()}/work-history/work/${workId}/latest`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/work-history/${id}`,
} as const;

export const DUTIES_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/duties`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/duties/${id}`,
} as const;

export const DISTRIBUTIONS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/distributions`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/distributions/${id}`,
  byWorkHistoryId: (role: Role, workHistoryId: string) =>
    `${role.toLowerCase()}/distributions/work-history/${workHistoryId}`,
  byWorkId: (role: Role, workId: string) =>
    `${role.toLowerCase()}/distributions/work/${workId}`,
} as const;

export const DISTRIBUTION_DETAILS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/distribution-details`,
  byId: (role: Role, id: string) =>
    `${role.toLowerCase()}/distribution-details/${id}`,
} as const;

export const PAYMENTS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/payments`,
  byId: (role: Role, id: string) => `${role.toLowerCase()}/payments/${id}`,
  history: (role: Role) => `${role.toLowerCase()}/payments/history`,
  createAndClose: (role: Role) =>
    `${role.toLowerCase()}/payments/create-payment-and-close`,
  bulkCreateAndClose: (role: Role) =>
    `${role.toLowerCase()}/payments/bulk-create-and-close`,
} as const;

export const ANALYTICS_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/analytics`,
  userWorks: (role: Role) => `${role.toLowerCase()}/analytics/user/works`,
  myDebts: (role: Role) => `${role.toLowerCase()}/analytics/user/my-debts`,
  paymentsManagement: (role: Role) =>
    `${role.toLowerCase()}/analytics/payments/management`,
  paymentsCalculation: (role: Role) =>
    `${role.toLowerCase()}/analytics/payments/calculation`,
  paymentsCalculationUser: (role: Role) =>
    `${role.toLowerCase()}/analytics/payments/calculation-user`,
} as const;

export const DASHBOARD_ENDPOINTS = {
  base: (role: Role) => `${role.toLowerCase()}/dashboard`,
} as const;

export const HEALTH_ENDPOINTS = {
  base: '/health',
} as const;
