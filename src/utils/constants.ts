
// API Endpoints
export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  PAYMENTS: '/api/payments',
  CONTRACTORS: '/api/projects',
  DAILY_LOGS: '/api/daily-log',
  SMS: '/api/sms',
  NOTIFICATIONS: '/api/notifications',
} as const;

// Database Tables
export const TABLES = {
  PROJECTS: 'projects',
  CONTRACTORS: 'project_contractors',
  PAYMENTS: 'payment_applications',
  DAILY_LOGS: 'daily_logs',
  USERS: 'users',
} as const;

// Form Validation
export const VALIDATION = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_AMOUNT: 0,
  REQUIRED_FIELDS: {
    PROJECT: ['name', 'client_name', 'budget'],
    CONTRACTOR: ['name', 'email', 'trade'],
    PAYMENT: ['period_ending', 'application_number'],
  },
} as const;

// UI Constants
export const UI = {
  ITEMS_PER_PAGE: 10,
  MOBILE_BREAKPOINT: 768,
  NOTIFICATION_DURATION: 5000,
} as const;

// Status Options
export const STATUS_OPTIONS = {
  PAYMENT: ['pending', 'approved', 'rejected', 'processing'],
  PROJECT: ['planning', 'active', 'completed', 'on_hold'],
  CONTRACT: ['active', 'completed', 'terminated'],
} as const;
