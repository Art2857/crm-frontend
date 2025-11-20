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
  base: (_role: Role) => `users`,
  byId: (_role: Role, id: string) => `users/${id}`,
  me: (_role: Role) => `users/me`,
  meHistory: (_role: Role) => `users/me/history`,
  history: (_role: Role, id: string) => `users/${id}/history`,
  profile: (_role: Role, id: string) => `users/${id}/profile`,
  sensitive: (_role: Role, id: string) => `users/${id}/sensitive`,
} as const;

export const WORKS_ENDPOINTS = {
  base: (_role: Role) => `works`,
  byId: (_role: Role, id: string) => `works/${id}`,
  responsible: (_role: Role, userId: string) => `works/responsible/${userId}`,
  byDuties: (_role: Role, userId: string) => `works/duties/${userId}`,
  executers: (_role: Role, workId: string) => `works/${workId}/executers`,
  archived: (_role: Role) => `works/admin/archived`,
  analytics: (_role: Role) => `works/admin/analytics`,
  analyticsArchived: (_role: Role) => `works/admin/analytics/archived`,
  analyticsUser: (_role: Role, userId: string) =>
    `works/admin/analytics/user/${userId}`,
} as const;

export const WORK_HISTORY_ENDPOINTS = {
  base: (_role: Role) => `work-history`,
  work: (_role: Role, workId: string) => `work-history/work/${workId}`,
  latest: (_role: Role, workId: string) => `work-history/work/${workId}/latest`,
  byId: (_role: Role, id: string) => `work-history/${id}`,
} as const;

export const DUTIES_ENDPOINTS = {
  base: (_role: Role) => `duties`,
  byId: (_role: Role, id: string) => `duties/${id}`,
} as const;

export const DISTRIBUTIONS_ENDPOINTS = {
  base: (_role: Role) => `distributions`,
  byId: (_role: Role, id: string) => `distributions/${id}`,
  byWorkHistoryId: (_role: Role, workHistoryId: string) =>
    `distributions/work-history/${workHistoryId}`,
  byWorkId: (_role: Role, workId: string) => `distributions/work/${workId}`,
} as const;

export const DISTRIBUTION_DETAILS_ENDPOINTS = {
  // Note: unified controllers do not expose separate distribution-details endpoints currently
  base: (_role: Role) => `distribution-details`,
  byId: (_role: Role, id: string) => `distribution-details/${id}`,
} as const;

export const PAYMENTS_ENDPOINTS = {
  base: (_role: Role) => `payments`,
  byId: (_role: Role, id: string) => `payments/${id}`,
  history: (_role: Role) => `payments/history`,
  createAndClose: (_role: Role) => `payments/create-payment-and-close`,
  bulkCreateAndClose: (_role: Role) => `payments/bulk-create-and-close`,
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
