// Централизованные пути API - Унифицированные endpoints

export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
} as const;

export const USERS_ENDPOINTS = {
  base: '/users',
  byId: (id: string) => `/users/${id}`,
  me: '/users/me',
  meHistory: '/users/me/history',
  history: (id: string) => `/users/${id}/history`,
  profile: (id: string) => `/users/${id}/profile`,
  sensitive: (id: string) => `/users/${id}/sensitive`,
  archived: '/users/archived/list',
  archive: (id: string) => `/users/${id}/archive`,
  restore: (id: string) => `/users/${id}/restore`,
} as const;

export const WORKS_ENDPOINTS = {
  base: '/works',
  byId: (id: string) => `/works/${id}`,
  responsible: (userId: string) => `/works/responsible/${userId}`,
  byDuties: (userId: string) => `/works/duties/${userId}`,
  executers: (workId: string) => `/works/${workId}/executers`,
  analytics: '/works/analytics',
  analyticsArchived: '/works/analytics/archived',
  analyticsUser: (userId: string) => `/works/analytics/user/${userId}`,
} as const;

export const WORK_HISTORY_ENDPOINTS = {
  base: '/work-history',
  work: (workId: string) => `/work-history/work/${workId}`,
  latest: (workId: string) => `/work-history/work/${workId}/latest`,
  byId: (id: string) => `/work-history/${id}`,
} as const;

export const DUTIES_ENDPOINTS = {
  base: '/duties',
  byId: (id: string) => `/duties/${id}`,
} as const;

export const DISTRIBUTIONS_ENDPOINTS = {
  base: '/distributions',
  byId: (id: string) => `/distributions/${id}`,
  byWorkHistoryId: (workHistoryId: string) => `/distributions/work-history/${workHistoryId}`,
  byWorkId: (workId: string) => `/distributions/work/${workId}`,
} as const;

export const DISTRIBUTION_DETAILS_ENDPOINTS = {
  base: '/distribution-details',
  byId: (id: string) => `/distribution-details/${id}`,
} as const;

export const PAYMENTS_ENDPOINTS = {
  base: '/payments',
  byId: (id: string) => `/payments/${id}`,
  history: '/payments/history',
  createAndClose: '/payments/create-payment-and-close',
  bulkCreateAndClose: '/payments/bulk-create-and-close',
  closePeriod: '/payments/close-period',
} as const;

export const ANALYTICS_ENDPOINTS = {
  base: '/analytics',
  userWorks: '/analytics/user/works',
  myDebts: '/analytics/user/my-debts',
  paymentsManagement: '/analytics/payments/management',
  paymentsCalculation: '/analytics/payments/calculation',
  paymentsCalculationUser: '/analytics/payments/calculation-user',
} as const;

export const DASHBOARD_ENDPOINTS = {
  base: '/dashboard',
} as const;

export const HEALTH_ENDPOINTS = {
  base: '/health',
} as const;
