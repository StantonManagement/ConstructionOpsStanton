import type { PaymentApplication } from '@/app/components/shared/PaymentApplicationRow';

/**
 * Calculate summary statistics for payment applications
 */
export function calculatePaymentStats(apps: PaymentApplication[]) {
  const totalPaid = apps
    .filter(app => app.status === 'paid')
    .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
  
  const totalPending = apps
    .filter(app => app.status === 'submitted')
    .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
  
  const totalApproved = apps
    .filter(app => app.status === 'approved')
    .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
  
  const countByStatus = apps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalPaid,
    totalPending,
    totalApproved,
    count: apps.length,
    countByStatus
  };
}

/**
 * Group payment applications by owner entity
 */
export function groupByEntity(apps: PaymentApplication[]): Record<string, PaymentApplication[]> {
  return apps.reduce((acc, app) => {
    const entityId = app.project?.owner_entity_id || 'unknown';
    if (!acc[entityId]) {
      acc[entityId] = [];
    }
    acc[entityId].push(app);
    return acc;
  }, {} as Record<string, PaymentApplication[]>);
}

/**
 * Group payment applications by property/project
 */
export function groupByProperty(apps: PaymentApplication[]): Record<string, PaymentApplication[]> {
  return apps.reduce((acc, app) => {
    const projectId = app.project?.id?.toString() || 'unknown';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(app);
    return acc;
  }, {} as Record<string, PaymentApplication[]>);
}

/**
 * Group payment applications by contractor
 */
export function groupByContractor(apps: PaymentApplication[]): Record<string, PaymentApplication[]> {
  return apps.reduce((acc, app) => {
    const contractorId = app.contractor?.id?.toString() || 'unknown';
    if (!acc[contractorId]) {
      acc[contractorId] = [];
    }
    acc[contractorId].push(app);
    return acc;
  }, {} as Record<string, PaymentApplication[]>);
}

/**
 * Filter payment applications by date range
 */
export function filterByDateRange(
  apps: PaymentApplication[],
  startDate: Date,
  endDate: Date
): PaymentApplication[] {
  return apps.filter(app => {
    const appDate = new Date(app.created_at);
    return appDate >= startDate && appDate <= endDate;
  });
}

/**
 * Filter payment applications by status
 */
export function filterByStatus(
  apps: PaymentApplication[],
  statuses: string[]
): PaymentApplication[] {
  return apps.filter(app => statuses.includes(app.status));
}

/**
 * Filter payment applications by amount range
 */
export function filterByAmountRange(
  apps: PaymentApplication[],
  minAmount: number,
  maxAmount: number
): PaymentApplication[] {
  return apps.filter(app => {
    const amount = app.current_period_amount || app.total_amount || 0;
    return amount >= minAmount && amount <= maxAmount;
  });
}

/**
 * Sort payment applications
 */
export function sortPaymentApplications(
  apps: PaymentApplication[],
  sortBy: 'date' | 'amount' | 'status' | 'id',
  direction: 'asc' | 'desc' = 'desc'
): PaymentApplication[] {
  const sorted = [...apps].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'amount':
        const amountA = a.current_period_amount || a.total_amount || 0;
        const amountB = b.current_period_amount || b.total_amount || 0;
        comparison = amountA - amountB;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'id':
        comparison = a.id - b.id;
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get status color configuration
 */
export function getStatusColor(status: string): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status?.toLowerCase()) {
    case 'initiated':
    case 'sms_sent':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending SMS' };
    case 'submitted':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Review Queue' };
    case 'approved':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' };
    case 'rejected':
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' };
    case 'paid':
      return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Paid' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
  }
}

