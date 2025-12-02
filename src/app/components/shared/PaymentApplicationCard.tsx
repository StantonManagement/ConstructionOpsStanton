'use client';

import React from 'react';
import { Eye, Trash2, CheckCircle } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';
import type { PaymentApplication } from './PaymentApplicationRow';

interface PaymentApplicationCardProps {
  application: PaymentApplication;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  onVerify?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClick?: (app: PaymentApplication) => void;
  showProject?: boolean;
  showContractor?: boolean;
  compact?: boolean;
  customActions?: React.ReactNode;
}

const PaymentApplicationCard: React.FC<PaymentApplicationCardProps> = ({
  application,
  isSelected = false,
  onSelect,
  onVerify,
  onDelete,
  onClick,
  showProject = true,
  showContractor = true,
  compact = false,
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

  const isCompleted = application.status === 'approved' || application.status === 'rejected' || application.status === 'paid';

  return (
    <div
      className={`bg-white border rounded-lg p-4 transition-all ${
        isSelected ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(application)}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(application.id, e.target.checked);
              }}
              className="w-4 h-4 text-primary rounded focus:ring-blue-500 cursor-pointer mt-1"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div>
            <p className="text-xs text-gray-500">Payment App #{application.id}</p>
            <PaymentStatusBadge status={application.status} size="sm" />
          </div>
        </div>
        <div className="text-right">
          <p className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-gray-900`}>
            {formatCurrency(application.current_period_amount || application.total_amount || 0)}
          </p>
        </div>
      </div>

      {/* Info Section */}
      {!compact && (
        <div className="space-y-1 mb-3">
          {showContractor && application.contractor?.name && (
            <p className="text-sm text-gray-900 font-medium">
              {application.contractor.name}
            </p>
          )}
          {showProject && application.project?.name && (
            <p className="text-sm text-gray-600">
              {application.project.name}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {formatDate(application.created_at)}
          </p>
        </div>
      )}

      {/* Actions */}
      {!compact && (onVerify || onDelete || customActions) && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {customActions ? (
            customActions
          ) : (
            <>
              {onVerify && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify(application.id);
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <Eye className="w-4 h-4" />
                      View
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Review
                    </>
                  )}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(application.id);
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentApplicationCard;

