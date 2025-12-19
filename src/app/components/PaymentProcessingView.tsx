import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useData, Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';

type PaymentProcessingViewProps = {
  setSelectedProject: (project: Project) => void;
  searchQuery?: string;
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
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      console.log('[PaymentProcessingView] Fetching from API...');
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
      console.log(`[PaymentProcessingView] Loaded in ${fetchTime}ms`);

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      const { applications: appsRaw } = result.data;

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

// Utility functions - formatCurrency from theme handles null values

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
      bg: 'bg-[var(--status-critical-bg)]',
      border: 'border-[var(--status-critical-border)]',
      text: 'text-[var(--status-critical-text)]',
      subtext: 'text-[var(--status-critical-text)]',
      accent: 'text-[var(--status-critical-icon)]'
    },
    warning: {
      bg: 'bg-[var(--status-warning-bg)]',
      border: 'border-[var(--status-warning-border)]',
      text: 'text-[var(--status-warning-text)]',
      subtext: 'text-[var(--status-warning-text)]',
      accent: 'text-[var(--status-warning-icon)]'
    },
    info: {
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      text: 'text-primary',
      subtext: 'text-primary',
      accent: 'text-primary'
    },
    success: {
      bg: 'bg-[var(--status-success-bg)]',
      border: 'border-[var(--status-success-border)]',
      text: 'text-[var(--status-success-text)]',
      subtext: 'text-[var(--status-success-text)]',
      accent: 'text-[var(--status-success-icon)]'
    }
  };

  const v = variants[variant];

  return (
    <div className={`${v.bg} ${v.border} border rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${v.accent} flex items-center justify-center text-xl bg-card/60 rounded`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs ${v.subtext} px-2 py-1 bg-card/50 rounded-full`}>
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
      <div className="w-12 h-12 border-4 border-border rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
    </div>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6 shadow-sm">
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
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
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
      border: 'border-border',
      bg: 'bg-gradient-to-br from-muted to-white',
      hover: 'hover:from-blue-100 hover:to-blue-50',
      button: 'bg-primary hover:bg-primary/90 text-white',
      badge: 'bg-primary/10 text-primary border-border'
    }
  };

  const v = variants[cardVariant];
  const buttonText = isOutstanding ? 'Send Reminder' : 'Prepare Payment';
  const actionType = isOutstanding ? 'remind' : 'prepare';

  return (
    <div className={`${v.bg} ${v.hover} ${v.border} border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5`}>
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
        <div className="inline-flex items-center px-3 py-1 bg-white/70 rounded border border-gray-200">
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
            {app.contract_amount != null && app.paid_to_date != null 
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
          <div className="bg-white/50 rounded p-3 max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {app.line_items.slice(0, 3).map((li, idx) => (
                <div key={`${app.id}-${idx}`} className="flex items-center justify-between text-xs">
                  <span className="flex-1 text-gray-700 truncate mr-2">
                    <span className="font-medium">{li.item_no || idx + 1}.</span> {li.description_of_work}
                  </span>
                  <div className="flex items-center space-x-2 text-right">
                    <span className="text-green-700 font-medium">{formatCurrency(li.scheduled_value)}</span>
                    <span className="text-primary font-medium">{li.percent_completed ?? 0}%</span>
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
        className={`w-full ${v.button} px-4 py-3 rounded font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5`}
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
    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-1 group"
    onClick={() => onSelect(project)}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <span className="text-primary text-lg">🏗️</span>
      </div>
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
    </div>
    
    <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
      {project.name}
    </h4>
    <p className="text-sm text-gray-600 mb-4">{project.client_name}</p>
    
    <button className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded font-medium transition-all duration-200 shadow-sm hover:shadow-md">
      Create Payment Apps
    </button>
  </div>
);

const PaymentProcessingView: React.FC<PaymentProcessingViewProps> = ({ 
  setSelectedProject,
  searchQuery = ''
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects } = useData();
  const { apps, loading, error, refetch } = usePaymentApplications();
  const [search, setSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Sync global search query with local search term
  useEffect(() => {
    if (searchQuery !== search) {
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  // Fetch data on component mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Memoized filtered applications
  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const searchLower = search.toLowerCase();
    return apps.filter(app =>
      (app.contractor?.name || '').toLowerCase().includes(searchLower) ||
      (app.project?.name || '').toLowerCase().includes(searchLower)
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

  // Modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showPreparePaymentModal, setShowPreparePaymentModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<PaymentApplication | null>(null);
  const [reminderType, setReminderType] = useState<'email' | 'sms'>('sms');
  const [reminderMessage, setReminderMessage] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [preparingPayment, setPreparingPayment] = useState(false);

  // Action handlers
  const handlePaymentAction = useCallback((app: PaymentApplication, action: string) => {
    switch (action) {
      case 'remind':
        setSelectedApp(app);
        setReminderMessage(`Hi ${app.contractor?.name || 'Contractor'}, this is a reminder about payment application #${app.id} for ${app.project?.name || 'your project'}. Please review at your earliest convenience.`);
        setShowReminderModal(true);
        break;
      case 'prepare':
        setSelectedApp(app);
        setPaymentNotes('');
        setShowPreparePaymentModal(true);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }, []);

  const handleSendReminder = async () => {
    if (!selectedApp) return;
    
    setSendingReminder(true);
    try {
      if (reminderType === 'sms') {
        // Fetch contractor's phone number from database
        const { data: contractorData, error: contractorError } = await supabase
          .from('contractors')
          .select('phone')
          .eq('id', selectedApp.contractor.id)
          .single();
        
        if (contractorError || !contractorData?.phone) {
          alert('Contractor phone number not found. Please update contractor information first.');
          setSendingReminder(false);
          return;
        }
        
        // Send SMS reminder using existing SMS infrastructure
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: contractorData.phone, // Use actual phone number
            message: reminderMessage,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send SMS reminder');
        }
      } else {
        // Send email reminder (placeholder - would need email service)
        alert('Email reminder functionality requires email service configuration.\n\nFor now, please use SMS reminders.');
        setSendingReminder(false);
        return;
      }
      
      alert(`Reminder sent successfully to ${selectedApp.contractor.name}!`);
      setShowReminderModal(false);
      setReminderMessage('');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handlePreparePayment = async () => {
    if (!selectedApp) return;
    
    setPreparingPayment(true);
    try {
      // Update payment application status to indicate it's being prepared
      const { error } = await supabase
        .from('payment_applications')
        .update({ 
          status: 'approved',
          pm_notes: paymentNotes || 'Payment prepared for processing',
        })
        .eq('id', selectedApp.id);
      
      if (error) throw error;
      
      alert(`Payment prepared successfully!\n\nPayment Application: #${selectedApp.id}\nContractor: ${selectedApp.contractor.name}\nAmount: ${formatCurrency(selectedApp.current_payment)}\n\nStatus updated to "Approved" - ready for check generation.`);
      
      // Refresh applications
      refetch();
      setShowPreparePaymentModal(false);
      setPaymentNotes('');
    } catch (error) {
      console.error('Error preparing payment:', error);
      alert('Failed to prepare payment. Please try again.');
    } finally {
      setPreparingPayment(false);
    }
  };

  const handleProjectSelection = useCallback((project: Project) => {
    setSelectedProject(project);
    // Update URL to include the selected project
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'payment');
    params.set('project', project.id.toString());
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [setSelectedProject, searchParams, router]);

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-gray-900">
      {/* Back to Projects Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            params.set('tab', 'projects');
            router.replace(`/?${params.toString()}`, { scroll: false });
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
      </div>

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
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white"
            />
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium ml-2">
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
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white"
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
          className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-3 rounded font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span className={loading ? 'animate-spin' : ''}>{loading ? '↻' : '🔄'}</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Outstanding Invoices Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
              <span className="text-red-600">⚠️</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">Outstanding Pay Apps</h4>
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
            <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center">
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

      {/* Send Reminder Modal */}
      {showReminderModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Reminder</h3>
            
            <div className="space-y-4">
              <div className="bg-primary/10 border border-blue-200 rounded p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Project:</span>
                    <p className="text-gray-900">{selectedApp.project.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Contractor:</span>
                    <p className="text-gray-900">{selectedApp.contractor.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment App:</span>
                    <p className="text-gray-900">#{selectedApp.id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Amount:</span>
                    <p className="text-gray-900">{formatCurrency(selectedApp.current_payment)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sms"
                      checked={reminderType === 'sms'}
                      onChange={(e) => setReminderType(e.target.value as 'sms')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">📱 SMS</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="email"
                      checked={reminderType === 'email'}
                      onChange={(e) => setReminderType(e.target.value as 'email')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">✉️ Email</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-primary resize-none"
                  rows={4}
                  placeholder="Enter your reminder message"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reminderMessage.length} characters
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setReminderMessage('');
                }}
                disabled={sendingReminder}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder || !reminderMessage.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepare Payment Modal */}
      {showPreparePaymentModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prepare Payment</h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h4 className="font-semibold text-green-900 mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Project:</span>
                    <span className="font-medium text-gray-900">{selectedApp.project.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Contractor:</span>
                    <span className="font-medium text-gray-900">{selectedApp.contractor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Payment App:</span>
                    <span className="font-medium text-gray-900">#{selectedApp.id}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300">
                    <span className="font-semibold text-gray-900">Payment Amount:</span>
                    <span className="font-bold text-green-700 text-lg">{formatCurrency(selectedApp.current_payment)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes (Optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-primary resize-none"
                  rows={3}
                  placeholder="Add any notes about this payment..."
                />
              </div>

              <div className="bg-primary/10 border border-blue-200 rounded p-3">
                <p className="text-sm text-primary">
                  <strong>Note:</strong> Preparing this payment will update the status to "Approved" and mark it as ready for check generation.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPreparePaymentModal(false);
                  setPaymentNotes('');
                }}
                disabled={preparingPayment}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePreparePayment}
                disabled={preparingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preparingPayment ? 'Preparing...' : 'Prepare Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProcessingView;