// Test utilities for the application
// This file provides mock data and helper functions for testing

// Mock data for testing
export const mockProjects = [
  {
    id: 1,
    name: 'Downtown Office Building Renovation',
    client_name: 'Downtown Corp',
    current_phase: 'Construction',
    daysToInspection: 15,
    atRisk: false,
    budget: 2500000,
    spent: 1250000,
    permits: { building: 'BP-2024-001', electrical: 'EP-2024-002' },
  },
  {
    id: 2,
    name: 'Uptown Project Sample',
    client_name: 'Uptown LLC',
    current_phase: 'Planning',
    daysToInspection: 30,
    atRisk: true,
    budget: 1800000,
    spent: 450000,
    permits: { building: 'BP-2024-003' },
  },
]

export const mockContractors = [
  {
    id: 1,
    name: 'Elite Electrical Services',
    email: 'contact@eliteelectrical.com',
    phone: '+1-555-0101',
    specialty: 'Electrical',
    license_number: 'EL-12345',
    insurance_expiry: '2024-12-31',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Drywall Pro',
    email: 'info@drywallpro.com',
    phone: '+1-555-0102',
    specialty: 'Drywall',
    license_number: 'DW-67890',
    insurance_expiry: '2024-11-30',
    created_at: '2024-01-15T00:00:00Z',
  },
]

export const mockPaymentApplications = [
  {
    id: 1,
    project_id: 1,
    contractor_id: 1,
    application_number: 'App 124',
    period_from: '2024-08-01',
    period_to: '2024-08-31',
    total_amount: 125000,
    status: 'pending',
    submitted_at: '2024-08-12T10:00:00Z',
    created_at: '2024-08-12T10:00:00Z',
  },
  {
    id: 2,
    project_id: 1,
    contractor_id: 2,
    application_number: 'App 102',
    period_from: '2024-08-01',
    period_to: '2024-08-31',
    total_amount: 85000,
    status: 'approved',
    submitted_at: '2024-08-06T14:30:00Z',
    created_at: '2024-08-06T14:30:00Z',
  },
]

export const mockDailyLogs = [
  {
    id: 1,
    project_id: 1,
    date: '2024-08-15',
    weather: 'Sunny',
    temperature: 75,
    work_performed: 'Electrical rough-in completed',
    materials_used: 'Wire, conduit, outlets',
    equipment_used: 'Drills, saws',
    labor_hours: 8,
    notes: 'All electrical rough-in work completed on schedule',
    created_at: '2024-08-15T17:00:00Z',
  },
]

// Mock context value
export const mockDataContextValue = {
  projects: mockProjects,
  contractors: mockContractors,
  paymentApplications: mockPaymentApplications,
  dailyLogs: mockDailyLogs,
  loading: false,
  error: null,
  refreshData: () => {},
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  addContractor: () => {},
  updateContractor: () => {},
  deleteContractor: () => {},
  addPaymentApplication: () => {},
  updatePaymentApplication: () => {},
  deletePaymentApplication: () => {},
  addDailyLog: () => {},
  updateDailyLog: () => {},
  deleteDailyLog: () => {},
}

// Helper function to format currency for testing
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format dates for testing
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
