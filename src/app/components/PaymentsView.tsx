'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, Filter, Search, RefreshCw, CheckCircle, CheckCircle2, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Eye, Trash2, Building } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { generateG703Pdf } from '@/lib/g703Pdf';
import { Badge } from '@/components/ui/badge';
import { getPaymentStatusBadge, getStatusLabel, getStatusIconColor, PaymentStatus } from '@/lib/statusColors';
import { useModal } from '../context/ModalContext';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { SystemStatus } from '@/lib/theme';

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Compact Stat Card Component
function CompactStatCard({ icon, label, value, change, color, onClick, isActive }: any) {
  return (
    <div 
      className={`bg-card border rounded p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border hover:border-primary/50'
      } ${onClick ? 'hover:border-primary/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${color} rounded flex items-center justify-center text-white`}>
            <span className="text-sm sm:text-lg">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`text-xs sm:text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  );
}

// Compact Stats Component
function CompactStats({ pendingSMS, reviewQueue, readyChecks, weeklyTotal, onStatClick, currentFilter }: any) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
      <CompactStatCard
        icon="📱"
        label="SMS Pending"
        value={pendingSMS}
        color={currentFilter === 'sms_sent' ? 'bg-orange-600' : 'bg-orange-500'}
        onClick={() => onStatClick('sms_pending')}
        isActive={currentFilter === 'sms_sent'}
      />
      <CompactStatCard
        icon="⚠️"
        label="Review Queue"
        value={reviewQueue}
        color={currentFilter === 'submitted' ? 'bg-red-600' : 'bg-red-500'}
        onClick={() => onStatClick('review_queue')}
        isActive={currentFilter === 'submitted'}
      />
      <CompactStatCard
        icon="💰"
        label="Ready Checks"
        value={readyChecks}
        color={currentFilter === 'approved' ? 'bg-purple-600' : 'bg-purple-500'}
        onClick={() => onStatClick('ready_checks')}
        isActive={currentFilter === 'approved'}
      />
      <CompactStatCard
        icon="📊"
        label="Weekly Total"
        value={formatCurrency(weeklyTotal)}
        color={currentFilter === 'approved' ? 'bg-primary' : 'bg-primary'}
        onClick={() => onStatClick('weekly_total')}
        isActive={currentFilter === 'approved'}
      />
    </div>
  );
}

// Payment Card Component
function PaymentCard({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature, onCardClick, onDelete }: any) {
  const [showDetails, setShowDetails] = useState(false);

  if (!application) return null;

  const statusConfig: any = {
    submitted: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      priority: "URGENT",
      icon: "🚨"
    },
    needs_review: { 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      priority: "HIGH",
      icon: "⚠️"
    },
    sms_complete: { 
      color: "bg-blue-100 text-primary border-blue-200", 
      priority: "READY",
      icon: "📱"
    },
    approved: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      priority: "DONE",
      icon: "✅"
    },
    check_ready: { 
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      priority: "PICKUP",
      icon: "💰"
    },
    rejected: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      priority: "REJECTED",
      icon: "❌"
    },
  };

  const config = statusConfig[application.status] || statusConfig.needs_review;
  const doc = getDocumentForApp(application.id);

  return (
    <div 
      className={`bg-white border rounded p-3 sm:p-4 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
      onClick={() => onCardClick && onCardClick(application)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(application.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-primary rounded focus:ring-blue-500 mt-1 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{application.project?.name}</h3>
            <p className="text-xs text-gray-500">#{application.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
            {config.icon}
          </span>
          {config.priority === "URGENT" && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div>
          <p className="text-xs text-gray-500">Contractor</p>
          <p className="text-sm font-medium text-gray-900 truncate">{application.contractor?.name}</p>
          {application.contractor?.trade && (
            <p className="text-xs text-gray-500 truncate">{application.contractor.trade}</p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500">Current Value</p>
          <p className="text-base sm:text-lg font-bold text-green-600">{formatCurrency(application.current_period_value || 0)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="text-xs text-gray-500">
          {application.created_at ? formatDate(application.created_at) : "-"}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerify(application.id);
            }}
            className={`px-2 sm:px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              application.status === "approved"
                ? "bg-green-600 text-white hover:bg-green-700"
                : application.status === "rejected"
                ? "bg-red-600 text-white hover:bg-red-700"
                : config.priority === "URGENT" 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {application.status === "approved" || application.status === "rejected" ? "View" : config.priority === "URGENT" ? "URGENT" : "Verify"}
          </button>
          {doc && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                sendForSignature(application.id);
              }}
              className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Sign
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(application.id);
            }}
            className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
            title="Delete payment application"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: any) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = window.innerWidth < 640 ? 3 : 5; // Show fewer pages on mobile
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 bg-white border-t border-gray-200 gap-3 sm:gap-0">
      <div className="flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-700">
        <span>
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
      </div>

      <div className="flex items-center justify-center space-x-1 sm:space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md ${
              page === currentPage
                ? 'bg-primary text-white'
                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}

// Payment Table Component
function PaymentTable({ applications, onVerify, getDocumentForApp, sendForSignature, selectedItems, onSelectItem, onSelectAll, currentPage, totalPages, onPageChange, totalItems, itemsPerPage, onCardClick, onDelete }: any) {
  // Calculate which items on current page are selected
  const currentPageIds = applications.map((app: any) => app.id);
  const selectedOnPage = currentPageIds.filter((id: number) => selectedItems.includes(id));
  const allSelected = applications.length > 0 && selectedOnPage.length === applications.length;
  const someSelected = selectedOnPage.length > 0 && selectedOnPage.length < applications.length;

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => { if (input) input.indeterminate = someSelected; }}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="w-4 h-4 text-primary rounded focus:ring-blue-500"
        />
      ),
      accessor: (row: any) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedItems.includes(row.id)}
            onChange={(e) => onSelectItem(row.id, e.target.checked)}
            className="w-4 h-4 text-primary rounded focus:ring-blue-500 cursor-pointer"
          />
        </div>
      ),
      className: "w-10 px-2"
    },
    {
      header: 'Project',
      accessor: (row: any) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{row.project?.name}</p>
          <p className="text-xs text-muted-foreground">#{row.id}</p>
        </div>
      )
    },
    {
      header: 'Contractor',
      accessor: (row: any) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{row.contractor?.name}</p>
          {row.contractor?.trade && (
            <p className="text-xs text-muted-foreground">{row.contractor.trade}</p>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (row: any) => {
        const statusMap: Record<string, SystemStatus> = {
          'approved': 'success',
          'submitted': 'critical',
          'needs_review': 'warning',
          'rejected': 'critical',
          'check_ready': 'success',
          'sms_sent': 'neutral'
        };
        return (
          <SignalBadge status={statusMap[row.status] || 'neutral'}>
            {getStatusLabel(row.status)}
          </SignalBadge>
        );
      }
    },
    {
      header: 'Current Value',
      accessor: (row: any) => <span className="font-bold text-foreground">{formatCurrency(row.current_period_value || 0)}</span>,
      align: 'right' as const
    },
    {
      header: 'Created',
      accessor: (row: any) => <span className="text-muted-foreground">{row.created_at ? formatDate(row.created_at) : "-"}</span>,
    },
    {
      header: 'Actions',
      accessor: (row: any) => {
        const doc = getDocumentForApp(row.id);
        const statusConfig: any = {
            submitted: { priority: "URGENT" },
            needs_review: { priority: "HIGH" },
            sms_complete: { priority: "READY" },
            approved: { priority: "DONE" },
            check_ready: { priority: "PICKUP" },
            rejected: { priority: "REJECTED" },
        };
        const config = statusConfig[row.status] || statusConfig.needs_review;

        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onVerify(row.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                row.status === "approved"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : row.status === "rejected"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : config.priority === "URGENT" 
                  ? "bg-red-600 text-white hover:bg-red-700" 
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
            >
              {row.status === "approved" || row.status === "rejected" ? "View" : config.priority === "URGENT" ? "URGENT" : "Verify"}
            </button>
            {doc && (
              <button
                onClick={() => sendForSignature(row.id)}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                Sign
              </button>
            )}
            <button
              onClick={() => onDelete(row.id)}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
              title="Delete payment application"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      },
      align: 'right' as const
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 p-4">
        {applications.map((application: any) => (
          <PaymentCard
            key={application.id}
            application={application}
            isSelected={selectedItems.includes(application.id)}
            onSelect={onSelectItem}
            onVerify={onVerify}
            getDocumentForApp={getDocumentForApp}
            sendForSignature={sendForSignature}
            onCardClick={onCardClick}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <DataTable
            data={applications}
            columns={columns}
            onRowClick={onCardClick}
            className="border-none rounded-none shadow-none"
            emptyMessage="No payment applications found"
        />
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}

// Bulk Actions Bar Component
function BulkActionsBar({ selectedCount, onDeleteSelected, onApproveSelected, onClearSelection, loading }: any) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4 z-40 lg:static lg:border-t-0 lg:p-0 lg:bg-transparent shadow-lg lg:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2">
          <button
            onClick={onApproveSelected}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Processing...</span>
              </>
            ) : (
              'Approve Selected'
            )}
          </button>
          <button
            onClick={onDeleteSelected}
            disabled={loading}
            className="px-3 sm:px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Processing...</span>
              </>
            ) : (
              'Delete Selected'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Contractor Payment Group Component for "By Contractor" view
function ContractorPaymentGroup({ 
  group, 
  onVerify, 
  onPayReady,
  formatCurrency,
  formatDate,
  getStatusLabel
}: { 
  group: { contractor: any; apps: any[]; totalPending: number; readyCount: number };
  onVerify: (id: number) => void;
  onPayReady: (contractorId: number, appIds: number[]) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusLabel: (status: any) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const readyAppIds = group.apps
    .filter(app => app.status === 'approved' || app.status === 'check_ready')
    .map(app => app.id);
  
  const readyAmount = group.apps
    .filter(app => app.status === 'approved' || app.status === 'check_ready')
    .reduce((sum, app) => sum + (app.current_period_value || 0), 0);

  return (
    <div className="bg-card border border-border rounded overflow-hidden mb-4">
      {/* Contractor Header */}
      <div 
        className="px-4 py-3 bg-muted/30 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground">
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <h3 className="font-semibold text-foreground">
                {group.contractor?.name || 'Unknown Contractor'}
              </h3>
              {group.contractor?.trade && (
                <p className="text-xs text-muted-foreground">{group.contractor.trade}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(group.totalPending)}
              </p>
              <p className="text-xs text-muted-foreground">
                {group.apps.length} payment{group.apps.length !== 1 ? 's' : ''}
              </p>
            </div>
            {readyAppIds.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPayReady(group.contractor?.id, readyAppIds);
                }}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                <span className="hidden sm:inline">Pay Ready Items</span>
                <span className="sm:hidden">Pay</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {readyAppIds.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Apps List */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {group.apps.map((app, index) => (
            <div 
              key={app.id} 
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onVerify(app.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm w-4">
                  {index === group.apps.length - 1 ? '└' : '├'}
                </span>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {app.project?.name || 'Unknown Project'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{app.id} • {app.created_at ? formatDate(app.created_at) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  app.status === 'approved' || app.status === 'check_ready'
                    ? 'bg-green-100 text-green-800'
                    : app.status === 'submitted' || app.status === 'needs_review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : app.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusLabel(app.status)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(app.current_period_value || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact Filter Sidebar Component
function FilterSidebar({ statusFilter, setStatusFilter, projectFilter, setProjectFilter, projects, sortBy, setSortBy, sortDir, setSortDir, onFilterChange, hideProjectFilter }: any) {
  return (
    <div className="w-full sm:w-48 bg-white border border-gray-200 rounded p-3 sm:p-4 h-fit">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Quick Filters</h3>

      {/* Status Filter */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Status</h4>
        <div className="space-y-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'needs_review', label: 'Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'check_ready', label: 'Ready' },
            { value: 'sms_sent', label: 'SMS Sent' }
          ].map((status) => (
            <label key={status.value} className="flex items-center">
              <input
                type="radio"
                name="status"
                value={status.value}
                checked={statusFilter === status.value}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  onFilterChange();
                }}
                className="w-3 h-3 text-primary border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-xs text-gray-700">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Project Filter */}
      {!hideProjectFilter && (
        <div className="mb-3 sm:mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Project</h4>
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              onFilterChange();
            }}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Projects</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sort Options */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Sort</h4>
        <div className="space-y-1">
          {[
            { value: 'date', label: 'Date' },
            { value: 'status', label: 'Status' },
            { value: 'amount', label: 'Amount' }
          ].map((sort) => (
            <label key={sort.value} className="flex items-center">
              <input
                type="radio"
                name="sort"
                value={sort.value}
                checked={sortBy === sort.value}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  onFilterChange();
                }}
                className="w-3 h-3 text-primary border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-xs text-gray-700">{sort.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={sortDir === 'desc'}
              onChange={(e) => {
                setSortDir(e.target.checked ? 'desc' : 'asc');
                onFilterChange();
              }}
              className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-xs text-gray-700">Descending</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Mobile Filter Drawer Component
function MobileFilterDrawer({ show, onClose, statusFilter, setStatusFilter, projectFilter, setProjectFilter, projects, sortBy, setSortBy, sortDir, setSortDir, onFilterChange }: any) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0  bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          <FilterSidebar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            projectFilter={projectFilter}
            setProjectFilter={setProjectFilter}
            projects={projects}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortDir={sortDir}
            setSortDir={setSortDir}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>
    </div>
  );
}

interface PaymentApplicationsViewProps {
  searchQuery?: string;
  projectId?: number;
}

const PaymentApplicationsView: React.FC<PaymentApplicationsViewProps> = ({ searchQuery = '', projectId }) => {
  const searchParams = useSearchParams();
  const { showToast, showConfirm } = useModal();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Get statusFilter from URL params or default to 'submitted'
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('statusFilter') || 'submitted'
  );
  const [projectFilter, setProjectFilter] = useState<string>(
    projectId ? projectId.toString() : (searchParams.get('project') || 'all')
  );
  const [groupBy, setGroupBy] = useState<'status' | 'contractor'>('status');
  const [sortBy, setSortBy] = useState<'status' | 'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [stats, setStats] = useState<any>({
    pending_sms: 0,
    review_queue: 0,
    ready_checks: 0,
    weekly_total: 0,
  });
  const [paymentDocuments, setPaymentDocuments] = useState<any[]>([]);


  // Verification view state variables
  const [showVerificationView, setShowVerificationView] = useState(false);
  const [selectedPaymentForVerification, setSelectedPaymentForVerification] = useState<any>(null);
  const [lineItemsForVerification, setLineItemsForVerification] = useState<any[]>([]);
  const [previousPercentages, setPreviousPercentages] = useState<Record<number, number>>({});
  const [pmVerifiedPercent, setPmVerifiedPercent] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [changeOrders, setChangeOrders] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | 'recall' | 'delete' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | number[] | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [sendContractorNotification, setSendContractorNotification] = useState(true);
  const [projectLineItems, setProjectLineItems] = useState<any[]>([]);
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null);
  const [editedPercentages, setEditedPercentages] = useState<Record<number, {
    submitted_percent: number;
    pm_verified_percent: number;
  }>>({});
  const [savingChanges, setSavingChanges] = useState(false);
  const [changeOrdersArray, setChangeOrdersArray] = useState<Array<{
    id: string;
    description: string;
    amount: number;
    percentage: number;
  }>>([]);
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [newChangeOrder, setNewChangeOrder] = useState({
    description: '',
    amount: 0,
    percentage: 0
  });
  const [includeChangeOrderPageInPdf, setIncludeChangeOrderPageInPdf] = useState(false);

  const itemsPerPage = 10;

  // Fetch applications from API
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      console.log('[PaymentsView] Fetching from API...');
      const startTime = Date.now();

      // Call API
      const response = await fetch('/api/payment-applications/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          // Add filters here if needed
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to load payment applications';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const fetchTime = Date.now() - startTime;
      console.log(`[PaymentsView] Loaded in ${fetchTime}ms`);

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      const { applications: appsData, projects: projectsData } = result.data;

      setApplications(appsData || []);
      setProjects(projectsData || []);

      // Calculate stats
      const appsRaw = appsData || [];

      // SMS Pending: Applications with sms_sent status
      const pendingSMS = appsRaw.filter((app: any) =>
        app.status === "sms_sent"
      ).length;

      // Review Queue: Applications with submitted or needs_review status
      const reviewQueue = appsRaw.filter((app: any) =>
        app.status === "submitted" || app.status === "needs_review"
      ).length;

      // Ready Checks: Approved applications
      const readyChecks = appsRaw.filter((app: any) =>
        app.status === "approved"
      ).length;

      // Weekly Total: Total amount of approved applications in the last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTotal = appsRaw
        .filter((a: any) => a.created_at && new Date(a.created_at) >= weekAgo && a.status === 'approved')
        .reduce((sum: number, a: any) => sum + (a.current_payment || 0), 0);

      setStats({
        pending_sms: pendingSMS,
        review_queue: reviewQueue,
        ready_checks: readyChecks,
        weekly_total: weeklyTotal,
      });

    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payment documents
  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payment_documents")
        .select("*");
      if (!error && data) {
        setPaymentDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, []);

  // Load data on mount and when statusFilter changes from URL
  useEffect(() => {
    const urlStatusFilter = searchParams?.get('statusFilter');
    if (urlStatusFilter && urlStatusFilter !== statusFilter) {
      setStatusFilter(urlStatusFilter);
      // Clear selections when filter changes from URL
      setSelectedItems([]);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Sync project filter from URL (Header project selector) or prop
  useEffect(() => {
    if (projectId) {
      setProjectFilter(projectId.toString());
    } else {
      const urlProjectFilter = searchParams?.get('project') || 'all';
      if (urlProjectFilter !== projectFilter) {
        setProjectFilter(urlProjectFilter);
        // Clear selections when project filter changes from URL
        setSelectedItems([]);
        setCurrentPage(1);
      }
    }
  }, [searchParams, projectId]);

  useEffect(() => {
    fetchApplications();
    fetchDocuments();
  }, [fetchApplications, fetchDocuments]);

  // Clear invalid selections when applications list changes
  useEffect(() => {
    if (selectedItems.length > 0) {
      const validIds = selectedItems.filter(id => 
        applications.some(app => app.id === id)
      );
      if (validIds.length !== selectedItems.length) {
        console.log('Clearing invalid selections:', selectedItems.filter(id => !validIds.includes(id)));
        setSelectedItems(validIds);
      }
    }
  }, [applications]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedItems([]);
    setCurrentPage(1);
  }, [statusFilter, projectFilter]);

  // Filter and sort applications
  const filteredApps = useMemo(() => {
    let filtered = applications;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(app => app.project?.id === parseInt(projectFilter));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.project?.name?.toLowerCase().includes(query) ||
        app.contractor?.name?.toLowerCase().includes(query) ||
        app.contractor?.trade?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'amount':
          aValue = a.current_payment || 0;
          bValue = b.current_payment || 0;
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
      }

      if (sortDir === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [applications, statusFilter, projectFilter, searchQuery, sortBy, sortDir]);

  // Group payments by contractor for "By Contractor" view
  const groupedByContractor = useMemo(() => {
    if (groupBy !== 'contractor') return null;
    
    const groups: Record<string, { 
      contractor: any; 
      apps: any[]; 
      totalPending: number;
      readyCount: number;
    }> = {};
    
    filteredApps.forEach(app => {
      const contractorId = app.contractor?.id?.toString() || 'unknown';
      if (!groups[contractorId]) {
        groups[contractorId] = { 
          contractor: app.contractor, 
          apps: [], 
          totalPending: 0,
          readyCount: 0
        };
      }
      groups[contractorId].apps.push(app);
      groups[contractorId].totalPending += app.current_period_value || 0;
      if (app.status === 'approved' || app.status === 'check_ready') {
        groups[contractorId].readyCount += 1;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.totalPending - a.totalPending);
  }, [filteredApps, groupBy]);

  // Pagination
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplications();
    setIsRefreshing(false);
  };

  const handleSelectItem = (id: number, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    const currentPageIds = paginatedApps.map(app => app.id);
    if (selected) {
      // Add all items from current page
      setSelectedItems(prev => {
        const newIds = currentPageIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    } else {
      // Remove only items from current page
      setSelectedItems(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    // Clear selections when filters change
    setSelectedItems([]);
  };

  const handleVerifyPayment = (paymentAppId: number) => {
    // Pass the current context as URL parameters for proper back navigation
    const returnTo = `/?tab=payment-applications`;
    window.location.href = `/payments/${paymentAppId}/verify?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const getDocumentForApp = (appId: number) => {
    return paymentDocuments.find(doc => doc.payment_application_id === appId);
  };

  const sendForSignature = async (paymentAppId: number) => {
    try {
      const { confirmed } = await showConfirm({
        title: 'Send for Signature',
        message: 'Send this payment application for electronic signature via DocuSign?',
        confirmText: 'Send',
        variant: 'info'
      });
      if (!confirmed) return;
      
      setIsRefreshing(true);
      
      // Note: This is a placeholder for DocuSign integration
      // Full implementation requires DocuSign OAuth setup and API integration
      const res = await fetch(`/api/payments/${paymentAppId}/send-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        // If API doesn't exist yet, show a friendly message
        if (res.status === 404) {
          showToast({ 
            message: 'DocuSign integration is not yet configured. To enable electronic signatures, please complete the integration setup in Settings > Integrations.', 
            type: 'warning',
            duration: 8000
          });
        } else {
          showToast({ message: data.error || 'Failed to send for signature.', type: 'error' });
        }
      } else {
        showToast({ message: 'Signature request sent successfully! The recipient will receive an email with signing instructions.', type: 'success' });
        await fetchApplications();
      }
    } catch (error) {
      console.error('Error sending for signature:', error);
      showToast({ message: 'DocuSign integration is not yet configured. Please complete the integration setup in Settings > Integrations.', type: 'warning' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeletePayment = async (paymentAppId: number) => {
    setDeleteTarget(paymentAppId);
    setShowConfirmDialog('delete');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    // Set action loading to show feedback
    setActionLoading(true);

    try {
      const paymentAppIds = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];
      
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Call the API endpoint to delete payment applications
      const response = await fetch('/api/payments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ paymentAppIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed permission error message if available
        if (result.message) {
          showToast({ 
            message: result.message, 
            type: 'error',
            duration: 8000
          });
          throw new Error(result.message);
        }
        throw new Error(result.error || 'Failed to delete payment applications');
      }

      const successCount = result.successCount || 0;
      const errorCount = result.failedCount || 0;
      const errors = result.results?.failed?.map((f: any) => `#${f.id}: ${f.error}`) || [];

      // Remove successfully deleted items from selectedItems
      if (result.results?.success) {
        setSelectedItems(prev => prev.filter(id => !result.results.success.includes(id)));
      }

      // Clear selected items if bulk delete
      if (Array.isArray(deleteTarget)) {
        setSelectedItems([]);
      }
      
      // Show appropriate message based on results
      if (successCount > 0 && errorCount === 0) {
        showToast({ 
          message: `${successCount} payment application(s) deleted successfully.`, 
          type: 'success' 
        });
      } else if (successCount > 0 && errorCount > 0) {
        showToast({ 
          message: `${successCount} deleted, ${errorCount} failed. Check console for details.`, 
          type: 'warning',
          duration: 8000
        });
        console.error('Deletion errors:', errors);
      } else {
        showToast({ 
          message: `Failed to delete payment application(s). ${errors[0] || 'Check console for details.'}`, 
          type: 'error',
          duration: 8000
        });
        console.error('All deletions failed:', errors);
      }
      
      // Reset state
      setDeleteTarget(null);
      setShowConfirmDialog(null);
      
      // Refresh the data (after state updates) - only if at least one succeeded
      if (successCount > 0) {
        await fetchApplications();
      }
    } catch (error) {
      console.error('Error deleting payment application(s):', error);
      showToast({ message: 'Error deleting payment application(s). Please try again.', type: 'error' });
      setDeleteTarget(null);
      setShowConfirmDialog(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    // Filter selectedItems to only include IDs that exist in current applications
    const validSelectedIds = selectedItems.filter(id => 
      applications.some(app => app.id === id)
    );
    
    // Enhanced validation logging
    console.log('[Frontend] Selected IDs validation:', {
      raw: selectedItems,
      valid: validSelectedIds,
      filtered: selectedItems.length - validSelectedIds.length,
      currentAppIds: applications.map(app => app.id)
    });
    
    if (validSelectedIds.length === 0) {
      showToast({ message: 'No valid items selected', type: 'warning' });
      setSelectedItems([]); // Clear invalid selections
      return;
    }
    
    // Update selectedItems to only include valid IDs
    setSelectedItems(validSelectedIds);
    setDeleteTarget(validSelectedIds);
    setShowConfirmDialog('delete');
  };

  const handleApproveSelected = async () => {
    if (selectedItems.length === 0) return;
    
    const { confirmed } = await showConfirm({
      title: 'Bulk Approve',
      message: `Are you sure you want to approve ${selectedItems.length} payment application(s)?`,
      confirmText: 'Approve All',
      variant: 'success'
    });
    if (!confirmed) return;
    
    setIsRefreshing(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < selectedItems.length; i++) {
      const paymentId = selectedItems[i];
      try {
        const res = await fetch(`/api/payments/${paymentId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: `Bulk approved (${i + 1}/${selectedItems.length})` }),
        });
        
        const data = await res.json();
        
        if (!res.ok || data.error) {
          failCount++;
          errors.push(`Payment #${paymentId}: ${data.error || 'Failed'}`);
        } else {
          successCount++;
        }
      } catch (error) {
        failCount++;
        errors.push(`Payment #${paymentId}: Network error`);
        console.error(`Error approving payment ${paymentId}:`, error);
      }
    }
    
    // Refresh applications list
    await fetchApplications();
    
    // Clear selection
    setSelectedItems([]);
    setIsRefreshing(false);
    
    // Show results
    let message = `Bulk approval complete:\n✓ ${successCount} approved`;
    if (failCount > 0) {
      message += `\n✗ ${failCount} failed`;
      if (errors.length > 0 && errors.length <= 5) {
        message += '\n\nErrors:\n' + errors.join('\n');
      }
    }
    showToast({ message, type: 'success' });
  };

  const handleStatClick = async (type: string) => {
    // Clear selections and reset page when changing filter via stat cards
    setSelectedItems([]);
    setCurrentPage(1);
    
    switch (type) {
      case 'sms_pending':
        setStatusFilter('sms_sent');
        break;
      case 'review_queue':
        setStatusFilter('submitted');
        break;
      case 'ready_checks':
        setStatusFilter('approved');
        break;
      case 'weekly_total':
        // Show all approved applications from the last week
        setStatusFilter('approved');
        // You could also add a date filter here if needed
        break;
      default:
        setStatusFilter('all');
    }
  };

  const handlePaymentCardClick = async (application: any) => {
    // Directly redirect to verify page with return parameter
    const returnTo = `/?tab=payment-applications`;
    window.location.href = `/payments/${application.id}/verify?returnTo=${encodeURIComponent(returnTo)}`;
  };

  // Handle "Pay Ready Items" for a contractor group
  const handlePayReadyItems = async (contractorId: number, appIds: number[]) => {
    if (appIds.length === 0) return;
    
    const { confirmed } = await showConfirm({
      title: 'Process Ready Payments',
      message: `Process ${appIds.length} ready payment(s) for this contractor? This will mark them as check ready.`,
      confirmText: 'Process Payments',
      variant: 'success'
    });
    
    if (!confirmed) return;
    
    setIsRefreshing(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const paymentId of appIds) {
      try {
        const res = await fetch(`/api/payments/${paymentId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: 'Batch approved via Pay Ready Items' }),
        });
        
        const data = await res.json();
        
        if (!res.ok || data.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`Error processing payment ${paymentId}:`, error);
      }
    }
    
    await fetchApplications();
    setIsRefreshing(false);
    
    if (successCount > 0) {
      showToast({ 
        message: `${successCount} payment(s) processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}`, 
        type: failCount > 0 ? 'warning' : 'success' 
      });
    } else {
      showToast({ message: 'Failed to process payments', type: 'error' });
    }
  };

  // Verification view functions
  const handleVerificationClose = () => {
    setShowVerificationView(false);
    setSelectedPaymentForVerification(null);
    setLineItemsForVerification([]);
    setPreviousPercentages({});
    setPmVerifiedPercent({});
    setNotes('');
    setChangeOrders('');
    setVerificationLoading(false);
    setProject(null);
    setContractor(null);
    setDocument(null);
    setActionLoading(false);
    setShowConfirmDialog(null);
    setRejectionNotes('');
    setApprovalNotes('');
    setProjectLineItems([]);
    setEditingLineItem(null);
    setEditedPercentages({});
    setSavingChanges(false);
    setChangeOrdersArray([]);
    setShowChangeOrderModal(false);
    setNewChangeOrder({ description: '', amount: 0, percentage: 0 });
    setIncludeChangeOrderPageInPdf(false);
  };

  // Calculate line items for table display
  const lineItemsForTable = lineItemsForVerification.map((li: any, idx: number) => {
    const lineItem = Array.isArray(li.line_item) ? li.line_item[0] : li.line_item;
    if (!lineItem) return null;

    const scheduled_value = lineItem.scheduled_value || 0;
    const previousPercent = previousPercentages[lineItem.id] || 0;
    const thisPeriodPercent = Math.max(0, pmVerifiedPercent[lineItem.id] || 0 - previousPercent);
    const previous = (previousPercent / 100) * scheduled_value;
    const this_period = (thisPeriodPercent / 100) * scheduled_value;
    const material_presently_stored = 0;
    const total_completed = previous + this_period + material_presently_stored;
    const percent = scheduled_value > 0 ? (total_completed / scheduled_value) * 100 : 0;
    const balance_to_finish = scheduled_value - total_completed;
    const retainage = 0;
    const current_payment = this_period;

    return {
      idx: idx + 1,
      line_item_id: lineItem.id,
      item_no: lineItem.item_no,
      description_of_work: lineItem.description_of_work,
      scheduled_value,
      previous,
      this_period,
      material_presently_stored,
      total_completed,
      percent,
      balance_to_finish,
      retainage,
      current_payment,
      submitted_percent: li.submitted_percent || 0,
      pm_verified_percent: pmVerifiedPercent[lineItem.id] || li.submitted_percent || 0,
      previous_percent: previousPercent,
      this_period_percent: thisPeriodPercent
    };
  }).filter(Boolean) as any[];

  // Calculate grand total
  const grandTotal = lineItemsForTable.reduce((sum, li) => sum + (li?.current_payment || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading payment applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state when no payment applications exist
  if (applications.length === 0 && !loading) {
    return (
      <div className="bg-card border border-border rounded">
        <EmptyState
          icon={DollarSign}
          title="No payment applications yet"
          description="Start by selecting contractors from a project and requesting payment. Payment applications track progress billing for your construction projects."
          actionLabel="Go to Projects"
          onAction={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('tab', 'projects');
            window.location.href = `/?${params.toString()}`;
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Payment Applications</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            <span className="inline-block">{filteredApps.length} applications</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline text-xs">
              Updated {new Date().toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
              <CompactStats
          pendingSMS={stats.pending_sms}
          reviewQueue={stats.review_queue}
          readyChecks={stats.ready_checks}
          weeklyTotal={stats.weekly_total}
          onStatClick={handleStatClick}
          currentFilter={statusFilter}
        />

      {/* Group By Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            groupBy === 'status'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => setGroupBy('status')}
        >
          By Status
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            groupBy === 'contractor'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => setGroupBy('contractor')}
        >
          By Contractor
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Compact Sidebar - Only show in status view */}
        {groupBy === 'status' && (
          <div className="hidden lg:block">
            <FilterSidebar
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              projectFilter={projectFilter}
              setProjectFilter={setProjectFilter}
              projects={projects}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortDir={sortDir}
              setSortDir={setSortDir}
              onFilterChange={handleFilterChange}
              hideProjectFilter={!!projectId}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1">
          {groupBy === 'contractor' && groupedByContractor ? (
            /* Contractor-Grouped View */
            <div className="space-y-4">
              {groupedByContractor.length === 0 ? (
                <div className="bg-card border border-border rounded p-8 text-center">
                  <p className="text-muted-foreground">No payment applications found</p>
                </div>
              ) : (
                groupedByContractor.map((group) => (
                  <ContractorPaymentGroup
                    key={group.contractor?.id || 'unknown'}
                    group={group}
                    onVerify={handleVerifyPayment}
                    onPayReady={handlePayReadyItems}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getStatusLabel={getStatusLabel}
                  />
                ))
              )}
            </div>
          ) : (
            /* Status-Based Table View */
            <PaymentTable
              applications={paginatedApps}
              onVerify={handleVerifyPayment}
              getDocumentForApp={getDocumentForApp}
              sendForSignature={sendForSignature}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredApps.length}
              itemsPerPage={itemsPerPage}
              onCardClick={handlePaymentCardClick}
              onDelete={handleDeletePayment}
            />
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedItems.length}
        onDeleteSelected={handleDeleteSelected}
        onApproveSelected={handleApproveSelected}
        onClearSelection={() => setSelectedItems([])}
        loading={actionLoading}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        show={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        projects={projects}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
        onFilterChange={handleFilterChange}
      />



      {/* Payment Verification View */}
      {showVerificationView && selectedPaymentForVerification && (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <button
                  type="button"
                  onClick={handleVerificationClose}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Payment Applications
                </button>
                <div className="flex items-center gap-3">
                  <Badge variant={getPaymentStatusBadge(selectedPaymentForVerification?.status as PaymentStatus) as any}>
                    {getStatusLabel(selectedPaymentForVerification?.status as PaymentStatus)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Payment Application Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Payment Application Review</h1>
                <p className="text-gray-600 mt-1">Review and approve or reject this payment request</p>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <p className="text-lg font-semibold text-gray-900">{project?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Contractor</label>
                    <p className="text-lg font-semibold text-gray-900">{contractor?.name}</p>
                    {contractor?.trade && (
                      <p className="text-sm text-gray-600">{contractor.trade}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Submitted</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedPaymentForVerification?.created_at ? new Date(selectedPaymentForVerification.created_at).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-2xl font-bold text-green-600">
                      {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PM Notes Section */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-sm mb-8 px-6 py-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-yellow-800 mb-1">Notes for Project Manager</div>
                  <div className="text-gray-800 text-base">
                    {selectedPaymentForVerification?.pm_notes?.trim() ? selectedPaymentForVerification.pm_notes : <span className="text-gray-500 italic">No notes provided.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Generation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">PDF Generation</h2>
                    <p className="text-gray-600 mt-1">Generate and download the G-703 payment application form</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (!project || !contractor || !selectedPaymentForVerification?.id) {
                          setError('Missing required data to generate PDF.');
                          return;
                        }
                        const { pdfBytes, filename } = await generateG703Pdf({
                          project: { name: project.name || '', address: (project as any).address || '' },
                          contractor: { name: contractor.name || '' },
                          applicationNumber: selectedPaymentForVerification.id,
                          invoiceDate: selectedPaymentForVerification.created_at ? new Date(selectedPaymentForVerification.created_at).toLocaleDateString() : '',
                          period: '',
                          dateSubmitted: selectedPaymentForVerification.created_at ? new Date(selectedPaymentForVerification.created_at).toLocaleDateString() : '',
                          previousDate: '',
                          lineItems: lineItemsForTable,
                          changeOrders: changeOrdersArray,
                          includeChangeOrderPage: includeChangeOrderPageInPdf,
                        });
                        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        const a = (typeof window !== 'undefined' && window.document) ? window.document.createElement('a') as HTMLAnchorElement : null;
                        if (a) {
                          a.href = url;
                          a.download = filename;
                          if (window.document.body) {
                            window.document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              window.document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }, 100);
                          } else {
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }
                      }}
                      className="px-6 py-3 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => setShowConfirmDialog('reject')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Application
                </button>
                <button
                  onClick={() => setShowConfirmDialog('approve')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowConfirmDialog(null);
            setDeleteTarget(null);
          }}
        >
          <div 
            className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {showConfirmDialog === 'delete' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--status-critical-bg)] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-[var(--status-critical-icon)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Confirm Deletion</h3>
                </div>
                <div className="bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] rounded p-4 mb-6">
                  <p className="text-[var(--status-critical-text)] font-medium">
                    {Array.isArray(deleteTarget) 
                      ? `Are you sure you want to delete ${deleteTarget.length} payment application(s)? This action cannot be undone.`
                      : `Are you sure you want to delete payment application #${deleteTarget}? This action cannot be undone.`
                    }
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowConfirmDialog(null);
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded bg-muted hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </>
            )}
            
            {showConfirmDialog === 'approve' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--status-success-bg)] flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-[var(--status-success-icon)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Confirm Approval</h3>
                </div>
                <div className="bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded p-4 mb-4">
                  <p className="text-[var(--status-success-text)] font-medium">Are you sure you want to approve this payment application?</p>
                </div>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add approval notes (optional)"
                  className="w-full p-3 border border-border rounded mb-4 resize-none bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  rows={3}
                />
                
                {/* Notification Checkbox */}
                <div className="flex items-center gap-3 p-4 bg-primary/10 border border-blue-200 rounded mb-4">
                  <input
                    type="checkbox"
                    id="notify-contractor-payments"
                    checked={sendContractorNotification}
                    onChange={(e) => setSendContractorNotification(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="notify-contractor-payments" className="text-sm text-gray-700 cursor-pointer select-none">
                    Send notification to contractor about this approval
                  </label>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmDialog(null)}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded bg-muted hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedPaymentForVerification?.id) {
                        showToast({ message: 'No payment application selected', type: 'error' });
                        setShowConfirmDialog(null);
                        return;
                      }
                      
                      setActionLoading(true);
                      try {
                        const res = await fetch(`/api/payments/${selectedPaymentForVerification.id}/approve`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: approvalNotes }),
                        });
                        
                        const data = await res.json();
                        
                        if (!res.ok || data.error) {
                          showToast({ message: data.error || 'Failed to approve payment application.', type: 'error' });
                        } else {
                          showToast({ message: 'Payment application approved successfully!', type: 'success' });
                          // Refresh applications list
                          await fetchApplications();
                          // Close verification view
                          handleVerificationClose();
                        }
                      } catch (error) {
                        console.error('Error approving payment:', error);
                        showToast({ message: 'Network error. Please try again.', type: 'error' });
                      } finally {
                        setActionLoading(false);
                        setShowConfirmDialog(null);
                        setApprovalNotes('');
                      }
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-colors"
                  >
                    {actionLoading ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </>
            )}

            {showConfirmDialog === 'reject' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--status-warning-bg)] flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-[var(--status-warning-icon)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Confirm Rejection</h3>
                </div>
                <div className="bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] rounded p-4 mb-4">
                  <p className="text-[var(--status-warning-text)] font-medium">Are you sure you want to reject this payment application?</p>
                </div>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Add rejection reason (required)"
                  className="w-full p-3 border border-border rounded mb-4 resize-none bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  rows={3}
                  required
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmDialog(null)}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded bg-muted hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedPaymentForVerification?.id) {
                        showToast({ message: 'No payment application selected', type: 'error' });
                        setShowConfirmDialog(null);
                        return;
                      }
                      
                      if (!rejectionNotes.trim()) {
                        showToast({ message: 'Please provide a rejection reason', type: 'warning' });
                        return;
                      }
                      
                      setActionLoading(true);
                      try {
                        const res = await fetch(`/api/payments/${selectedPaymentForVerification.id}/reject`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ notes: rejectionNotes }),
                        });
                        
                        const data = await res.json();
                        
                        if (!res.ok || data.error) {
                          showToast({ message: data.error || 'Failed to reject payment application.', type: 'error' });
                        } else {
                          showToast({ message: 'Payment application rejected successfully.', type: 'success' });
                          // Refresh applications list
                          await fetchApplications();
                          // Close verification view
                          handleVerificationClose();
                        }
                      } catch (error) {
                        console.error('Error rejecting payment:', error);
                        showToast({ message: 'Network error. Please try again.', type: 'error' });
                      } finally {
                        setActionLoading(false);
                        setShowConfirmDialog(null);
                        setRejectionNotes('');
                      }
                    }}
                    disabled={actionLoading || !rejectionNotes.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-colors"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApplicationsView;