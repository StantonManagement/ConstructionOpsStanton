import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X, Search, Filter, Plus, Edit3, Eye, Trash2, Archive, Star, Calendar, DollarSign } from 'lucide-react';
import LineItemFormModal from '@/components/LineItemFormModal';
import LineItemEditor, { LineItem } from '@/components/LineItemEditor';
import { useRouter, useSearchParams } from 'next/navigation';

// Enhanced notification system
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationData {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

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

// Enhanced notification component with better positioning
const NotificationManager: React.FC<{
  notifications: NotificationData[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-3 min-w-80 backdrop-blur-sm
            ${notification.type === 'success' ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' : ''}
            ${notification.type === 'error' ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]' : ''}
            ${notification.type === 'warning' ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]' : ''}
            ${notification.type === 'info' ? 'bg-primary text-primary-foreground' : ''}
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-sm">{notification.message}</span>
          <button
            onClick={() => onRemove(notification.id)}
            className="hover:opacity-70 transition-opacity flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

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
        <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border-2 border-destructive/20 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
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
        className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
      >
        {selectedCount === totalCount && totalCount > 0 ? 'Deselect All' : 'Select All'}
      </button>

      <button
        onClick={onAddNew}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
      >
        {getIcon()}
        <span className="hidden sm:inline">{getAddLabel()}</span>
        <span className="sm:hidden">Add</span>
      </button>

      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      )}
    </div>
  );
};

// Improved Search and Filter Bar
const SearchFilterBar: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  filters: any;
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
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg border">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">All Values</option>
                <option value="high">High ($100k+)</option>
                <option value="medium">Medium ($50k-$100k)</option>
                <option value="low">Low (&lt;$50k)</option>
              </select>

              <select
                value={filters.expiry}
                onChange={(e) => onFilterChange('expiry', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
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
  item: any;
  type: 'project' | 'vendor' | 'contract';
  selected: boolean;
  onSelect: (id: number) => void;
  onView: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}> = ({ item, type, selected, onSelect, onView, onEdit, onDelete }) => {
  const getCardIcon = () => {
    switch (type) {
      case 'project': return <Building className="w-5 h-5 text-blue-600" />;
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
      className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
      onClick={() => onView(item)}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(item.id)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getCardIcon()}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
                {type === 'project' ? item.name : 
                 type === 'vendor' ? item.name : 
                 (item.contract_nickname || item.project?.name || 'Unknown Project')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {type === 'project' ? item.client_name || 'No client' :
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
      {type === 'project' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Phase:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm truncate block">{item.current_phase || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Budget:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                ${(item.calculatedBudget || item.budget || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Spent:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                ${(item.calculatedSpent || item.spent || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Remaining:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">
                ${Math.max(0, (item.calculatedBudget || item.budget || 0) - (item.calculatedSpent || item.spent || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          {((item.calculatedBudget || item.budget) > 0) && (
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium">
                  {((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 sm:h-3 relative overflow-hidden">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all duration-500 ease-out ${
                    ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 95 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ 
                    width: `${Math.min(((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 0 ? Math.max(((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100, 1) : 0, 100)}%`,
                    transition: 'width 0.5s ease-out'
                  }}
                >
                  {/* Animated shimmer effect for high usage */}
                  {(((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 75) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs mt-1 gap-1 sm:gap-0">
                <span className="text-gray-500 font-medium">
                  {((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 < 0.01 ? '<0.01%' : (((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100).toFixed(3)}% utilized
                </span>
                <span className={`font-semibold ${
                  ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 95 ? 'text-red-600' :
                  ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 90 ? 'text-orange-600' :
                  ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 75 ? 'text-yellow-600' :
                  'text-green-700'
                }`}>
                  {((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 95 ? '⚠️ Over budget' :
                   ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 90 ? '⚠️ Near limit' :
                   ((item.calculatedSpent || item.spent || 0) / (item.calculatedBudget || item.budget)) * 100 > 75 ? '⚡ High usage' :
                   '✅ On track'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {type === 'vendor' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              {item.trade}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-gray-500 text-xs sm:text-sm">Phone:</span>
              <span className="text-gray-900 text-xs sm:text-sm truncate">{item.phone || 'Not provided'}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-gray-500 text-xs sm:text-sm">Performance:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${
                      star <= ((item as any).performance_score || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-xs sm:text-sm text-gray-600 ml-1">
                  {(item as any).performance_score || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'contract' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Vendor:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm truncate block">{item.subcontractor?.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500 text-xs sm:text-sm">Amount:</span>
              <span className="ml-1 text-gray-900 font-medium text-xs sm:text-sm">${(item.contract_amount || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              <span className="text-gray-500 text-xs sm:text-sm">Start:</span>
              <span className="text-gray-900 text-xs sm:text-sm">{item.start_date || 'Not set'}</span>
            </div>
            {item.end_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <span className="text-gray-500 text-xs sm:text-sm">End:</span>
                <span className="text-gray-900 text-xs sm:text-sm">{item.end_date}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onView(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-gray-600 hover:text-blue-600 text-xs sm:text-sm font-medium border border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        <button
          onClick={() => onEdit(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(item)}
          className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 hover:shadow-sm"
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
    <div className="bg-white rounded-xl p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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
                w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-500
                ${errors[field.name] && touched[field.name] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
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
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400 flex items-center gap-2 font-medium"
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
  onSuccess?: () => void;
  onError?: (message: string) => void;
  setDirty: (dirty: boolean) => void;
  initialData?: any;
  isEdit?: boolean;
}> = ({ onClose, onSuccess, onError, setDirty, initialData, isEdit = false }) => {
  const { projects, subcontractors } = useData();
  const [formData, setFormData] = useState({
    projectId: initialData?.project_id?.toString() || "",
    subcontractorId: initialData?.subcontractor_id?.toString() || "",
    contractAmount: initialData?.contract_amount?.toString() || "",
    contractNickname: initialData?.contract_nickname || "",
    startDate: initialData?.start_date || "",
    endDate: initialData?.end_date || "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineItemForm, setLineItemForm] = useState({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
  const [editingLineItemIndex, setEditingLineItemIndex] = useState<number | null>(null);
  const [showLineItemForm, setShowLineItemForm] = useState(false);

  const totalScheduledValue = lineItems.reduce((sum, item) => sum + (typeof item.scheduledValue === 'number' ? item.scheduledValue : Number(item.scheduledValue) || 0), 0);

  // Load existing line items when editing
  useEffect(() => {
    if (isEdit && initialData?.id) {
      const loadLineItems = async () => {
        try {
          const { data: lineItemsData, error } = await supabase
            .from('project_line_items')
            .select('*')
            .eq('contract_id', initialData.id)
            .order('display_order', { ascending: true });

          if (error) {
            console.error('Error loading line items:', error);
            return;
          }

          if (lineItemsData) {
            const formattedLineItems = lineItemsData.map(item => ({
              itemNo: item.item_no || '',
              description: item.description_of_work || '',
              scheduledValue: item.scheduled_value?.toString() || '',
              fromPrevious: item.from_previous_application?.toString() || '',
              thisPeriod: item.this_period?.toString() || '',
              materialStored: item.material_presently_stored?.toString() || '',
              percentGC: item.percent_gc?.toString() || '',
            }));
            setLineItems(formattedLineItems);
          }
        } catch (error) {
          console.error('Error loading line items:', error);
        }
      };

      loadLineItems();
    }
  }, [isEdit, initialData?.id]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      if (lineItems.length > 0) {
        const itemsToInsert = lineItems.map(item => ({
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
          status: 'active',
        }));

        if (isEdit && initialData?.id) {
          // For edit mode, we might want to update existing line items or add new ones
          const { error: lineItemsError } = await supabase
            .from('project_line_items')
            .insert(itemsToInsert);

          if (lineItemsError) {
            throw new Error(`Failed to update line items: ${lineItemsError.message}`);
          }
        } else {
          // Create mode
          const { error: lineItemsError } = await supabase
            .from('project_line_items')
            .insert(itemsToInsert);

          if (lineItemsError) {
            if (!isEdit) {
              await supabase.from('contracts').delete().eq('id', contractId);
            }
            throw new Error(`Failed to create line items: ${lineItemsError.message}`);
          }
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
        setLineItems([]);
      }

      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (onError) onError(message);
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

  const handleLineItemChange = (field: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLineItemForm(prev => ({ ...prev, [field]: value }));

    // Clear any existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSaveLineItem = () => {
    if (!lineItemForm.itemNo || !lineItemForm.description || !lineItemForm.scheduledValue) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate From Previous and This Period fields
    const fromPreviousError = validateLineItemField(lineItemForm.fromPrevious, 'From Previous');
    const thisPeriodError = validateLineItemField(lineItemForm.thisPeriod, 'This Period');
    const materialStoredError = validateLineItemField(lineItemForm.materialStored, 'Material Stored');
    const percentGCError = validateLineItemField(lineItemForm.percentGC, '% G/C');

    if (fromPreviousError || thisPeriodError || materialStoredError || percentGCError) {
      setErrors({
        ...errors,
        fromPrevious: fromPreviousError,
        thisPeriod: thisPeriodError,
        materialStored: materialStoredError,
        percentGC: percentGCError
      });
      return;
    }

    const newItem: LineItem = {
      ...lineItemForm,
      scheduledValue: lineItemForm.scheduledValue,
      fromPrevious: lineItemForm.fromPrevious,
      thisPeriod: lineItemForm.thisPeriod,
      materialStored: lineItemForm.materialStored,
      percentGC: lineItemForm.percentGC,
    };

    if (editingLineItemIndex !== null) {
      const updatedItems = [...lineItems];
      updatedItems[editingLineItemIndex] = newItem;
      setLineItems(updatedItems);
      setEditingLineItemIndex(null);
    } else {
      setLineItems([...lineItems, newItem]);
    }

    setLineItemForm({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
    setShowLineItemForm(false);
    // Clear any validation errors
    setErrors({});
  };

  return (
    <div className="bg-white rounded-xl p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-blue-600" />
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
              w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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
              w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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
              w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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
              w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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
                w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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
                w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
          <div className="border rounded-lg p-4 bg-gray-50 mb-4">
            {showLineItemForm ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item No</label>
                  <input
                    type="text"
                    name="itemNo"
                    value={lineItemForm.itemNo}
                    onChange={handleLineItemChange('itemNo')}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-gray-900"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={lineItemForm.description}
                    onChange={handleLineItemChange('description')}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Value</label>
                  <input
                    type="number"
                    name="scheduledValue"
                    value={lineItemForm.scheduledValue}
                    onChange={handleLineItemChange('scheduledValue')}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Previous Application</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={lineItemForm.fromPrevious}
                    onChange={handleLineItemChange('fromPrevious')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.fromPrevious ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.fromPrevious && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fromPrevious}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">This Period</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={lineItemForm.thisPeriod}
                    onChange={handleLineItemChange('thisPeriod')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.thisPeriod ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.thisPeriod && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.thisPeriod}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Material Presently Stored</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={lineItemForm.materialStored}
                    onChange={handleLineItemChange('materialStored')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.materialStored ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.materialStored && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.materialStored}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">% G/C</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={lineItemForm.percentGC}
                    onChange={handleLineItemChange('percentGC')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.percentGC ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.percentGC && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.percentGC}
                    </p>
                  )}
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveLineItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingLineItemIndex === null ? 'Add' : 'Update'}
                  </button>
                  {editingLineItemIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setLineItemForm({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
                        setEditingLineItemIndex(null);
                        setShowLineItemForm(false);
                        setErrors({});
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowLineItemForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Line Item
                </button>
              </div>
            )}
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-gray-700">Item No</th>
                  <th className="border px-2 py-1 text-gray-700">Description</th>
                  <th className="border px-2 py-1 text-gray-700">Scheduled Value</th>
                  <th className="border px-2 py-1 text-gray-700">From Previous</th>
                  <th className="border px-2 py-1 text-gray-700">This Period</th>
                  <th className="border px-2 py-1 text-gray-700">Material Stored</th>
                  <th className="border px-2 py-1 text-gray-700">% G/C</th>
                  <th className="border px-2 py-1 text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-500 py-2">No line items added.</td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1 text-gray-700">{item.itemNo}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.description}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.scheduledValue}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.fromPrevious}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.thisPeriod}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.materialStored}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.percentGC}</td>
                      <td className="border px-2 py-1 text-gray-700 flex gap-2">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => {
                            setLineItemForm(item);
                            setEditingLineItemIndex(idx);
                            setShowLineItemForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            setLineItems(prev => prev.filter((_, i) => i !== idx));
                            setErrors({}); // Clear errors when removing item
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="text-right mt-2 text-sm text-gray-700">
              Total Scheduled Value: <span className="font-semibold">${totalScheduledValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400 flex items-center gap-2 font-medium"
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
  const { dispatch, projects, subcontractors, contracts = [], refreshData } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
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
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [viewModal, setViewModal] = useState<'contract' | null>(null);
  const [editModal, setEditModal] = useState<'contract' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
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

  const addNotification = useCallback((
    type: NotificationType, 
    message: string, 
    duration: number = 5000
  ) => {
    const id = Date.now().toString();
    const notification: NotificationData = { id, type, message, duration };
    setNotifications(prev => [...prev, notification]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const refreshContracts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('contracts')
        .select(`
          *,
          projects (id, name, client_name),
          contractors (id, name, trade)
        `);
      if (data) {
        const mapped = data.map((c: any) => ({
          id: c.id,
          project_id: c.project_id,
          subcontractor_id: c.subcontractor_id,
          contract_amount: c.contract_amount,
          contract_nickname: c.contract_nickname,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status ?? 'active',
          project: c.projects,
          subcontractor: c.contractors,
        }));
        dispatch({ type: 'SET_CONTRACTS', payload: mapped });
      }
    } catch (error) {
      console.error('Error refreshing contracts:', error);
      addNotification('error', 'Failed to refresh contracts data');
    }
  }, [dispatch, addNotification]);

  const refreshSubcontractors = useCallback(async () => {
    try {
      const { data } = await supabase.from('contractors').select('*');
      if (data) {
        // Map DB fields to Subcontractor interface as needed
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          trade: c.trade,
          contractAmount: c.contract_amount ?? 0,
          paidToDate: c.paid_to_date ?? 0,
          lastPayment: c.last_payment ?? '',
          status: c.status ?? 'active',
          changeOrdersPending: c.change_orders_pending ?? false,
          lineItemCount: c.line_item_count ?? 0,
          phone: c.phone ?? '',
          email: c.email ?? '',
          hasOpenPaymentApp: c.has_open_payment_app ?? false,
          compliance: { insurance: c.insurance_status ?? 'valid', license: c.license_status ?? 'valid' },
        }));
        dispatch({ type: 'SET_SUBCONTRACTORS', payload: mapped });
      }
    } catch (error) {
      console.error('Error refreshing subcontractors:', error);
      addNotification('error', 'Failed to refresh subcontractors data');
    }
  }, [dispatch, addNotification]);





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

  const handleItemSelect = (id: number) => {
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

  const confirmBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      // Update local state with optimistic updates
      dispatch({ type: 'SET_CONTRACTS', payload: contracts.filter(c => !selectedItems.has(c.id)) });

      addNotification('success', `Successfully deleted ${selectedItems.size} item(s)`);
      setSelectedItems(new Set());
      setShowDeleteConfirmation(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete items';
      addNotification('error', message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setViewModal('contract');
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
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
        <NotificationManager 
          notifications={notifications} 
          onRemove={removeNotification} 
        />

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
            onExport={() => addNotification('info', 'Export feature coming soon!')}
            onSelectAll={handleSelectAll}
            totalCount={currentData.length}
          />
        </div>

        {/* Help Text for New Users */}
        {currentData.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs font-bold">?</span>
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
              item={item}
              type="contract"
              selected={selectedItems.has(item.id)}
              onSelect={handleItemSelect}
              onView={handleViewItem}
              onEdit={handleEditItem}
              onDelete={() => {
                setSelectedItems(new Set([item.id]));
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full">
            <AddContractForm
              onClose={() => setOpenForm(null)}
              onSuccess={async () => {
                addNotification('success', 'Contract added successfully!');
                // Refresh contracts data
                refreshData();
              }}
              onError={(message) => addNotification('error', message)}
              setDirty={setFormDirty}
            />
          </div>
        </div>
      )}

      {/* View Modals */}
      {viewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
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
              <div><span className="font-semibold">Contract Amount:</span> ${(selectedItem.contract_amount || 0).toLocaleString()}</div>
              <div><span className="font-semibold">Start Date:</span> {selectedItem.start_date || 'Not set'}</div>
              <div><span className="font-semibold">End Date:</span> {selectedItem.end_date || 'Ongoing'}</div>
              <div><span className="font-semibold">Status:</span> {selectedItem.status || 'Active'}</div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditItem(selectedItem)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full">
            <AddContractForm
              onClose={handleCloseEditModal}
              onSuccess={async () => {
                addNotification('success', 'Contract updated successfully!');
                // Refresh contracts data
                refreshData();
              }}
              onError={(message) => addNotification('error', message)}
              setDirty={setFormDirty}
              initialData={selectedItem}
              isEdit={true}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            {/* Header with Warning Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Confirmation</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-sm font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-800 font-medium mb-2">
                    Are you sure you want to delete {selectedItems.size} contract{selectedItems.size > 1 ? 's' : ''}?
                  </p>
                  <ul className="text-red-700 text-sm space-y-1">
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
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkDelete} 
                className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 font-medium flex items-center justify-center gap-2 shadow-sm"
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
              <p className="text-xs text-gray-500">
                💡 Tip: You can always recreate items if needed, but historical data will be lost.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to switch forms? Your current changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelSwitch} 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSwitch} 
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
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