'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import PaymentApplicationRow, { type PaymentApplication } from './PaymentApplicationRow';
import PaymentApplicationCard from './PaymentApplicationCard';

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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading payment applications...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
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
      <div className="hidden lg:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {enableBulkActions && (
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                {showProject && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Project
                  </th>
                )}
                {showContractor && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contractor
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                {(onVerify || onDelete) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map((app) => (
                <PaymentApplicationRow
                  key={app.id}
                  application={app}
                  isSelected={selectedIds.includes(app.id)}
                  onSelect={handleSelectItem}
                  onVerify={onVerify}
                  onDelete={onDelete}
                  onRowClick={onRowClick}
                  showProject={showProject}
                  showContractor={showContractor}
                  showCheckbox={enableBulkActions}
                />
              ))}
            </tbody>
          </table>
        </div>
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

