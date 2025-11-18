/**
 * Status color utilities for construction operations
 * Maps construction-specific statuses to appropriate color schemes
 */

export type PaymentStatus = 
  | 'draft'
  | 'submitted'
  | 'sms_sent'
  | 'review_queue'
  | 'needs_review'
  | 'ready_for_check'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type ProjectStatus = 
  | 'planning'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type PriorityLevel = 
  | 'emergency'
  | 'high'
  | 'normal'
  | 'low';

export type ContractStatus = 
  | 'pending'
  | 'active'
  | 'completed'
  | 'terminated';

/**
 * Maps payment statuses to badge variants
 */
export const getPaymentStatusBadge = (status: PaymentStatus): string => {
  const statusMap: Record<PaymentStatus, string> = {
    draft: 'outline',
    submitted: 'review-queue',
    sms_sent: 'sms-sent',
    review_queue: 'review-queue',
    needs_review: 'review-queue',
    ready_for_check: 'ready-checks',
    approved: 'ready-checks',
    paid: 'paid',
    rejected: 'rejected',
    cancelled: 'destructive',
  };
  
  return statusMap[status] || 'outline';
};

/**
 * Maps project statuses to badge variants
 */
export const getProjectStatusBadge = (status: ProjectStatus): string => {
  const statusMap: Record<ProjectStatus, string> = {
    planning: 'new',
    in_progress: 'in-progress',
    on_hold: 'waiting',
    completed: 'completed',
    cancelled: 'destructive',
  };
  
  return statusMap[status] || 'outline';
};

/**
 * Maps priority levels to badge variants
 */
export const getPriorityBadge = (priority: PriorityLevel): string => {
  const priorityMap: Record<PriorityLevel, string> = {
    emergency: 'emergency',
    high: 'high',
    normal: 'normal',
    low: 'low',
  };
  
  return priorityMap[priority] || 'normal';
};

/**
 * Maps contract statuses to badge variants
 */
export const getContractStatusBadge = (status: ContractStatus): string => {
  const statusMap: Record<ContractStatus, string> = {
    pending: 'pending',
    active: 'in-progress',
    completed: 'completed',
    terminated: 'destructive',
  };
  
  return statusMap[status] || 'outline';
};

/**
 * Gets the appropriate icon color for a status
 */
export const getStatusIconColor = (status: PaymentStatus | ProjectStatus | ContractStatus): string => {
  const iconColorMap: Record<string, string> = {
    // Payment statuses
    draft: 'text-muted-foreground',
    submitted: 'text-[var(--status-critical-text)]',
    sms_sent: 'text-[var(--status-warning-text)]',
    review_queue: 'text-[var(--status-critical-text)]',
    needs_review: 'text-[var(--status-critical-text)]',
    ready_for_check: 'text-[var(--status-success-text)]',
    approved: 'text-[var(--status-success-text)]',
    paid: 'text-[var(--status-success-text)]',
    rejected: 'text-[var(--status-critical-text)]',
    cancelled: 'text-[var(--status-critical-text)]',
    
    // Project statuses
    planning: 'text-[var(--status-warning-text)]',
    in_progress: 'text-primary',
    on_hold: 'text-[var(--status-warning-text)]',
    completed: 'text-[var(--status-success-text)]',
    
    // Contract statuses
    pending: 'text-[var(--status-warning-text)]',
    active: 'text-primary',
    terminated: 'text-[var(--status-critical-text)]',
  };
  
  return iconColorMap[status] || 'text-muted-foreground';
};

/**
 * Gets the appropriate background color for status cards
 */
export const getStatusCardColor = (status: PaymentStatus | ProjectStatus): string => {
  const cardColorMap: Record<string, string> = {
    // Payment statuses
    draft: 'bg-[var(--status-neutral-bg)] border-border',
    submitted: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)]',
    sms_sent: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
    review_queue: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)]',
    ready_for_check: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)]',
    paid: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)]',
    rejected: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)]',
    cancelled: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)]',
    
    // Project statuses
    planning: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
    in_progress: 'bg-primary/10 border-primary/20',
    on_hold: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
    completed: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)]',
  };
  
  return cardColorMap[status] || 'bg-[var(--status-neutral-bg)] border-border';
};

/**
 * Gets human-readable status labels
 */
export const getStatusLabel = (status: PaymentStatus | ProjectStatus | ContractStatus): string => {
  const labelMap: Record<string, string> = {
    // Payment statuses
    draft: 'Draft',
    submitted: 'Submitted',
    sms_sent: 'SMS Sent',
    review_queue: 'Review Queue',
    needs_review: 'Needs Review',
    ready_for_check: 'Ready for Check',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    
    // Project statuses
    planning: 'Planning',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    
    // Contract statuses
    pending: 'Pending',
    active: 'Active',
    terminated: 'Terminated',
  };
  
  return labelMap[status] || status;
};

/**
 * Gets priority labels
 */
export const getPriorityLabel = (priority: PriorityLevel): string => {
  const priorityMap: Record<PriorityLevel, string> = {
    emergency: 'Emergency',
    high: 'High',
    normal: 'Normal',
    low: 'Low',
  };
  
  return priorityMap[priority] || 'Normal';
};
