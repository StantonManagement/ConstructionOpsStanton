'use client';

import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';

export interface PaymentApplication {
  id: number;
  status: string;
  created_at: string;
  project?: { id: number; name: string; owner_entity_id?: number };
  contractor?: { id: number; name: string };
  total_amount?: number;
  current_period_amount?: number;
  [key: string]: any;
}

interface PaymentApplicationRowProps {
  application: PaymentApplication;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  onVerify?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (app: PaymentApplication) => void;
  showProject?: boolean;
  showContractor?: boolean;
  showActions?: boolean;
  showCheckbox?: boolean;
  customActions?: React.ReactNode;
}

const PaymentApplicationRow: React.FC<PaymentApplicationRowProps> = ({
  application,
  isSelected = false,
  onSelect,
  onVerify,
  onDelete,
  onRowClick,
  showProject = true,
  showContractor = true,
  showActions = true,
  showCheckbox = true,
  customActions
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getActionButton = () => {
    if (customActions) return customActions;
    
    const isCompleted = application.status === 'approved' || application.status === 'rejected' || application.status === 'paid';
    
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVerify?.(application.id);
          }}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            isCompleted
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={isCompleted ? 'View details' : 'Review and verify'}
        >
          <Eye className="w-3 h-3" />
          {isCompleted ? 'View' : 'Review'}
        </button>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(application.id);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
            title="Delete payment application"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <tr 
      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      } ${onRowClick ? 'cursor-pointer' : ''}`}
      onClick={() => onRowClick?.(application)}
    >
      {showCheckbox && onSelect && (
        <td 
          className="px-4 py-3 w-12"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(application.id, !isSelected);
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(application.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
      )}
      
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">#{application.id}</p>
        </div>
      </td>

      {showProject && (
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {application.project?.name || 'N/A'}
            </p>
          </div>
        </td>
      )}

      {showContractor && (
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="text-gray-900 text-sm truncate">
              {application.contractor?.name || 'N/A'}
            </p>
          </div>
        </td>
      )}

      <td className="px-4 py-3">
        <span className="text-gray-900 text-sm font-medium">
          {formatDate(application.created_at)}
        </span>
      </td>

      <td className="px-4 py-3">
        <PaymentStatusBadge status={application.status} size="sm" />
      </td>

      <td className="px-4 py-3 text-right">
        <span className="text-gray-900 text-sm font-semibold">
          {formatCurrency(application.current_period_amount || application.total_amount || 0)}
        </span>
      </td>

      {showActions && (
        <td className="px-4 py-3">
          {getActionButton()}
        </td>
      )}
    </tr>
  );
};

export default PaymentApplicationRow;

