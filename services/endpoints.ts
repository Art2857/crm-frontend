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
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/users`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/users/${id}`,
  me: (role: Role) => `${role?.toLowerCase() || 'user'}/users/me`,
  meHistory: (role: Role) => `${role?.toLowerCase() || 'user'}/users/me/history`,
  history: (role: Role, id: string) =>
    `${role?.toLowerCase() || 'user'}/users/${id}/history`,
  profile: (role: Role, id: string) =>
    `${role?.toLowerCase() || 'user'}/users/${id}/profile`,
  sensitive: (role: Role, id: string) =>
    `${role?.toLowerCase() || 'user'}/users/${id}/sensitive`,
} as const;

export const WORKS_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/works`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/works/${id}`,
  responsible: (role: Role, userId: string) =>
    `${role?.toLowerCase() || 'user'}/works/responsible/${userId}`,
  byDuties: (role: Role, userId: string) =>
    `${role?.toLowerCase() || 'user'}/works/duties/${userId}`,
  executers: (role: Role, workId: string) =>
    `${role?.toLowerCase() || 'user'}/works/${workId}/executers`,
  analytics: (role: Role) => `${role?.toLowerCase() || 'user'}/works/analytics`,
  analyticsArchived: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/works/analytics/archived`,
  analyticsUser: (role: Role, userId: string) =>
    `${role?.toLowerCase() || 'user'}/works/analytics/user/${userId}`,
} as const;

export const WORK_HISTORY_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/work-history`,
  work: (role: Role, workId: string) =>
    `${role?.toLowerCase() || 'user'}/work-history/work/${workId}`,
  latest: (role: Role, workId: string) =>
    `${role?.toLowerCase() || 'user'}/work-history/work/${workId}/latest`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/work-history/${id}`,
} as const;

export const DUTIES_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/duties`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/duties/${id}`,
} as const;

export const DISTRIBUTIONS_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/distributions`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/distributions/${id}`,
  byWorkHistoryId: (role: Role, workHistoryId: string) =>
    `${role?.toLowerCase() || 'user'}/distributions/work-history/${workHistoryId}`,
  byWorkId: (role: Role, workId: string) =>
    `${role?.toLowerCase() || 'user'}/distributions/work/${workId}`,
} as const;

export const DISTRIBUTION_DETAILS_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/distribution-details`,
  byId: (role: Role, id: string) =>
    `${role?.toLowerCase() || 'user'}/distribution-details/${id}`,
} as const;

export const PAYMENTS_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/payments`,
  byId: (role: Role, id: string) => `${role?.toLowerCase() || 'user'}/payments/${id}`,
  history: (role: Role) => `${role?.toLowerCase() || 'user'}/payments/history`,
  createAndClose: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/payments/create-payment-and-close`,
  bulkCreateAndClose: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/payments/bulk-create-and-close`,
} as const;

export const ANALYTICS_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/analytics`,
  userWorks: (role: Role) => `${role?.toLowerCase() || 'user'}/analytics/user/works`,
  myDebts: (role: Role) => `${role?.toLowerCase() || 'user'}/analytics/user/my-debts`,
  paymentsManagement: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/analytics/payments/management`,
  paymentsCalculation: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/analytics/payments/calculation`,
  paymentsCalculationUser: (role: Role) =>
    `${role?.toLowerCase() || 'user'}/analytics/payments/calculation-user`,
} as const;

export const DASHBOARD_ENDPOINTS = {
  base: (role: Role) => `${role?.toLowerCase() || 'user'}/dashboard`,
} as const;

export const HEALTH_ENDPOINTS = {
  base: '/health',
} as const;
