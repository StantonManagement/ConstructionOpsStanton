import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useData, Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

type PaymentProcessingViewProps = {
  setSelectedProject: (project: Project) => void;
};

type PaymentApplication = {
  id: number;
  status: string;
  current_payment: number;
  created_at: string;
  payment_period_end: string;
  project_id: number;
  contractor_id: number;
  project: { id: number; name: string };
  contractor: { id: number; name: string };
  contract_amount: number | null;
  paid_to_date: number | null;
  line_items: LineItem[];
};

type LineItem = {
  item_no: string;
  description_of_work: string;
  scheduled_value: number;
  percent_completed: number;
};

type Stats = {
  totalOutstanding: number;
  totalDueSoon: number;
  overdueCount: number;
  upcomingCount: number;
};

// Custom hooks for better separation of concerns
const usePaymentApplications = () => {
  const [apps, setApps] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch payment applications with project and contractor
      const { data: appsRaw, error: appsError } = await supabase
        .from('payment_applications')
        .select(`
          id, status, current_payment, created_at, payment_period_end, project_id, contractor_id,
          project:projects(id, name),
          contractor:contractors(id, name)
        `)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Step 2: For each app, fetch contract info and line items
      const enrichedApps: PaymentApplication[] = await Promise.all((appsRaw || []).map(async (app: any) => {
        // Fetch contract info
        const { data: contractRow } = await supabase
          .from('project_contractors')
          .select('contract_amount, paid_to_date')
          .eq('project_id', app.project_id)
          .eq('contractor_id', app.contractor_id)
          .single();
        // Fetch line items
        const { data: lineItems } = await supabase
          .from('project_line_items')
          .select('item_no, description_of_work, scheduled_value, percent_completed')
          .eq('project_id', app.project_id)
          .eq('contractor_id', app.contractor_id);
        return {
          ...app,
          project: app.project || { id: app.project_id, name: 'Unknown Project' },
          contractor: app.contractor || { id: app.contractor_id, name: 'Unknown Contractor' },
          contract_amount: contractRow?.contract_amount ?? null,
          paid_to_date: contractRow?.paid_to_date ?? null,
          line_items: lineItems || [],
        };
      }));

      setApps(enrichedApps);
    } catch (err) {
      console.error('Error fetching payment applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment applications');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { apps, loading, error, refetch: fetchPaymentApplications };
};

// Utility functions
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-';
  return `$${amount.toLocaleString()}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
};

const isOverdue = (paymentPeriodEnd: string): boolean => {
  if (!paymentPeriodEnd) return false;
  return new Date(paymentPeriodEnd) < new Date();
};

const isDueSoon = (paymentPeriodEnd: string, days: number = 7): boolean => {
  if (!paymentPeriodEnd) return false;
  const dueDate = new Date(paymentPeriodEnd);
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return dueDate >= now && dueDate <= futureDate;
};

// Enhanced Components
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  trend?: string;
}> = ({ title, value, icon, variant, trend }) => {
  const variants = {
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      border: 'border-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700',
      accent: 'text-red-600'
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      subtext: 'text-amber-700',
      accent: 'text-amber-600'
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      accent: 'text-blue-600'
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      subtext: 'text-emerald-700',
      accent: 'text-emerald-600'
    }
  };

  const v = variants[variant];

  return (
    <div className={`${v.bg} ${v.border} border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${v.accent} flex items-center justify-center text-xl bg-white/60 rounded-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs ${v.subtext} px-2 py-1 bg-white/50 rounded-full`}>
            {trend}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${v.text} mb-1`}>{value}</div>
      <div className={`text-sm font-medium ${v.subtext}`}>{title}</div>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
    <div className="flex items-center mb-3">
      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
        <span className="text-red-600">⚠️</span>
      </div>
      <span className="text-red-900 font-medium">Error Loading Data</span>
    </div>
    <p className="text-red-800 text-sm mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
      >
        Try Again
      </button>
    )}
  </div>
);

const PaymentApplicationCard: React.FC<{
  app: PaymentApplication;
  type: 'outstanding' | 'upcoming';
  onAction: (app: PaymentApplication, action: string) => void;
}> = ({ app, type, onAction }) => {
  const isOutstanding = type === 'outstanding';
  const overdue = isOverdue(app.payment_period_end);
  
  const cardVariant = isOutstanding 
    ? (overdue ? 'danger' : 'warning')
    : 'info';

  const variants = {
    danger: {
      border: 'border-red-200',
      bg: 'bg-gradient-to-br from-red-50 to-white',
      hover: 'hover:from-red-100 hover:to-red-50',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      badge: 'bg-red-100 text-red-700 border-red-200'
    },
    warning: {
      border: 'border-amber-200',
      bg: 'bg-gradient-to-br from-amber-50 to-white',
      hover: 'hover:from-amber-100 hover:to-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      badge: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    info: {
      border: 'border-blue-200',
      bg: 'bg-gradient-to-br from-blue-50 to-white',
      hover: 'hover:from-blue-100 hover:to-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'bg-blue-100 text-blue-700 border-blue-200'
    }
  };

  const v = variants[cardVariant];
  const buttonText = isOutstanding ? 'Send Reminder' : 'Prepare Payment';
  const actionType = isOutstanding ? 'remind' : 'prepare';

  return (
    <div className={`${v.bg} ${v.hover} ${v.border} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-lg mb-1">{app.project.name}</h4>
          <p className="text-gray-600 text-sm font-medium">{app.contractor.name}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900 mb-1">
            {formatCurrency(app.current_payment)}
          </div>
          {overdue && isOutstanding && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${v.badge} border`}>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
              OVERDUE
            </span>
          )}
        </div>
      </div>

      {/* Due Date */}
      <div className="mb-4">
        <div className="inline-flex items-center px-3 py-1 bg-white/70 rounded-lg border border-gray-200">
          <span className="text-gray-500 mr-2">📅</span>
          <span className="text-sm font-medium text-gray-700">
            Due: {formatDate(app.payment_period_end)}
          </span>
        </div>
      </div>

      {/* Contract Information */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Contract</div>
          <div className="font-semibold text-sm text-gray-900">
            {formatCurrency(app.contract_amount)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Paid</div>
          <div className="font-semibold text-sm text-gray-900">
            {formatCurrency(app.paid_to_date)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Remaining</div>
          <div className="font-semibold text-sm text-gray-900">
            {app.contract_amount && app.paid_to_date 
              ? formatCurrency(app.contract_amount - app.paid_to_date)
              : '-'
            }
          </div>
        </div>
      </div>

      {/* Line Items */}
      {app.line_items.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
            <span className="mr-2">📋</span>
            Line Items ({app.line_items.length})
          </div>
          <div className="bg-white/50 rounded-lg p-3 max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {app.line_items.slice(0, 3).map((li, idx) => (
                <div key={`${app.id}-${idx}`} className="flex items-center justify-between text-xs">
                  <span className="flex-1 text-gray-700 truncate mr-2">
                    <span className="font-medium">{li.item_no || idx + 1}.</span> {li.description_of_work}
                  </span>
                  <div className="flex items-center space-x-2 text-right">
                    <span className="text-green-700 font-medium">{formatCurrency(li.scheduled_value)}</span>
                    <span className="text-blue-600 font-medium">{li.percent_completed ?? 0}%</span>
                  </div>
                </div>
              ))}
              {app.line_items.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-1 border-t border-gray-200">
                  +{app.line_items.length - 3} more items
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        className={`w-full ${v.button} px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5`}
        onClick={() => onAction(app, actionType)}
      >
        {buttonText}
      </button>
    </div>
  );
};

const ProjectCard: React.FC<{
  project: Project;
  onSelect: (project: Project) => void;
}> = ({ project, onSelect }) => (
  <div 
    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 group"
    onClick={() => onSelect(project)}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
        <span className="text-blue-600 text-lg">🏗️</span>
      </div>
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
    </div>
    
    <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
      {project.name}
    </h4>
    <p className="text-sm text-gray-600 mb-4">{project.client_name}</p>
    
    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md">
      Create Payment Apps
    </button>
  </div>
);

const PaymentProcessingView: React.FC<PaymentProcessingViewProps> = ({ 
  setSelectedProject 
}) => {
  const { projects } = useData();
  const { apps, loading, error, refetch } = usePaymentApplications();
  const [search, setSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Memoized filtered applications
  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const searchLower = search.toLowerCase();
    return apps.filter(app =>
      app.contractor.name.toLowerCase().includes(searchLower) ||
      app.project.name.toLowerCase().includes(searchLower)
    );
  }, [apps, search]);

  // Memoized categorized applications
  const { outstanding, upcoming } = useMemo(() => {
    const reviewableStatuses = ['needs_review', 'submitted'];
    
    const outstanding = filteredApps.filter(app =>
      reviewableStatuses.includes(app.status) && isOverdue(app.payment_period_end)
    );

    const upcoming = filteredApps.filter(app =>
      reviewableStatuses.includes(app.status) && 
      !isOverdue(app.payment_period_end) && 
      isDueSoon(app.payment_period_end)
    );

    return { outstanding, upcoming };
  }, [filteredApps]);

  // Memoized statistics
  const stats: Stats = useMemo(() => ({
    totalOutstanding: outstanding.reduce((sum, app) => sum + (app.current_payment || 0), 0),
    totalDueSoon: upcoming.reduce((sum, app) => sum + (app.current_payment || 0), 0),
    overdueCount: outstanding.length,
    upcomingCount: upcoming.length,
  }), [outstanding, upcoming]);

  // Action handlers
  const handlePaymentAction = useCallback((app: PaymentApplication, action: string) => {
    switch (action) {
      case 'remind':
        // TODO: Implement actual reminder functionality
        alert(`Reminder sent for ${app.project.name} - ${app.contractor.name}`);
        break;
      case 'prepare':
        // TODO: Implement payment preparation and approval flow
        // When approved, invoice will be automatically generated
        alert(`Preparing payment for ${app.project.name} - ${app.contractor.name}\n\nNote: Invoice will be automatically generated upon payment approval.`);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const handleProjectSelection = useCallback((project: Project) => {
    setSelectedProject(project);
  }, [setSelectedProject]);

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-gray-900">
      {/* Enhanced Header 
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Processing</h2>
     <p className="text-gray-600">Manage payment applications and track outstanding invoices</p>
      </div> */}

      {/* Enhanced Summary Stats 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Outstanding Payments"
          value={formatCurrency(stats.totalOutstanding)}
          icon="💰"
          variant="danger"
          trend={`${stats.overdueCount} overdue`}
        />
        <StatCard
          title="Due This Week"
          value={formatCurrency(stats.totalDueSoon)}
          icon="📅"
          variant="warning"
          trend={`${stats.upcomingCount} upcoming`}
        />
        <StatCard
          title="Overdue Count"
          value={stats.overdueCount}
          icon="⚠️"
          variant="danger"
        />
        <StatCard
          title="Active Projects"
          value={projects.length}
          icon="🏗️"
          variant="info"
        />
      </div>
      */}

      {/* Enhanced Project Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Create Payment Applications</h3>
            <p className="text-gray-600">Select a project to create payment applications for contractors</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <input
              type="text"
              placeholder="Search projects..."
              value={projectSearch}
              onChange={e => setProjectSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white"
            />
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium ml-2">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {/* Filtered project list */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Projects Available</h4>
            <p className="text-gray-500">Create a project first to manage payment applications</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects
              .filter(project =>
                !projectSearch.trim() ||
                project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                (project.client_name && project.client_name.toLowerCase().includes(projectSearch.toLowerCase()))
              )
              .map((project: Project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={handleProjectSelection}
                />
              ))}
          </div>
        )}
      </div>

      {/* Enhanced Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Search contractor or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span className={loading ? 'animate-spin' : ''}>{loading ? '↻' : '🔄'}</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Outstanding Invoices Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600">⚠️</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Outstanding Invoices</h4>
              <p className="text-gray-600 text-sm">Payments that require immediate attention</p>
            </div>
          </div>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            {outstanding.length} {outstanding.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>
        
        {loading ? (
          <LoadingSpinner />
        ) : outstanding.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h4>
            <p className="text-gray-500">No outstanding invoices at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {outstanding.map(app => (
              <PaymentApplicationCard
                key={app.id}
                app={app}
                type="outstanding"
                onAction={handlePaymentAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Payment Deadlines Section 
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600">📅</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Upcoming Payment Deadlines</h4>
              <p className="text-gray-600 text-sm">Payments due in the next 7 days</p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
            {upcoming.length} {upcoming.length === 1 ? 'payment' : 'payments'}
          </span>
        </div>
        
        {loading ? (
          <LoadingSpinner />
        ) : upcoming.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🗓️</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h4>
            <p className="text-gray-500">Your payment schedule is looking good</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcoming.map(app => (
              <PaymentApplicationCard
                key={app.id}
                app={app}
                type="upcoming"
                onAction={handlePaymentAction}
              />
            ))}
          </div>
        )}
      </div>*/}
    </div>
  );
};

export default PaymentProcessingView;