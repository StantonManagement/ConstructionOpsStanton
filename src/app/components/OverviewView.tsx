import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/providers/AuthProvider';
import ProjectCard from '../../components/ProjectCard';
import { supabase } from '@/lib/supabaseClient';
import { Project } from '@/context/DataContext';
import { MetricCard } from '@/components/ui/MetricCard';
import { getBudgetStatus, formatCurrency } from '@/lib/theme';

// Types for better type safety
interface PaymentApplication {
  id: string;
  status: 'needs_review' | 'submitted';
  current_payment: number;
  current_period_value: number;
  created_at: string;
  project: { id: string, name: string } | null;
  contractor: { id: string, name: string } | null;
  grand_total?: number;
}

interface StatusConfig {
  color: string;
  label: string;
  icon: string;
}

interface OverviewViewProps {
  onProjectSelect?: (project: Project) => void;
  onSwitchToPayments?: () => void;
  searchQuery?: string;
}

// Modern loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-xl p-6 animate-pulse border border-border">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-muted rounded-xl"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-muted rounded-lg w-3/4"></div>
            <div className="h-3 bg-muted rounded-lg w-1/2"></div>
            <div className="h-3 bg-muted rounded-lg w-1/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface ActionItem {
  id: string;
  type: 'payment_application' | 'change_order';
  referenceNumber: string;
  contractorName: string;
  projectName: string;
  projectId: number;
  amount: number;
  status: string;
  description: string;
  submittedAt: string;
  daysOld: number;
}

interface QueueData {
  urgent: ActionItem[];
  needsReview: ActionItem[];
  readyToPay: ActionItem[];
  totals: {
    urgent: number;
    needsReview: number;
    readyToPay: number;
    total: number;
  };
}

const DecisionQueueCards: React.FC<{ role: string | null, setError: (msg: string) => void }> = ({ role, setError }) => {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('urgent');

  const navigateToPaymentApp = (paymentAppId: string) => {
    window.location.href = `/payments/${paymentAppId}/verify?returnTo=/`;
  };

  const navigateToChangeOrder = (coId: string) => {
    window.location.href = `/change-orders?id=${coId}`;
  };

  const navigateToPaymentApplications = () => {
    window.location.href = "/payments";
  };

  const fetchQueue = useCallback(async () => {
    try {
      setLocalError(null);
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/queue', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }

      const result = await response.json();
      setQueueData(result.data);
    } catch (err: any) {
      console.error('Error fetching queue:', err);
      setLocalError(err.message || 'Failed to load decision queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleQuickApprove = async (item: ActionItem) => {
    if (!confirm(`Approve ${item.referenceNumber} for ${formatCurrency(item.amount)}?`)) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const endpoint = item.type === 'payment_application' 
        ? `/api/payment-applications/${item.id}`
        : `/api/change-orders/${item.id}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.ok) {
        fetchQueue();
      }
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  // Section config
  const sections = [
    { key: 'urgent', label: 'Urgent', icon: '🔴', color: 'border-red-200 bg-red-50', items: queueData?.urgent || [] },
    { key: 'needsReview', label: 'Needs Review', icon: '🟡', color: 'border-amber-200 bg-amber-50', items: queueData?.needsReview || [] },
    { key: 'readyToPay', label: 'Ready to Pay', icon: '✅', color: 'border-green-200 bg-green-50', items: queueData?.readyToPay || [] },
  ];

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-3">
          Decisions Queue
        </h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-status-critical text-center py-6 flex flex-col items-center gap-4">
            <span className="text-3xl">⚠️</span>
            <div className="font-medium">{error}</div>
            <div className="flex gap-3">
              <button
                onClick={fetchQueue}
                disabled={loading}
                className="px-4 py-2 bg-status-critical text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </button>
              <button
                onClick={() => setLocalError(null)}
                className="px-4 py-2 bg-gray-200 text-muted-foreground rounded-lg hover:bg-muted font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = (queueData?.totals?.total || 0);

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          📋 Action Queue
        </h3>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>
      
      {loading ? (
        <LoadingSkeleton />
      ) : totalItems === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl border border-emerald-100">
            ✅
          </div>
          <span className="text-foreground font-medium">All caught up!</span>
          <span className="text-sm text-muted-foreground">No items need your attention.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            if (section.items.length === 0) return null;
            const isExpanded = expandedSection === section.key;
            
            return (
              <div key={section.key} className={`rounded-lg border ${section.color}`}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span className="font-semibold text-sm">{section.label}</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full text-xs font-medium">
                      {section.items.length}
                    </span>
                  </div>
                  <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-inherit bg-white/50 p-2 space-y-2">
                    {section.items.slice(0, 5).map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="bg-white rounded-lg p-3 border border-gray-100 hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => item.type === 'payment_application' 
                          ? navigateToPaymentApp(item.id) 
                          : navigateToChangeOrder(item.id)
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                item.type === 'payment_application' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {item.referenceNumber}
                              </span>
                              {item.daysOld > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.daysOld}d ago
                                </span>
                              )}
                            </div>
                            <div className="font-medium text-sm text-foreground truncate">
                              {item.contractorName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.projectName}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-sm">
                              {formatCurrency(item.amount)}
                            </div>
                            {section.key !== 'readyToPay' && role === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickApprove(item);
                                }}
                                className="text-xs text-primary hover:underline mt-1"
                              >
                                Quick Approve
                              </button>
                            )}
                            {section.key === 'readyToPay' && (
                              <span className="text-xs text-green-600">Ready</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {section.items.length > 5 && (
                      <button
                        onClick={navigateToPaymentApplications}
                        className="w-full text-center text-sm text-primary hover:underline py-2"
                      >
                        View all {section.items.length} items →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const OverviewView: React.FC<OverviewViewProps> = ({ onProjectSelect, onSwitchToPayments, searchQuery = '' }) => {
  const { projects } = useData();
  const { role } = useAuth();
  const [lastActiveProject, setLastActiveProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Navigation helper for switching tabs
  const navigateToTab = useCallback((tab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Navigation handler for project budget clicks
  const handleProjectBudgetClick = useCallback((project: Project) => {
    const params = new URLSearchParams();
    params.set('tab', 'budget');
    params.set('project', project.id.toString());
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const searchLower = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      project.client_name?.toLowerCase().includes(searchLower) ||
      project.current_phase?.toLowerCase().includes(searchLower)
    );
  }, [projects, searchQuery]);

  // Load last active project from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projects.length > 0) {
      const lastProjectId = localStorage.getItem('lastActiveProjectId');
      if (lastProjectId) {
        const project = projects.find(p => p.id.toString() === lastProjectId);
        if (project) {
          setLastActiveProject(project);
        }
      }
    }
  }, [projects]);

  // Enhanced project stats with contractor data
  const [enhancedProjects, setEnhancedProjects] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch enhanced project data with contractor stats and approved payments
  const fetchEnhancedProjectData = useCallback(async () => {
    if (projects.length === 0) {
      setStatsLoading(false);
      setEnhancedProjects([]);
      return;
    }
    
    setStatsLoading(true);
    try {
      // Fetch approved payments for spent calculation
      // Using current_period_value as the standard field for consistency across all views
      const { data: approvedPayments } = await supabase
        .from('payment_applications')
        .select('current_period_value, project_id')
        .eq('status', 'approved');

      const approvedPaymentsByProject = (approvedPayments || []).reduce((acc: any, payment) => {
        if (!acc[payment.project_id]) {
          acc[payment.project_id] = 0;
        }
        acc[payment.project_id] += Number(payment.current_period_value) || 0;
        return acc;
      }, {});

      const enhancedData = await Promise.all(projects.map(async (project) => {
        const { data: contractorsData } = await supabase
          .from('project_contractors')
          .select('contract_amount, paid_to_date')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        const calculatedBudget = contractorsData?.reduce((sum, contract) => 
          sum + (Number(contract.contract_amount) || 0), 0) || 0;
        
        // Use approved payments for spent calculation instead of paid_to_date
        const calculatedSpent = approvedPaymentsByProject[project.id] || 0;

        return {
          ...project,
          calculatedBudget,
          calculatedSpent
        };
      }));

      setEnhancedProjects(enhancedData);
    } catch (error) {
      console.error('Error fetching enhanced project data:', error);
      setEnhancedProjects(projects.map(p => ({ ...p, calculatedBudget: 0, calculatedSpent: 0 })));
    } finally {
      setStatsLoading(false);
    }
  }, [projects.length]);

  useEffect(() => {
    fetchEnhancedProjectData();
  }, [fetchEnhancedProjectData]);

  // Filter enhanced projects based on search query
  const filteredEnhancedProjects = useMemo(() => {
    if (!searchQuery.trim()) return enhancedProjects;
    const searchLower = searchQuery.toLowerCase();
    return enhancedProjects.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      project.client_name?.toLowerCase().includes(searchLower) ||
      project.current_phase?.toLowerCase().includes(searchLower)
    );
  }, [enhancedProjects, searchQuery]);

  // Memoize calculations using enhanced project data
  const stats = useMemo(() => {
    const totalProjects = filteredEnhancedProjects.length;
    const activeProjects = filteredEnhancedProjects.filter(p =>
      !p.current_phase?.toLowerCase().includes('complete') &&
      !p.current_phase?.toLowerCase().includes('closed')
    ).length;

    const totalBudget = filteredEnhancedProjects.reduce((sum, p) => {
      const budget = Number(p.calculatedBudget) || 0;
      return sum + budget;
    }, 0);

    const totalSpent = filteredEnhancedProjects.reduce((sum, p) => {
      const spent = Number(p.calculatedSpent) || 0;
      return sum + spent;
    }, 0);

    const remainingBudget = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 10) / 10 : 0;
    const avgProjectBudget = totalProjects > 0 ? Math.round(totalBudget / totalProjects) : 0;

    return {
      totalProjects,
      activeProjects,
      totalBudget,
      totalSpent,
      remainingBudget,
      utilizationRate,
      avgProjectBudget
    };
  }, [filteredEnhancedProjects]);

  return (
    <div className="min-h-screen bg-background max-w-full">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Dashboard Stats - New Design System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Total Projects"
            value={stats.totalProjects}
            subtitle={`${stats.activeProjects} active`}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('tab', 'projects');
              window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          />

          <MetricCard
            title="Total Budget"
            value={formatCurrency(stats.totalBudget)}
            subtitle={`Avg: ${formatCurrency(stats.avgProjectBudget)}`}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigateToTab('budget')}
          />

          <MetricCard
            title="Total Spent"
            value={formatCurrency(stats.totalSpent)}
            status={getBudgetStatus(stats.totalSpent, stats.totalBudget)}
            statusLabel={getBudgetStatus(stats.totalSpent, stats.totalBudget) !== 'neutral' ? 'High Usage' : undefined}
            subtitle={`${stats.utilizationRate}% utilized`}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigateToTab('budget')}
          />

          <MetricCard
            title="Remaining Budget"
            value={formatCurrency(stats.remainingBudget)}
            status={stats.remainingBudget < 0 ? 'critical' : 'neutral'}
            statusLabel={stats.remainingBudget < 0 ? 'Over Budget' : 'Available'}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigateToTab('budget')}
          />
        </div>

        {/* Quick Jump to Last Active Project */}
        {lastActiveProject && onProjectSelect && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xl">
                ⚡
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Quick Jump</h3>
                <p className="text-sm text-muted-foreground">Return to your last active project</p>
              </div>
            </div>
            <button
              onClick={() => onProjectSelect(lastActiveProject)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-4 font-medium transition-all shadow-sm hover:shadow flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center text-lg">
                  🏗️
                </div>
                <div className="text-left">
                  <div className="font-semibold">{lastActiveProject.name}</div>
                  <div className="text-xs text-primary-foreground/80">{lastActiveProject.client_name}</div>
                </div>
              </div>
              <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Enhanced Projects List */}
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 sm:gap-0">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigateToTab('projects')}
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-blue-100">
                  🏗️
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    Active Projects
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {enhancedProjects.length} total projects
                  </p>
                </div>
              </div>
              
              {projects.length > 5 && (
                <button 
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors" 
                  onClick={() => {
                    if (role === "admin") {
                      window.location.href = "/pm-dashboard";
                    } else {
                      setError("You are not authenticated for the page");
                    }
                  }}
                >
                  View All →
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-status-critical text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {statsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-muted-foreground font-medium">Loading project data...</span>
                </div>
              ) : filteredEnhancedProjects.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-2xl text-muted-foreground">
                    📋
                  </div>
                  <span className="text-muted-foreground font-medium">
                    {searchQuery ? 'No projects match your search' : 'No projects'}
                  </span>
                </div>
              ) : (
                filteredEnhancedProjects.map((project) => (
                  <div key={project.id} className="border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <ProjectCard
                      project={{
                        ...project,
                        budget: project.calculatedBudget,
                        spent: project.calculatedSpent
                      }}
                      onSelect={onProjectSelect}
                      onBudgetClick={handleProjectBudgetClick}
                      isLoading={statsLoading}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decisions Queue Cards */}
          <DecisionQueueCards role={role} setError={setError} />
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
