'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, Filter, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

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
function CompactStatCard({ icon, label, value, change, color, onClick }: any) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:border-blue-300' : ''}`}
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
function CompactStats({ pendingSMS, reviewQueue, readyChecks, weeklyTotal, onStatClick }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <CompactStatCard
        icon="📱"
        label="SMS Pending"
        value={pendingSMS}
        color="bg-orange-500"
        onClick={() => onStatClick('sms_pending')}
      />
      <CompactStatCard
        icon="⚠️"
        label="Review Queue"
        value={reviewQueue}
        color="bg-red-500"
        onClick={() => onStatClick('review_queue')}
      />
      <CompactStatCard
        icon="💰"
        label="Ready Checks"
        value={readyChecks}
        color="bg-purple-500"
        onClick={() => onStatClick('ready_checks')}
      />
      <CompactStatCard
        icon="📊"
        label="Weekly Total"
        value={formatCurrency(weeklyTotal)}
        color="bg-blue-500"
        onClick={() => onStatClick('weekly_total')}
      />
    </div>
  );
}

// Payment Card Component
function PaymentCard({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature }: any) {
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
    <div className={`bg-white border rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
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
function PaymentRow({ application, isSelected, onSelect, onVerify, getDocumentForApp, sendForSignature }: any) {
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
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
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
function PaymentTable({ applications, onVerify, getDocumentForApp, sendForSignature, selectedItems, onSelectItem, onSelectAll, currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: any) {
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
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
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
      
      const pendingSMS = (smsConvos || []).filter(
        (c: any) => c.conversation_state !== "completed"
      ).length;
      
      const reviewQueue = (appsRaw || []).filter((app: any) =>
        app.status === "submitted"
      ).length;
      
      const readyChecks = (appsRaw || []).filter((app: any) =>
        app.status === "sms_sent"
      ).length;
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTotal = (appsRaw || [])
        .filter((a: any) => a.created_at && new Date(a.created_at) >= weekAgo && a.status !== 'approved')
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
    // TODO: Implement stat click handling
    console.log('Stat clicked:', type);
  };

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
    </div>
  );
};

export default PaymentApplicationsView;
