'use client';

import React from 'react';
import { RefreshCw, FileText, Eye } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';
import type { PaymentApplication } from './PaymentApplicationRow';

interface PaymentApplicationListProps {
  applications: PaymentApplication[];
  loading?: boolean;
  onReview?: (id: number) => void;
  onRefresh?: () => void;
  showSummary?: boolean;
  emptyMessage?: string;
}

const PaymentApplicationList: React.FC<PaymentApplicationListProps> = ({
  applications,
  loading = false,
  onReview,
  onRefresh,
  showSummary = true,
  emptyMessage = 'No payment applications yet'
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

  const getActionButton = (app: PaymentApplication) => {
    const isCompleted = app.status === 'approved' || app.status === 'rejected' || app.status === 'paid';
    
    if (app.status === 'submitted') {
      return (
        <button
          onClick={() => onReview?.(app.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Review
        </button>
      );
    }
    
    if (isCompleted) {
      return (
        <button
          onClick={() => onReview?.(app.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-md text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-3 h-3" />
          View
        </button>
      );
    }
    
    return (
      <span className="text-xs text-gray-500 italic">Pending</span>
    );
  };

  // Calculate summary stats
  const stats = React.useMemo(() => {
    if (!showSummary) return null;
    
    const totalPaid = applications
      .filter(app => app.status === 'paid')
      .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
    
    const totalApproved = applications
      .filter(app => app.status === 'approved')
      .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
    
    const totalPending = applications
      .filter(app => app.status === 'submitted')
      .reduce((sum, app) => sum + (app.current_period_amount || app.total_amount || 0), 0);
    
    return { totalPaid, totalApproved, totalPending };
  }, [applications, showSummary]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-sm text-gray-500">Loading payment applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Payment Applications {applications.length > 0 && `(${applications.length})`}
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Empty State */}
      {applications.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-sm text-gray-900">
                      {app.id}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(app.current_period_amount || app.total_amount || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {getActionButton(app)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {showSummary && stats && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {formatCurrency(stats.totalPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Approved (Committed):</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {formatCurrency(stats.totalApproved)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Pending Review:</span>
                  <span className="ml-2 font-semibold text-yellow-600">
                    {formatCurrency(stats.totalPending)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentApplicationList;

