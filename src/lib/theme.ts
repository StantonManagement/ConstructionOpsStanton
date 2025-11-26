// Design System Source of Truth
// All color and threshold decisions live here

export const theme = {
  colors: {
    // Semantic colors - named by MEANING, not appearance
    status: {
      critical: '#DC2626',    // red-600 - immediate attention required
      warning: '#F59E0B',     // amber-500 - monitor this
      success: '#10B981',     // emerald-500 - use sparingly, mostly for confirmations
      neutral: '#6B7280',     // gray-500 - default state
    },
    background: {
      default: '#FFFFFF',     // white - main background
      subtle: '#F9FAFB',      // gray-50 - alternate rows, sections
      elevated: '#FFFFFF',    // white - cards, modals (no shadow tricks)
    },
    text: {
      primary: '#111827',     // gray-900 - main text
      secondary: '#6B7280',   // gray-50 - supporting text
      disabled: '#D1D5DB',    // gray-300 - inactive states
    },
    border: {
      default: '#E5E7EB',     // gray-200 - standard borders
      strong: '#9CA3AF',      // gray-400 - emphasis borders
    },
    interactive: {
      primary: '#3B82F6',     // blue-500 - buttons, links
      hover: '#2563EB',       // blue-600 - hover states
    }
  },
  
  // Business logic thresholds
  budgetStatus: {
    critical: 1.05,    // 105% spent = red alert
    warning: 0.90,     // 90% spent = orange warning
    healthy: 0,        // < 90% = neutral (no color needed)
  },
  
  paymentStatus: {
    overdue: 0,       // days past due = red
    dueSoon: 7,       // days until due = orange
  },
  
  scheduleStatus: {
    delayed: 1,        // days behind schedule = red
    risk: -3,          // 3 days before critical path = orange
  }
}

export type SystemStatus = 'critical' | 'warning' | 'success' | 'neutral';

// Utility functions - use these instead of calculating in components
export function getBudgetStatus(spent: number, budget: number): SystemStatus {
  if (budget === 0) return 'neutral'
  const ratio = spent / budget
  
  if (ratio >= theme.budgetStatus.critical) return 'critical'
  if (ratio >= theme.budgetStatus.warning) return 'warning'
  return 'neutral'
}

export function getPaymentStatus(daysUntilDue: number): SystemStatus {
  if (daysUntilDue < theme.paymentStatus.overdue) return 'critical'  // overdue
  if (daysUntilDue <= theme.paymentStatus.dueSoon) return 'warning'
  return 'neutral'
}

export function getPaymentApplicationStatus(status: string): SystemStatus {
  switch (status?.toLowerCase()) {
    case 'submitted':
    case 'needs_review':
      return 'warning'; // Changed to warning as it needs attention but isn't necessarily bad
    case 'sms_sent':
      return 'neutral';
    case 'approved':
    case 'paid':
    case 'check_ready':
      return 'success';
    case 'rejected':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function formatCurrency(amount: number | null | undefined, showCents: boolean = false): string {
  // Handle null/undefined
  if (amount == null) return '-';
  
  // Show "$-" for zero values (accounting format)
  if (amount === 0) return '$-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount)
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
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
