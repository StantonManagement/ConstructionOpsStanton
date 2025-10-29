import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  PaymentStatus, 
  ProjectStatus, 
  ContractStatus, 
  PriorityLevel,
  getPaymentStatusBadge,
  getProjectStatusBadge,
  getContractStatusBadge,
  getPriorityBadge,
  getStatusLabel,
  getPriorityLabel
} from '@/lib/statusColors';

interface StatusBadgeProps {
  status: PaymentStatus | ProjectStatus | ContractStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
}

/**
 * Type-safe status badge component that automatically maps statuses to appropriate variants
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let variant: string;
  
  if (['draft', 'submitted', 'sms_sent', 'review_queue', 'needs_review', 'ready_for_check', 'approved', 'paid', 'rejected', 'cancelled'].includes(status)) {
    variant = getPaymentStatusBadge(status as PaymentStatus);
  } else if (['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'].includes(status)) {
    variant = getProjectStatusBadge(status as ProjectStatus);
  } else if (['pending', 'active', 'completed', 'terminated'].includes(status)) {
    variant = getContractStatusBadge(status as ContractStatus);
  } else {
    variant = 'outline';
  }

  return (
    <Badge variant={variant as any} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};

/**
 * Type-safe priority badge component
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  return (
    <Badge variant={getPriorityBadge(priority) as any} className={className}>
      {getPriorityLabel(priority)}
    </Badge>
  );
};

/**
 * Payment-specific status badge
 */
export const PaymentStatusBadge: React.FC<{ status: PaymentStatus; className?: string }> = ({ status, className }) => {
  return (
    <Badge variant={getPaymentStatusBadge(status) as any} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};

/**
 * Project-specific status badge
 */
export const ProjectStatusBadge: React.FC<{ status: ProjectStatus; className?: string }> = ({ status, className }) => {
  return (
    <Badge variant={getProjectStatusBadge(status) as any} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};

/**
 * Contract-specific status badge
 */
export const ContractStatusBadge: React.FC<{ status: ContractStatus; className?: string }> = ({ status, className }) => {
  return (
    <Badge variant={getContractStatusBadge(status) as any} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};

