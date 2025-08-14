import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { DataContext } from '@/context/DataContext'

// Mock data for testing
export const mockProjects = [
  {
    id: '1',
    name: 'Downtown Office Building Renovation',
    address: '123 Main St, Downtown, DC',
    start_date: '2024-01-15',
    end_date: '2024-12-31',
    status: 'active',
    budget: 2500000,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Uptown Project Sample',
    address: '456 Oak Ave, Uptown, DC',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    status: 'active',
    budget: 1800000,
    created_at: '2024-01-15T00:00:00Z',
  },
]

export const mockContractors = [
  {
    id: '1',
    name: 'Elite Electrical Services',
    email: 'contact@eliteelectrical.com',
    phone: '+1-555-0101',
    specialty: 'Electrical',
    license_number: 'EL-12345',
    insurance_expiry: '2024-12-31',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
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
    id: '1',
    project_id: '1',
    contractor_id: '1',
    application_number: 'App 124',
    period_from: '2024-08-01',
    period_to: '2024-08-31',
    total_amount: 125000,
    status: 'pending',
    submitted_at: '2024-08-12T10:00:00Z',
    created_at: '2024-08-12T10:00:00Z',
  },
  {
    id: '2',
    project_id: '1',
    contractor_id: '2',
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
    id: '1',
    project_id: '1',
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
  refreshData: jest.fn(),
  addProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  addContractor: jest.fn(),
  updateContractor: jest.fn(),
  deleteContractor: jest.fn(),
  addPaymentApplication: jest.fn(),
  updatePaymentApplication: jest.fn(),
  deletePaymentApplication: jest.fn(),
  addDailyLog: jest.fn(),
  updateDailyLog: jest.fn(),
  deleteDailyLog: jest.fn(),
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  dataContextValue?: typeof mockDataContextValue
}

export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { dataContextValue = mockDataContextValue, ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataContext.Provider value={dataContextValue}>
        {children}
      </DataContext.Provider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }

// Also export jest functions for convenience
export { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
