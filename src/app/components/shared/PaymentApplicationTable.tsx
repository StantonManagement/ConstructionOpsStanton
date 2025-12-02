'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import PaymentApplicationRow, { type PaymentApplication } from './PaymentApplicationRow';
import PaymentApplicationCard from './PaymentApplicationCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency, getPaymentApplicationStatus, formatDate } from '@/lib/theme';

export interface ColumnConfig {
  key: string;
  label: string;
  render: (app: PaymentApplication) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface PaymentApplicationTableProps {
  applications: PaymentApplication[];
  loading?: boolean;
  onVerify?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDeleteMultiple?: (ids: number[]) => void;
  onApproveMultiple?: (ids: number[]) => void;
  onRowClick?: (app: PaymentApplication) => void;
  showProject?: boolean;
  showContractor?: boolean;
  enableBulkActions?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  customColumns?: ColumnConfig[];
  emptyMessage?: string;
}

const PaymentApplicationTable: React.FC<PaymentApplicationTableProps> = ({
  applications,
  loading = false,
  onVerify,
  onDelete,
  onDeleteMultiple,
  onApproveMultiple,
  onRowClick,
  showProject = true,
  showContractor = true,
  enableBulkActions = false,
  enablePagination = false,
  pageSize = 20,
  customColumns,
  emptyMessage = 'No payment applications found'
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const paginatedApps = useMemo(() => {
    if (!enablePagination) return applications;
    const start = (currentPage - 1) * pageSize;
    return applications.slice(start, start + pageSize);
  }, [applications, currentPage, pageSize, enablePagination]);

  const totalPages = Math.ceil(applications.length / pageSize);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedApps.map(app => app.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const allSelected = paginatedApps.length > 0 && selectedIds.length === paginatedApps.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < paginatedApps.length;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-gray-500">Loading payment applications...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="bg-white border border-border rounded-lg p-12 text-center shadow-none">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-muted-foreground font-medium">{emptyMessage}</p>
      </div>
    );
  }

  const columns: Column<PaymentApplication>[] = [
    ...(enableBulkActions ? [{
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input: HTMLInputElement | null) => { 
            if (input) input.indeterminate = someSelected && !allSelected; 
          }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
          className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
        />
      ),
      accessor: (app: PaymentApplication) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(app.id)}
          onChange={(e) => { e.stopPropagation(); handleSelectItem(app.id, e.target.checked); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
        />
      ),
      className: "w-12"
    } as Column<PaymentApplication>] : []),
    
    { 
      header: 'ID', 
      accessor: (app) => <span className="text-xs text-muted-foreground">#{app.id}</span>,
      className: 'w-16' 
    },
    
    ...(showProject ? [{
      header: 'Project',
      accessor: (app: PaymentApplication) => (
        <span className="font-medium text-foreground text-sm truncate block max-w-[150px]" title={app.project?.name}>
          {app.project?.name || 'N/A'}
        </span>
      )
    } as Column<PaymentApplication>] : []),

    ...(showContractor ? [{
      header: 'Contractor',
      accessor: (app: PaymentApplication) => (
        <span className="text-foreground text-sm truncate block max-w-[150px]" title={app.contractor?.name}>
          {app.contractor?.name || 'N/A'}
        </span>
      )
    } as Column<PaymentApplication>] : []),

    { 
      header: 'Date', 
      accessor: (app) => <span className="text-sm">{formatDate(app.created_at)}</span>
    },

    { 
      header: 'Due Date', 
      accessor: (app) => <span className="text-sm">{app.due_date ? formatDate(app.due_date) : '-'}</span>,
      className: 'hidden md:table-cell'
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
      align: 'right' as const,
      accessor: (app) => (
        <span className="font-semibold text-foreground text-sm">
          {formatCurrency(app.current_period_amount || app.total_amount || 0)}
        </span>
      )
    },

    ...((onVerify || onDelete) ? [{
      header: 'Actions',
      align: 'right' as const,
      accessor: (app: PaymentApplication) => {
        const isCompleted = app.status === 'approved' || app.status === 'rejected' || app.status === 'paid';
        
        return (
          <div className="flex justify-end gap-2">
            {onVerify && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerify(app.id);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isCompleted ? 'View' : 'Review'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(app.id);
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-status-critical hover:bg-red-50 rounded-md transition-colors"
                title="Delete payment application"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            )}
          </div>
        );
      }
    } as Column<PaymentApplication>] : [])
  ];

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedIds.length > 0 && (
        <div className="bg-primary/10 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {onApproveMultiple && (
              <button
                onClick={() => onApproveMultiple(selectedIds)}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Approve Selected
              </button>
            )}
            {onDeleteMultiple && (
              <button
                onClick={() => {
                  onDeleteMultiple(selectedIds);
                  setSelectedIds([]);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white border border-border rounded-lg overflow-hidden shadow-none">
        <DataTable
          data={paginatedApps}
          columns={columns}
          onRowClick={onRowClick}
          className="border-0 rounded-none"
        />
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {paginatedApps.map((app) => (
          <PaymentApplicationCard
            key={app.id}
            application={app}
            isSelected={selectedIds.includes(app.id)}
            onSelect={enableBulkActions ? handleSelectItem : undefined}
            onVerify={onVerify}
            onDelete={onDelete}
            onClick={onRowClick}
            showProject={showProject}
            showContractor={showContractor}
          />
        ))}
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, applications.length)} of {applications.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApplicationTable;

