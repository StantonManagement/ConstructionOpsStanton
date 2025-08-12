'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, Filter, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { generateG703Pdf } from '@/lib/g703Pdf';

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
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isActive 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-blue-300'
      } ${onClick ? 'hover:border-blue-300' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white`}>
            <span className="text-lg">{icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        color={currentFilter === 'approved' ? 'bg-blue-600' : 'bg-blue-500'}
        onClick={() => onStatClick('weekly_total')}
        isActive={currentFilter === 'approved'}
      />
    </div>
  );
}

// Payment Card Component
function PaymentCard({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature, onCardClick }: any) {
  const [grandTotal, setGrandTotal] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  if (!application) return null;

  useEffect(() => {
    async function fetchGrandTotal() {
      const lineItemIds = (application.line_item_progress || [])
        .map((lip: any) => lip.line_item?.id)
        .filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from("project_line_items")
        .select("amount_for_this_period")
        .in("id", lineItemIds);
      if (!error && data) {
        const total = data.reduce(
          (sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0),
          0
        );
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

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
      color: "bg-blue-100 text-blue-800 border-blue-200", 
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
  };

  const config = statusConfig[application.status] || statusConfig.needs_review;
  const doc = getDocumentForApp(application.id);

  return (
    <div 
      className={`bg-white border rounded-lg p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
      onClick={() => onCardClick && onCardClick(application)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(application.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{application.project?.name}</h3>
            <p className="text-xs text-gray-500">#{application.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
            {config.icon}
          </span>
          {config.priority === "URGENT" && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Contractor</p>
          <p className="text-sm font-medium text-gray-900 truncate">{application.contractor?.name}</p>
          {application.contractor?.trade && (
            <p className="text-xs text-gray-500">{application.contractor.trade}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {application.created_at ? formatDate(application.created_at) : "-"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVerify(application.id)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              application.status === "approved"
                ? "bg-green-600 text-white hover:bg-green-700"
                : config.priority === "URGENT" 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {application.status === "approved" ? "View" : config.priority === "URGENT" ? "URGENT" : "Verify"}
          </button>
          {doc && (
            <button
              onClick={() => sendForSignature(application.id)}
              className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Sign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Payment Row Component (for table view)
function PaymentRow({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature, onCardClick }: any) {
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    async function fetchGrandTotal() {
      const lineItemIds = (application.line_item_progress || [])
        .map((lip: any) => lip.line_item?.id)
        .filter(Boolean);
      if (!lineItemIds.length) return setGrandTotal(0);
      const { data, error } = await supabase
        .from("project_line_items")
        .select("amount_for_this_period")
        .in("id", lineItemIds);
      if (!error && data) {
        const total = data.reduce(
          (sum: number, pli: any) => sum + (Number(pli.amount_for_this_period) || 0),
          0
        );
        setGrandTotal(total);
      }
    }
    fetchGrandTotal();
  }, [application.line_item_progress]);

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
      color: "bg-blue-100 text-blue-800 border-blue-200", 
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
  };

  const config = statusConfig[application.status] || statusConfig.needs_review;
  const doc = getDocumentForApp(application.id);

  return (
    <tr 
      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={() => onCardClick && onCardClick(application)}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(application.id, e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{application.project?.name}</p>
          <p className="text-xs text-gray-500">#{application.id}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{application.contractor?.name}</p>
          {application.contractor?.trade && (
            <p className="text-xs text-gray-500">{application.contractor.trade}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.icon}
    </span>
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-sm font-bold text-green-600">{formatCurrency(grandTotal)}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {application.created_at ? formatDate(application.created_at) : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVerify(application.id)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              application.status === "approved"
                ? "bg-green-600 text-white hover:bg-green-700"
                : config.priority === "URGENT" 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {application.status === "approved" ? "View" : config.priority === "URGENT" ? "URGENT" : "Verify"}
          </button>
          {doc && (
            <button
              onClick={() => sendForSignature(application.id)}
              className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              Sign
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: any) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
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
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Payment Table Component
function PaymentTable({ applications, onVerify, getDocumentForApp, sendForSignature, selectedItems, onSelectItem, onSelectAll, currentPage, totalPages, onPageChange, totalItems, itemsPerPage, onCardClick }: any) {
  const allSelected = applications.length > 0 && selectedItems.length === applications.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < applications.length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((application: any) => (
              <PaymentRow
                key={application.id}
                application={application}
                isSelected={selectedItems.includes(application.id)}
                onSelect={onSelectItem}
                onVerify={onVerify}
                getDocumentForApp={getDocumentForApp}
                sendForSignature={sendForSignature}
                onCardClick={onCardClick}
              />
            ))}
          </tbody>
        </table>
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
function BulkActionsBar({ selectedCount, onDeleteSelected, onApproveSelected, onClearSelection }: any) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 lg:static lg:border-t-0 lg:p-0 lg:bg-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onApproveSelected}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
          >
            Approve Selected
          </button>
          <button
            onClick={onDeleteSelected}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact Filter Sidebar Component
function FilterSidebar({ statusFilter, setStatusFilter, projectFilter, setProjectFilter, projects, sortBy, setSortBy, sortDir, setSortDir, onFilterChange }: any) {
  return (
    <div className="w-48 bg-white border border-gray-200 rounded-lg p-4 h-fit">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Filters</h3>

      {/* Status Filter */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Status</h4>
        <div className="space-y-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'needs_review', label: 'Review' },
            { value: 'approved', label: 'Approved' },
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
                className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-xs text-gray-700">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Project Filter */}
      <div className="mb-4">
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

      {/* Sort Options */}
      <div className="mb-4">
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
                className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
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
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
      <div className="absolute inset-0  bg-opacity-50" onClick={onClose} />
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
}

const PaymentApplicationsView: React.FC<PaymentApplicationsViewProps> = ({ searchQuery = '' }) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('submitted'); // Changed default to 'submitted'
  const [projectFilter, setProjectFilter] = useState<string>('all');
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentApp, setSelectedPaymentApp] = useState<any>(null);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);

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
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | 'recall' | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
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

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: appsRaw, error: appsError } = await supabase
        .from("payment_applications")
        .select(`
          id,
          status,
          current_payment,
          created_at,
          project:projects(id, name, client_name),
          contractor:contractors(id, name, trade),
          line_item_progress:payment_line_item_progress(
            id,
            line_item:project_line_items(id, description_of_work)
          )
        `)
        .order("created_at", { ascending: false });

      if (appsError) throw new Error(appsError.message);

      const sortedApps = (appsRaw || []).sort((a, b) => {
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (a.status !== "submitted" && b.status === "submitted") return 1;
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setApplications(sortedApps);

      // Fetch projects for filter
      const { data: projectsRaw, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, client_name")
        .eq("status", "active");

      if (projectsError) throw new Error(projectsError.message);
      setProjects(projectsRaw || []);

      // Calculate stats
      const { data: smsConvos } = await supabase
        .from("payment_sms_conversations")
        .select("id, conversation_state");

      // SMS Pending: Applications with sms_sent status
      const pendingSMS = (appsRaw || []).filter((app: any) =>
        app.status === "sms_sent"
      ).length;

      // Review Queue: Applications with submitted or needs_review status
      const reviewQueue = (appsRaw || []).filter((app: any) =>
        app.status === "submitted" || app.status === "needs_review"
      ).length;

      // Ready Checks: Approved applications (these are the "ready checks")
      const readyChecks = (appsRaw || []).filter((app: any) =>
        app.status === "approved"
      ).length;

      // Weekly Total: Total amount of approved applications in the last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTotal = (appsRaw || [])
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

  // Load data on mount
  useEffect(() => {
    fetchApplications();
    fetchDocuments();
  }, [fetchApplications, fetchDocuments]);

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
    if (selected) {
      setSelectedItems(paginatedApps.map(app => app.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
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
    // TODO: Implement signature sending
    console.log('Sending for signature:', paymentAppId);
  };

  const handleDeleteSelected = async () => {
    // TODO: Implement bulk delete
    console.log('Deleting selected:', selectedItems);
    setSelectedItems([]);
  };

  const handleApproveSelected = async () => {
    // TODO: Implement bulk approve
    console.log('Approving selected:', selectedItems);
    setSelectedItems([]);
  };

  const handleStatClick = async (type: string) => {
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
    setSelectedPaymentApp(application);
    setLoadingPaymentDetails(true);
    setShowPaymentModal(true);

    try {
      // Fetch detailed payment application data
      const { data: paymentDetails, error } = await supabase
        .from('payment_applications')
        .select(`
          *,
          project:projects(id, name, client_name, budget, spent, start_date, target_completion_date),
          contractor:contractors(id, name, trade, phone, email),
          line_item_progress:payment_line_item_progress(
            id,
            submitted_percent,
            pm_verified_percent,
            line_item:project_line_items(
              id,
              item_no,
              description_of_work,
              scheduled_value,
              percent_completed
            )
          )
        `)
        .eq('id', application.id)
        .single();

      if (error) throw error;

      setSelectedPaymentApp(paymentDetails);
    } catch (err) {
      console.error('Error fetching payment details:', err);
    } finally {
      setLoadingPaymentDetails(false);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPaymentApp(null);
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading payment applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
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
            className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Main Content - Emphasized Table */}
      <div className="flex gap-4">
        {/* Compact Sidebar */}
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
          />
        </div>

        {/* Main Table - Emphasized */}
        <div className="flex-1">
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
          />
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedItems.length}
        onDeleteSelected={handleDeleteSelected}
        onApproveSelected={handleApproveSelected}
        onClearSelection={() => setSelectedItems([])}
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

      {/* Payment Application Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {loadingPaymentDetails ? 'Loading Payment Details...' : `Payment Application #${selectedPaymentApp?.id}`}
                </h3>
                <button
                  onClick={handleClosePaymentModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingPaymentDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading payment details...</span>
                </div>
              ) : selectedPaymentApp ? (
                <div className="space-y-6">
                  {/* Payment Overview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Project</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedPaymentApp.project?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contractor</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedPaymentApp.contractor?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Trade</label>
                        <p className="text-lg font-semibold text-gray-900">{selectedPaymentApp.contractor?.trade || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          selectedPaymentApp.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedPaymentApp.status === 'submitted' ? 'bg-red-100 text-red-800' :
                          selectedPaymentApp.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                          selectedPaymentApp.status === 'check_ready' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedPaymentApp.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Payment</label>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedPaymentApp.current_payment || 0)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created</label>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(selectedPaymentApp.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Line Items ({selectedPaymentApp.line_item_progress?.length || 0})</h4>
                    {selectedPaymentApp.line_item_progress?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item No</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Value</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted %</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PM Verified %</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedPaymentApp.line_item_progress.map((lip: any) => (
                              <tr key={lip.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {lip.line_item?.item_no}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {lip.line_item?.description_of_work}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(lip.line_item?.scheduled_value || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {lip.submitted_percent || 0}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {lip.pm_verified_percent || 0}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No line items found for this payment application</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Payment Application #{selectedPaymentApp.id}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleVerifyPayment(selectedPaymentApp.id);
                          handleClosePaymentModal();
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                          selectedPaymentApp.status === "approved"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {selectedPaymentApp.status === "approved" ? "View Details" : "Verify Payment"}
                      </button>
                      <button
                        onClick={handleClosePaymentModal}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-500 font-medium">No payment details found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Payment Applications
                </button>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
                    selectedPaymentForVerification?.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                    selectedPaymentForVerification?.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                    selectedPaymentForVerification?.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {selectedPaymentForVerification?.status?.toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Payment Application Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
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
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl shadow-sm mb-8 px-6 py-4">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
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
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => setShowConfirmDialog('reject')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Application
                </button>
                <button
                  onClick={() => setShowConfirmDialog('approve')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
    </div>
  );
};

export default PaymentApplicationsView;