import React from 'react';

interface DrawStatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'funded' | 'rejected';
  className?: string;
}

const statusConfig = {
  draft: { 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    label: 'Draft' 
  },
  submitted: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    label: 'Submitted' 
  },
  approved: { 
    color: 'bg-green-100 text-green-700 border-green-200', 
    label: 'Approved' 
  },
  funded: { 
    color: 'bg-green-600 text-white border-green-600', 
    label: 'Funded' 
  },
  rejected: { 
    color: 'bg-red-100 text-red-700 border-red-200', 
    label: 'Rejected' 
  },
};

export default function DrawStatusBadge({ status, className = '' }: DrawStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
