'use client';

import React from 'react';
import { RefreshCw, FileText, Eye, Trash2 } from 'lucide-react';
import type { PaymentApplication } from './PaymentApplicationRow';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency, getPaymentApplicationStatus, formatDate } from '@/lib/theme';

interface PaymentApplicationListProps {
  applications: PaymentApplication[];
  loading?: boolean;
  onReview?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRefresh?: () => void;
  showSummary?: boolean;
  emptyMessage?: string;
}

const PaymentApplicationList: React.FC<PaymentApplicationListProps> = ({
  applications,
  loading = false,
  onReview,
  onDelete,
  onRefresh,
  showSummary = true,
  emptyMessage = 'No payment applications yet'
}) => {

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
    <div className="bg-white rounded-xl border border-border p-6 shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Payment Applications {applications.length > 0 && `(${applications.length})`}
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={applications}
        emptyMessage={emptyMessage}
        columns={[
          { 
            header: '#', 
            accessor: 'id',
            className: 'w-16'
          },
          { 
            header: 'Date', 
            accessor: (app) => formatDate(app.created_at) 
          },
          { 
            header: 'Status', 
            accessor: (app) => (
              <SignalBadge status={getPaymentApplicationStatus(app.status)}>
                {app.status.replace(/_/g, ' ')}
              </SignalBadge>
            ) 
          },
          { 
            header: 'Amount', 
            align: 'right', 
            accessor: (app) => formatCurrency(app.current_period_amount || app.total_amount || 0) 
          },
          { 
            header: 'Actions', 
            align: 'center', 
            accessor: (app) => {
              const isCompleted = app.status === 'approved' || app.status === 'rejected' || app.status === 'paid';
              const isSubmitted = app.status === 'submitted';

              return (
                <div className="flex items-center justify-center gap-2">
                  {isSubmitted && onReview && (
                    <button
                      onClick={() => onReview(app.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Review
                    </button>
                  )}
                  
                  {isCompleted && onReview && (
                    <button
                      onClick={() => onReview(app.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      View
                    </button>
                  )}

                  {!isSubmitted && !isCompleted && (
                    <span className="text-xs text-muted-foreground italic">Pending</span>
                  )}

                  {onDelete && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete payment application #${app.id}?`)) {
                          onDelete(app.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors"
                      title="Delete payment application"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }
          }
        ]}
      />

      {/* Summary */}
      {showSummary && stats && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Paid:</span>
              <span className="ml-2 font-semibold text-status-success">
                {formatCurrency(stats.totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Approved (Committed):</span>
              <span className="ml-2 font-semibold text-status-success">
                {formatCurrency(stats.totalApproved)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending Review:</span>
              <span className="ml-2 font-semibold text-status-warning">
                {formatCurrency(stats.totalPending)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApplicationList;
