import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X, Search, Filter, Plus, Edit3, Eye, Trash2, Archive, Star, Calendar, DollarSign, Upload } from 'lucide-react';
import { useProjects } from '@/hooks/queries/useProjects';
import { useContractors } from '@/hooks/queries/useContractors';
import { useContracts } from '@/hooks/queries/useContracts';
import { useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/mutations/useProjectMutations';
import { useCreateContractor, useUpdateContractor, useDeleteContractor } from '@/hooks/mutations/useContractorMutations';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLineItemsState, LineItem } from '@/hooks/useLineItemsState';
import { EditableLineItemsTable } from '@/app/components/EditableLineItemsTable';
import { useModal } from '@/app/context/ModalContext';
import { Project, Subcontractor, Contract } from '@/types/schema';
import { formatCurrency } from '@/lib/theme';

// Form validation utilities
const validators = {
  required: (value: string) => value.trim() !== '' || 'This field is required',
  email: (value: string) => {
    if (!value.trim()) return true; // Allow empty email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address';
  },
  phone: (value: string) => {
    if (!value.trim()) return true; // Allow empty phone
    return /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/.test(value) || 'Please enter a valid phone number';
  },
  number: (value: string) => 
    !isNaN(Number(value)) && Number(value) >= 0 || 'Please enter a valid positive number',
  date: (value: string) => 
    !isNaN(Date.parse(value)) || 'Please enter a valid date'
};

interface FieldConfig {
  name: string;
  placeholder: string;
  type?: string;
  validators?: ((value: string) => string | true)[];
  required?: boolean;
  defaultValue?: string;
}

// Improved Quick Actions Component
const QuickActions: React.FC<{
  activeTab: string;
  onAddNew: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onExport?: () => void;
  onSelectAll: () => void;
  totalCount: number;
}> = ({ activeTab, onAddNew, selectedCount, onBulkDelete, onExport, onSelectAll, totalCount }) => {
  const getAddLabel = () => {
    return 'New Contract';
  };

  const getIcon = () => {
    return <FilePlus className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border-2 border-destructive/20 rounded shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedCount > 1 ? `${selectedCount} Items` : 'Item'}
            </button>
            <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              ⚠️ Permanent
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onSelectAll}
        className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors text-sm font-medium"
      >
        {selectedCount === totalCount && totalCount > 0 ? 'Deselect All' : 'Select All'}
      </button>

      <button
        onClick={onAddNew}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium shadow-sm"
      >
        {getIcon()}
        <span className="hidden sm:inline">{getAddLabel()}</span>
        <span className="sm:hidden">Add</span>
      </button>

      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors font-medium"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}
    </div>
  );
};

interface Filters {
  status: string;
  trade: string;
  performance: string;
  contractValue: string;
  expiry: string;
}

// Improved Search and Filter Bar
const SearchFilterBar: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  filters: Filters;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}> = ({ searchTerm, onSearchChange, activeTab, filters, onFilterChange, onClearFilters }) => {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-primary text-gray-900 placeholder-gray-500"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
            hasActiveFilters 
              ? 'bg-primary/10 border-primary text-primary' 
              : 'bg-card border-border text-foreground hover:bg-accent'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded border">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          {activeTab === 'vendors' && (
            <>
              <select
                value={filters.trade}
                onChange={(e) => onFilterChange('trade', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Trades</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="hvac">HVAC</option>
                <option value="roofing">Roofing</option>
                <option value="drywall">Drywall</option>
                <option value="painting">Painting</option>
                <option value="flooring">Flooring</option>
                <option value="landscaping">Landscaping</option>
                <option value="general">General</option>
              </select>

              <select
                value={filters.performance}
                onChange={(e) => onFilterChange('performance', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Performance</option>
                <option value="high">High (4-5 stars)</option>
                <option value="medium">Medium (3-4 stars)</option>
                <option value="low">Low (1-3 stars)</option>
              </select>
            </>
          )}

          {activeTab === 'contracts' && (
            <>
              <select
                value={filters.contractValue}
                onChange={(e) => onFilterChange('contractValue', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Values</option>
                <option value="high">High ($100k+)</option>
                <option value="medium">Medium ($50k-$100k)</option>
                <option value="low">Low (&lt;$50k)</option>
              </select>

              <select
                value={filters.expiry}
                onChange={(e) => onFilterChange('expiry', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Expiry</option>
                <option value="expiring">Expiring Soon (≤30 days)</option>
                <option value="expired">Expired</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Tab Navigation
const TabNavigation: React.FC<{
  activeTab: string;
  onTabChange: (tab: 'contracts') => void;
  counts: { contracts: number };
}> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    { id: 'contracts' as const, label: 'Contracts', icon: FilePlus, color: 'purple', count: counts.contracts },
  ];

  return (
    <>
      {/* Mobile Tab Navigation */}
      <div className="sm:hidden">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab.id
                    ? `bg-white text-${tab.color}-600 shadow-sm`
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate text-center">{tab.label}</span>
                <span className="px-1 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full min-w-[1.2rem] text-center">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`group flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? `border-${tab.color}-500 text-${tab.color}-600`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? `text-${tab.color}-600` : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activeTab === tab.id 
                      ? `bg-${tab.color}-100 text-${tab.color}-800` 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};

// Enhanced Card Component with better styling
const ItemCard: React.FC<{
  item: Project | Subcontractor | Contract;
  type: 'project' | 'vendor' | 'contract';
  selected: boolean;
  onSelect: (id: string) => void;
  onView: (item: Project | Subcontractor | Contract) => void;
  onEdit: (item: Project | Subcontractor | Contract) => void;
  onDelete: (item: Project | Subcontractor | Contract) => void;
}> = ({ item, type, selected, onSelect, onView, onEdit, onDelete }) => {
  const getCardIcon = () => {
    switch (type) {
      case 'project': return <Building className="w-5 h-5 text-primary" />;
      case 'vendor': return <UserPlus className="w-5 h-5 text-green-600" />;
      case 'contract': return <FilePlus className="w-5 h-5 text-purple-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]';
      case 'completed': return 'bg-primary/10 text-primary border-primary';
      case 'pending': return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]';
      case 'cancelled': return 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] border-[var(--status-critical-border)]';
      default: return 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)]';
    }
  };

  return (
    <div 
      className="group bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
      onClick={() => onView(item)}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(String(item.id))}
            className="mt-1 h-4 w-4 text-primary focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getCardIcon()}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-sm sm:text-base truncate">
                {type === 'project' ? (item as Project).name : 
                 type === 'vendor' ? (item as Subcontractor).name : 
                 ((item as Contract).contract_nickname || (item as Contract).project?.name || 'Unknown Project')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {type === 'project' ? (item as Project).client_name || 'No client' :
                 type === 'vendor' ? `ID: #${item.id}` :
                 `Contract #${item.id}`}
              </p>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status || 'active')} flex-shrink-0`}>
          {item.status || 'Active'}
        </span>
      </div>

      {/* Type-specific content */}
      {type === 'project' && (() => {
        const proj = item as Project;
        const budget = proj.calculatedBudget || proj.budget || 0;
        const spent = proj.calculatedSpent || proj.spent || 0;
        const progress = budget > 0 ? (spent / budget) * 100 : 0;
        return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Phase:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm truncate block">{proj.current_phase || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Budget:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                {formatCurrency(budget)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Spent:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                {formatCurrency(spent)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Remaining:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                {formatCurrency(Math.max(0, budget - spent))}
              </span>
            </div>
          </div>
          {budget > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">
                  {progress.toFixed(2)}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 sm:h-3 relative overflow-hidden">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all duration-500 ease-out ${
                    progress > 95 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    progress > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    progress > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ 
                    width: `${Math.min(progress > 0 ? Math.max(progress, 1) : 0, 100)}%`,
                    transition: 'width 0.5s ease-out'
                  }}
                >
                  {/* Animated shimmer effect for high usage */}
                  {progress > 75 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs mt-1 gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium">
                  {progress < 0.01 ? '<0.01%' : progress.toFixed(3)}% utilized
                </span>
                <span className={`font-semibold ${
                  progress > 95 ? 'text-red-600' :
                  progress > 90 ? 'text-orange-600' :
                  progress > 75 ? 'text-yellow-600' :
                  'text-green-700'
                }`}>
                  {progress > 95 ? '⚠️ Over budget' :
                   progress > 90 ? '⚠️ Near limit' :
                   progress > 75 ? '⚡ High usage' :
                   '✅ On track'}
                </span>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {type === 'vendor' && (() => {
        const vendor = item as Subcontractor;
        return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-border">
              {vendor.trade}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-gray-500 text-xs sm:text-sm">Phone:</span>
              <span className="text-gray-900 text-xs sm:text-sm truncate">{vendor.phone || 'Not provided'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-gray-500 text-xs sm:text-sm">Performance:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${
                      star <= (vendor.performance_score || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs sm:text-sm text-gray-600 ml-1">
                  {vendor.performance_score || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {type === 'contract' && (() => {
        const contract = item as Contract;
        return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Vendor:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm truncate block">{contract.subcontractor?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Amount:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">{formatCurrency(contract.contract_amount || 0)}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <span className="text-gray-500 text-xs sm:text-sm">Start:</span>
              <span className="text-gray-900 text-xs sm:text-sm">{contract.start_date || 'Not set'}</span>
            </div>
            {contract.end_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-500 text-xs sm:text-sm">End:</span>
                <span className="text-gray-900 text-xs sm:text-sm">{contract.end_date}</span>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onView(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-gray-600 hover:text-primary text-xs sm:text-sm font-medium border border-gray-300 rounded hover:border-blue-300 hover:bg-primary/10 transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        <button
          onClick={() => onEdit(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-primary hover:text-primary/80 text-xs sm:text-sm font-medium border border-border rounded hover:bg-primary/10 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium border border-red-300 rounded hover:bg-red-50 transition-all duration-200 hover:shadow-sm"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Enhanced form component (keeping existing functionality but with better styling)
type AddFormProps = {
  title: string;
  icon: ReactNode;
  fields: FieldConfig[];
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  setDirty: (dirty: boolean) => void;
  initialData?: Record<string, string>;
};

const AddForm: React.FC<AddFormProps> = ({ 
  title, 
  icon, 
  fields, 
  onSubmit, 
  onClose,
  isLoading = false,
  setDirty,
  initialData
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    () => {
      const defaultData = fields.reduce((acc, field) => {
        acc[field.name] = field.defaultValue || '';
        return acc;
      }, {} as Record<string, string>);

      return initialData ? { ...defaultData, ...initialData } : defaultData;
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';

    if (field.required && !value.trim()) {
      return 'This field is required';
    }

    if (field.validators) {
      for (const validator of field.validators) {
        const result = validator(value);
        if (result !== true) {
          return result;
        }
      }
    }

    return '';
  }, [fields]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      let newValue = value;
      if (!newValue.startsWith('+1')) {
        newValue = '+1' + newValue.replace(/[^\d]/g, '').replace(/^1*/, '');
      }
      setFormData(prev => ({ ...prev, [name]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setDirty(true);
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    setDirty(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(field => {
      newTouched[field.name] = true;
      const error = validateField(field.name, formData[field.name] || '');
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({});
      setErrors({});
      setTouched({});
      setDirty(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const labelize = (str: string) => 
    str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-white rounded-lg p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {labelize(field.name)}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`
                w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500
                ${errors[field.name] && touched[field.name] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-primary'
                }
              `}
              placeholder={field.placeholder}
              disabled={isLoading}
            />
            {errors[field.name] && touched[field.name] && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors[field.name]}
              </p>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors duration-200 font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-primary text-white rounded hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Contract form component (keeping existing functionality)
const AddContractForm: React.FC<{ 
  onClose: () => void; 
  onRefresh: () => Promise<void>;
  setDirty: (dirty: boolean) => void;
  initialData?: Contract;
  isEdit?: boolean;
  projects: Project[];
  subcontractors: Subcontractor[];
}> = ({ onClose, onRefresh, setDirty, initialData, isEdit = false, projects, subcontractors }) => {
  const { showToast } = useModal();
  const [formData, setFormData] = useState({
    projectId: initialData?.project_id?.toString() || "",
    subcontractorId: initialData?.subcontractor_id?.toString() || "",
    contractAmount: initialData?.contract_amount?.toString() || "",
    contractNickname: initialData?.contract_nickname || "",
    startDate: initialData?.start_date || "",
    endDate: initialData?.end_date || "",
  });
  
  // Use the new line items state management hook
  const lineItemsHook = useLineItemsState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContractLocked, setIsContractLocked] = useState(false);
  const [validationError, setValidationError] = useState('');
  const initialItemsLoaded = useRef(false);

  // Initialize empty rows for new contracts, load existing for edits
  useEffect(() => {
    if (!isEdit) {
      lineItemsHook.initializeEmptyRows(5);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Load existing line items and check for locking when editing
  useEffect(() => {
    if (isEdit && initialData?.id) {
      const loadData = async () => {
        try {
          // Check if contract is locked (has payment applications)
          const { data: paymentApps, error: paymentError } = await supabase
            .from('payment_applications')
            .select('id, status')
            .eq('project_id', initialData.project_id)
            .eq('contractor_id', initialData.subcontractor_id);

          if (paymentError) {
            console.error('Error checking payment applications:', paymentError);
            setIsContractLocked(false);
          } else if (paymentApps && paymentApps.length > 0) {
            const hasNonDraftPayments = paymentApps.some(app => app.status !== 'draft');
            setIsContractLocked(hasNonDraftPayments);
          } else {
            setIsContractLocked(false);
          }

          // Load line items
          const { data: lineItemsData, error: lineItemsError } = await supabase
            .from('project_line_items')
            .select('*')
            .eq('contract_id', initialData.id)
            .order('display_order', { ascending: true });

          if (lineItemsError) {
            console.error('Error loading line items:', lineItemsError);
            lineItemsHook.initializeEmptyRows(5);
            return;
          }

          if (lineItemsData && lineItemsData.length > 0) {
            const formattedLineItems: LineItem[] = lineItemsData.map((item, index) => ({
              id: crypto.randomUUID(),
              itemNo: index + 1,
              description: item.description_of_work || '',
              scheduledValue: item.scheduled_value?.toString() || '',
              fromPrevious: item.from_previous_application?.toString() || '0.00',
              thisPeriod: item.this_period?.toString() || '0.00',
              materialStored: item.material_presently_stored?.toString() || '0.00',
              percentGC: item.percent_gc?.toString() || '0.00',
            }));
            lineItemsHook.setAllItems(formattedLineItems);
          } else {
            lineItemsHook.initializeEmptyRows(5);
          }
        } catch (error) {
          console.error('Error loading contract data:', error);
          setIsContractLocked(false);
          lineItemsHook.initializeEmptyRows(5);
        }
      };
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialData?.id]);

  // Keyboard undo handler (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with text input undo
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.tagName === 'SELECT' ||
                      target.isContentEditable;
      
      // Check for Ctrl+Z (Windows) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInput) {
        if (lineItemsHook.canUndo) {
          e.preventDefault();
          lineItemsHook.undo();
          showToast({ message: 'Undone', type: 'info', duration: 2000 });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineItemsHook.canUndo, lineItemsHook.undo, showToast]);

  // Track line item changes and mark form as dirty
  useEffect(() => {
    if (initialItemsLoaded.current) {
      // Any change after initial load marks form as dirty
      setDirty(true);
    } else if (lineItemsHook.items.length > 0) {
      initialItemsLoaded.current = true;
    }
  }, [lineItemsHook.items, setDirty]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.subcontractorId) newErrors.subcontractorId = 'Subcontractor is required';
    if (!formData.contractAmount) {
      newErrors.contractAmount = 'Contract amount is required';
    } else if (isNaN(Number(formData.contractAmount)) || Number(formData.contractAmount) <= 0) {
      newErrors.contractAmount = 'Contract amount must be a positive number';
    }
    if (!formData.contractNickname.trim()) newErrors.contractNickname = 'Contract nickname is required';

    // Validate line items using the hook
    if (lineItemsHook.hasEmptyRows) {
      setValidationError('Some line items are incomplete. Please fill in both description and value, or remove the row.');
    } else if (Math.abs(lineItemsHook.totalScheduledValue - Number(formData.contractAmount)) > 0.01) {
      setValidationError(`Total Scheduled Value ($${lineItemsHook.totalScheduledValue.toFixed(2)}) must equal Contract Amount ($${Number(formData.contractAmount).toFixed(2)})`);
    } else {
      setValidationError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !validationError;
  };

  const validateLineItemField = (value: string, fieldName: string): string => {
    if (value === '') return '';

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number`;
    }
    if (numValue < 0) {
      return `${fieldName} cannot be negative`;
    }
    if (numValue > 100) {
      return `${fieldName} cannot be greater than 100`;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let contractId: number;

      if (isEdit && initialData?.id) {
        // Update existing contract
        const { data, error: contractError } = await supabase
          .from('contracts')
          .update({
            project_id: Number(formData.projectId),
            subcontractor_id: Number(formData.subcontractorId),
            contract_amount: Number(formData.contractAmount),
            contract_nickname: formData.contractNickname || null,
            start_date: formData.startDate,
            end_date: formData.endDate || null,
          })
          .eq('id', initialData.id)
          .select()
          .single();

        if (contractError) {
          throw new Error(`Failed to update contract: ${contractError.message}`);
        }

        contractId = data.id;
      } else {
        // Create new contract
        const { data, error: contractError } = await supabase
          .from('contracts')
          .insert([{
            project_id: Number(formData.projectId),
            subcontractor_id: Number(formData.subcontractorId),
            contract_amount: Number(formData.contractAmount),
            contract_nickname: formData.contractNickname || null,
            start_date: formData.startDate,
            end_date: formData.endDate || null,
          }])
          .select()
          .single();

        if (contractError) {
          throw new Error(`Failed to create contract: ${contractError.message}`);
        }

        contractId = data.id;
      }

      // Create corresponding entry in project_contractors table
      if (!isEdit) {
        // Check if project_contractors entry already exists
        const { data: existingProjectContractor } = await supabase
          .from('project_contractors')
          .select('id')
          .eq('project_id', Number(formData.projectId))
          .eq('contractor_id', Number(formData.subcontractorId))
          .single();

        if (!existingProjectContractor) {
          // Create new project_contractors entry
          const { error: projectContractorError } = await supabase
            .from('project_contractors')
            .insert({
              project_id: Number(formData.projectId),
              contractor_id: Number(formData.subcontractorId),
              contract_amount: Number(formData.contractAmount),
              paid_to_date: 0,
              contract_status: 'active'
            });

          if (projectContractorError) {
            // If project_contractors creation fails, delete the contract
            if (!isEdit) {
              await supabase.from('contracts').delete().eq('id', contractId);
            }
            throw new Error(`Failed to create project contractor relationship: ${projectContractorError.message}`);
          }
        }
      }

      // Save line items using items from the hook
      const itemsToSave = lineItemsHook.itemsWithData;
      
      if (itemsToSave.length > 0) {
        // Delete existing line items if editing
        if (isEdit && initialData?.id) {
          await supabase
            .from('project_line_items')
            .delete()
            .eq('contract_id', initialData.id);
        }

        // Insert all line items
        const itemsToInsert = itemsToSave.map((item, index) => ({
          contract_id: contractId,
          project_id: Number(formData.projectId),
          contractor_id: Number(formData.subcontractorId),
          item_no: item.itemNo,
          description_of_work: item.description,
          scheduled_value: Number(item.scheduledValue) || 0,
          from_previous_application: Number(item.fromPrevious) || 0,
          this_period: Number(item.thisPeriod) || 0,
          material_presently_stored: Number(item.materialStored) || 0,
          percent_gc: Number(item.percentGC) || 0,
          display_order: index + 1,
          status: 'active',
        }));

        const { error: lineItemsError } = await supabase
          .from('project_line_items')
          .insert(itemsToInsert);

        if (lineItemsError) {
          if (!isEdit) {
            await supabase.from('contracts').delete().eq('id', contractId);
          }
          throw new Error(`Failed to save line items: ${lineItemsError.message}`);
        }
      }

      if (!isEdit) {
        setFormData({
          projectId: "",
          subcontractorId: "",
          contractAmount: "",
          contractNickname: "",
          startDate: "",
          endDate: "",
        });
        lineItemsHook.setAllItems([]);
      }

      showToast({ message: isEdit ? 'Contract updated successfully!' : 'Contract added successfully!', type: 'success' });
      
      // Refresh in background - don't block modal close
      onRefresh().catch(error => {
        console.error('Failed to refresh contracts:', error);
        // Data will refresh on next navigation, not critical
      });
      
      onClose();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      showToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
    setDirty(false);
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setDirty(true);
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-primary" />
          {isEdit ? 'Edit Contract' : 'Add Contract'}
        </h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.projectId}
            onChange={handleInputChange('projectId')}
            className={`
              w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
              ${errors.projectId ? 'border-red-300' : 'border-gray-300'}
            `}
            disabled={loading}
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.projectId && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.projectId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.subcontractorId}
            onChange={handleInputChange('subcontractorId')}
            className={`
              w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
              ${errors.subcontractorId ? 'border-red-300' : 'border-gray-300'}
            `}
            disabled={loading}
          >
            <option value="">Select a vendor</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.subcontractorId && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.subcontractorId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.contractAmount}
            onChange={handleInputChange('contractAmount')}
            className={`
              w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
              ${errors.contractAmount ? 'border-red-300' : 'border-gray-300'}
            `}
            placeholder="0.00"
            disabled={loading}
          />
          {errors.contractAmount && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.contractAmount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Nickname
          </label>
          <input
            type="text"
            value={formData.contractNickname}
            onChange={handleInputChange('contractNickname')}
            className={`
              w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
              ${errors.contractNickname ? 'border-red-300' : 'border-gray-300'}
            `}
            placeholder="e.g., Plumbing Phase 1, Electrical Rough-In"
            disabled={loading}
          />
          {errors.contractNickname && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.contractNickname}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={handleInputChange('startDate')}
              className={`
                w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
                ${errors.startDate ? 'border-red-300' : 'border-gray-300'}
              `}
              disabled={loading}
            />
            {errors.startDate && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.startDate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={handleInputChange('endDate')}
              min={formData.startDate}
              className={`
                w-full px-4 py-3 text-base border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
                ${errors.endDate ? 'border-red-300' : 'border-gray-300'}
              `}
              disabled={loading}
            />
            {errors.endDate && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* Contract Locking Warning */}
        {isContractLocked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Contract Locked</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Line items cannot be edited after a payment application has been submitted.
            </p>
          </div>
        )}

        {/* CSV Import Placeholder */}
        <div className="relative inline-block mb-4">
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-300 rounded cursor-not-allowed"
            title="CSV import functionality coming in Phase 2"
          >
            <Upload className="w-4 h-4" />
            Import from CSV (Coming Soon)
          </button>
        </div>

        {/* Line Items Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
          
          <EditableLineItemsTable
            items={lineItemsHook.items}
            contractAmount={Number(formData.contractAmount) || 0}
            emptyRowIds={lineItemsHook.emptyRowIds}
            onAdd={lineItemsHook.addItem}
            onUpdate={lineItemsHook.updateItem}
            onDelete={lineItemsHook.deleteItems}
            onReorder={lineItemsHook.reorderItem}
            isEditable={!isContractLocked}
            maxItems={15}
            onMaxItemsReached={() => 
              showToast({ 
                message: 'Maximum 15 line items reached. Contact admin for more.', 
                type: 'warning' 
              })
            }
          />
          
          {/* Validation Messages */}
          {validationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {validationError}
              </p>
            </div>
          )}
          
          {/* Total Display */}
          <div className="mt-3 text-right">
            <p className="text-sm text-gray-600">
              Total Scheduled Value:{' '}
              <span className={`font-semibold ${
                Math.abs(lineItemsHook.totalScheduledValue - Number(formData.contractAmount)) < 0.01
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                ${lineItemsHook.totalScheduledValue.toFixed(2)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors duration-200 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-white rounded hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              isEdit ? 'Update Contract' : 'Create Contract'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Enhanced main component
interface ManageViewProps {
  searchQuery?: string;
}

const ManageView: React.FC<ManageViewProps> = ({ searchQuery = '' }) => {
  // Use React Query hooks instead of DataContext
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: subcontractors = [], isLoading: contractorsLoading, refetch: refetchContractors } = useContractors();
  const { data: contracts = [], isLoading: contractsLoading, refetch: refetchContracts } = useContracts();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useModal();
  const [openForm, setOpenForm] = useState<'contract' | null>(null);
  const [pendingForm, setPendingForm] = useState<'contract' | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'contracts'>('contracts');
  const [filters, setFilters] = useState({
    status: 'all',
    trade: 'all',
    performance: 'all',
    contractValue: 'all',
    expiry: 'all'
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewModal, setViewModal] = useState<'contract' | null>(null);
  const [editModal, setEditModal] = useState<'contract' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Contract | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync global search query with local search term
  useEffect(() => {
    if (searchQuery !== searchTerm) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // URL-based subtab management
  useEffect(() => {
    const subtab = searchParams.get('subtab') as 'contracts' | null;
    if (subtab && ['contracts'].includes(subtab)) {
      setActiveTab(subtab);
    }
  }, [searchParams]);

  const handleSubtabChange = (subtab: 'contracts') => {
    setActiveTab(subtab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', subtab);
    params.set('tab', 'manage');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // React Query handles data refreshing automatically
  const refreshContracts = useCallback(async () => {
    try {
      await refetchContracts();
      showToast({ message: 'Contracts refreshed', type: 'success' });
    } catch (error) {
      console.error('Error refreshing contracts:', error);
      showToast({ message: 'Failed to refresh contracts data', type: 'error' });
    }
  }, [refetchContracts, showToast]);

  const refreshSubcontractors = useCallback(async () => {
    try {
      await refetchContractors();
      showToast({ message: 'Contractors refreshed', type: 'success' });
    } catch (error) {
      console.error('Error refreshing subcontractors:', error);
      showToast({ message: 'Failed to refresh subcontractors data', type: 'error' });
    }
  }, [refetchContractors, showToast]);





  const handleOpenForm = (form: 'contract') => {
    if (formDirty && openForm !== form) {
      setPendingForm(form);
      setShowUnsavedWarning(true);
    } else {
      setOpenForm(form);
      setFormDirty(false);
    }
  };

  const handleConfirmSwitch = () => {
    setOpenForm(pendingForm);
    setPendingForm(null);
    setFormDirty(false);
    setShowUnsavedWarning(false);
  };

  const handleCancelSwitch = () => {
    setPendingForm(null);
    setShowUnsavedWarning(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      trade: 'all',
      performance: 'all',
      contractValue: 'all',
      expiry: 'all'
    });
  };

  // Search and filter functions

  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = contract.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contract.subcontractor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (contract.contract_nickname || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || contract.status === filters.status;
      const matchesValue = filters.contractValue === 'all' ||
        (filters.contractValue === 'high' && (contract.contract_amount || 0) >= 100000) ||
        (filters.contractValue === 'medium' && (contract.contract_amount || 0) >= 50000 && (contract.contract_amount || 0) < 100000) ||
        (filters.contractValue === 'low' && (contract.contract_amount || 0) < 50000);
      const matchesExpiry = filters.expiry === 'all' ||
        (filters.expiry === 'expiring' && (() => {
          if (!contract.end_date || contract.status === 'completed') return false;
          const endDate = new Date(contract.end_date);
          const now = new Date();
          const daysUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        })()) ||
        (filters.expiry === 'expired' && (() => {
          if (!contract.end_date) return false;
          const endDate = new Date(contract.end_date);
          const now = new Date();
          return endDate < now;
        })()) ||
        (filters.expiry === 'ongoing' && (() => {
          if (!contract.end_date) return true;
          const endDate = new Date(contract.end_date);
          const now = new Date();
          return endDate >= now;
        })());
      return matchesSearch && matchesStatus && matchesValue && matchesExpiry;
    });
  }, [contracts, searchTerm, filters]);

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    if (selectedItems.size === currentData.length && currentData.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentData.map(item => item.id)));
    }
  };

  const handleItemSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setShowDeleteConfirmation(true);
  };

  const handleExport = () => {
    try {
      const data = currentData as unknown as Contract[];
      
      if (data.length === 0) {
        showToast({ message: 'No data to export', type: 'info' });
        return;
      }
      
      // Prepare CSV headers
      const headers = [
        'ID',
        'Project',
        'Contractor',
        'Trade',
        'Original Amount',
        'Change Orders',
        'Current Amount',
        'Paid to Date',
        'Remaining',
        'Status',
        'Start Date',
        'End Date',
      ];
      
      // Prepare CSV rows
      const rows = data.map((contract: any) => {
        const changeOrders = (contract.contract_amount || 0) - (contract.original_contract_amount || 0);
        const remaining = (contract.contract_amount || 0) - (contract.paid_to_date || 0);
        
        // Get project and contractor names from the contract object if available
        const projectName = contract.project?.name || contract.project_name || 'Unknown';
        const contractorName = contract.contractor?.name || contract.contractor_name || 'Unknown';
        const contractorTrade = contract.contractor?.trade || contract.contractor_trade || 'N/A';
        
        return [
          contract.id,
          `"${projectName}"`,
          `"${contractorName}"`,
          `"${contractorTrade}"`,
          contract.original_contract_amount || 0,
          changeOrders,
          contract.contract_amount || 0,
          contract.paid_to_date || 0,
          remaining,
          `"${contract.contract_status || 'active'}"`,
          contract.start_date || '',
          contract.end_date || '',
        ].join(',');
      });
      
      // Create CSV content
      const csv = [headers.join(','), ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contracts_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast({ message: `Exported ${data.length} contract(s) successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast({ message: 'Failed to export data. Please try again.', type: 'error' });
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      // React Query will automatically refetch contracts after mutation
      // No need for manual dispatch - the query will update automatically

      showToast({ message: `Successfully deleted ${selectedItems.size} item(s)`, type: 'success' });
      setSelectedItems(new Set());
      setShowDeleteConfirmation(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete items';
      showToast({ message, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewItem = (item: any) => {
    setSelectedItem(item as Contract);
    setViewModal('contract');
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item as Contract);
    setEditModal('contract');
  };

  const handleCloseViewModal = () => {
    setViewModal(null);
    setSelectedItem(null);
  };

  const handleCloseEditModal = () => {
    setEditModal(null);
    setSelectedItem(null);
  };

  // Get current filtered data
  const getCurrentData = () => {
    switch (activeTab) {
      case 'contracts': return filteredContracts;
      default: return [];
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              Construction Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Manage your projects, vendors, and contracts in one place
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={handleSubtabChange}
            counts={{
              contracts: filteredContracts.length
            }}
          />
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeTab={activeTab}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {selectedItems.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedItems.size} of {currentData.length} selected
              </span>
            )}
          </div>
          <QuickActions
            activeTab={activeTab}
            onAddNew={() => handleOpenForm('contract')}
            selectedCount={selectedItems.size}
            onBulkDelete={handleBulkDelete}
            onExport={handleExport}
            onSelectAll={handleSelectAll}
            totalCount={currentData.length}
          />
        </div>

        {/* Help Text for New Users */}
        {currentData.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 border border-border rounded">
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs font-bold">?</span>
              </div>
              <span>
                <strong>Quick Actions:</strong> Select items using checkboxes, or use individual action buttons on each card. 
                Delete actions are clearly marked and require confirmation for safety.
              </span>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {currentData.map((item) => (
            <ItemCard
              key={item.id}
              item={item as unknown as Contract}
              type="contract"
              selected={selectedItems.has(item.id.toString())}
              onSelect={(id) => handleItemSelect(id)}
              onView={(i) => handleViewItem(i as unknown as Contract)}
              onEdit={(i) => handleEditItem(i as unknown as Contract)}
              onDelete={() => {
                setSelectedItems(new Set([item.id.toString()]));
                setShowDeleteConfirmation(true);
              }}
            />
          ))}
        </div>

        {/* Empty State */}
        {currentData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FilePlus className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No contracts found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No contracts match your search criteria.' : 'Get started by creating your first contract.'}
            </p>
            <button
              onClick={() => handleOpenForm('contract')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded hover:bg-primary/90 transition-colors font-medium"
            >
              <FilePlus className="w-4 h-4" />
              Add Contract
            </button>
          </div>
        )}
      </div>

      {/* Modal Forms */}
      {openForm === 'contract' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full">
            <AddContractForm
              onClose={() => setOpenForm(null)}
              onRefresh={async () => { await refetchContracts(); }}
              setDirty={setFormDirty}
              projects={projects as unknown as Project[]}
              subcontractors={subcontractors as unknown as Subcontractor[]}
            />
          </div>
        </div>
      )}

      {/* View Modals */}
      {viewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Contract Details
              </h3>
              <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div><span className="font-semibold">Project:</span> {selectedItem.project?.name || 'Unknown Project'}</div>
              <div><span className="font-semibold">Vendor:</span> {selectedItem.subcontractor?.name || 'Unknown Vendor'}</div>
              {selectedItem.contract_nickname && (
                <div><span className="font-semibold">Contract Nickname:</span> {selectedItem.contract_nickname}</div>
              )}
              <div><span className="font-semibold">Contract Amount:</span> {formatCurrency(selectedItem.contract_amount || 0)}</div>
              <div><span className="font-semibold">Start Date:</span> {selectedItem.start_date || 'Not set'}</div>
              <div><span className="font-semibold">End Date:</span> {selectedItem.end_date || 'Ongoing'}</div>
              <div><span className="font-semibold">Status:</span> {selectedItem.status || 'Active'}</div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditItem(selectedItem)}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Edit Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modals */}

      {editModal === 'contract' && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full">
            <AddContractForm
              onClose={handleCloseEditModal}
              onRefresh={async () => { await refetchContracts(); }}
              setDirty={setFormDirty}
              initialData={selectedItem}
              isEdit={true}
              projects={projects as unknown as Project[]}
              subcontractors={subcontractors as unknown as Subcontractor[]}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirmation(false)}
        >
          <div 
            className="bg-card rounded-lg shadow-2xl max-w-lg w-full p-6 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Warning Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--status-critical-bg)] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-[var(--status-critical-icon)]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Delete Confirmation</h3>
                <p className="text-sm text-muted-foreground mt-1">This action cannot be undone</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] rounded p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--status-critical-border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[var(--status-critical-icon)] text-sm font-bold">!</span>
                </div>
                <div>
                  <p className="text-[var(--status-critical-text)] font-medium mb-2">
                    Are you sure you want to delete {selectedItems.size} contract{selectedItems.size > 1 ? 's' : ''}?
                  </p>
                  <ul className="text-[var(--status-critical-text)] text-sm space-y-1">
                    <li>• This will permanently remove {selectedItems.size > 1 ? 'them' : 'it'} from your system</li>
                    <li>• All associated data will be lost</li>
                    <li>• This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => setShowDeleteConfirmation(false)} 
                className="flex-1 sm:flex-none px-6 py-3 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors font-medium border border-border"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkDelete} 
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-lg"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete {selectedItems.size > 1 ? `${selectedItems.size} Items` : '1 Item'}
                  </>
                )}
              </button>
            </div>

            {/* Additional Safety Note */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                💡 Tip: You can always recreate items if needed, but historical data will be lost.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Warning Modal */}
      {showUnsavedWarning && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCancelSwitch}
        >
          <div 
            className="bg-card rounded-lg shadow-2xl max-w-md w-full p-6 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--status-warning-bg)] flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-[var(--status-warning-icon)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Unsaved Changes</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              You have unsaved changes. Are you sure you want to switch forms? Your current changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelSwitch} 
                className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors border border-border"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSwitch} 
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded transition-colors shadow-lg"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageView;