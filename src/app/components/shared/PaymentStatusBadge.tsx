'use client';

import React from 'react';
import { Clock, Check, X, AlertCircle, DollarSign } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = false 
}) => {
  const getStatusConfig = (status: string): StatusConfig => {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
    
    switch (status?.toLowerCase()) {
      case 'initiated':
      case 'sms_sent':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-200',
          label: 'Pending SMS',
          icon: <Clock className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Awaiting contractor response via SMS'
        };
      case 'submitted':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          label: 'Review Queue',
          icon: <AlertCircle className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Ready for project manager review'
        };
      case 'approved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          label: 'Approved',
          icon: <Check className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Approved and committed to budget'
        };
      case 'rejected':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          label: 'Rejected',
          icon: <X className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Payment application rejected'
        };
      case 'paid':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          label: 'Paid',
          icon: <DollarSign className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Payment has been processed'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          label: status || 'Unknown',
          icon: <AlertCircle className={`w-${iconSize} h-${iconSize}`} />,
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bg} ${config.text} ${config.border}
        ${sizeClasses[size]}
      `}
      title={config.description}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

export default PaymentStatusBadge;

