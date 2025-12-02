import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '@/providers/AuthProvider';
import ProjectCard from '../../components/ProjectCard';
import { supabase } from '@/lib/supabaseClient';
import { Project } from '../context/DataContext';
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

const DecisionQueueCards: React.FC<{ role: string | null, setError: (msg: string) => void }> = ({ role, setError }) => {
  const [queue, setQueue] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null);

  const navigateToPaymentApp = (paymentAppId: string) => {
    // Navigate to verify page with return parameter to go back to construction dashboard
    window.location.href = `/payments/${paymentAppId}/verify?returnTo=/`;
  };

  const navigateToPaymentApplications = () => {
    // Navigate to payment applications view instead of pm-dashboard
    window.location.href = "/?tab=payment-applications";
  };

  const fetchQueue = useCallback(async () => {
    try {
      setLocalError(null);
      setLoading(true);

      const { data, error } = await supabase
        .from('payment_applications')
        .select(`
          id,
          status,
          current_payment,
          current_period_value,
          created_at,
          project_id,
          contractor_id,
          project:projects!inner(id, name),
          contractor:contractors!inner(id, name)
        `)
        .in('status', ['needs_review', 'submitted'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const processedQueue = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        current_payment: Number(item.current_payment) || 0,
        current_period_value: Number(item.current_period_value) || 0,
        created_at: item.created_at,
        project: item.project || { id: null, name: 'Unknown Project' },
        contractor: item.contractor || { id: null, name: 'Unknown Contractor' },
      }));

      setQueue(processedQueue);
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

  // Group queue by project and determine highest priority
  const projectQueueSummary = useMemo(() => {
    const map: Record<string, { projectName: string, count: number, total: number, highestPriority: string }> = {};
    const priorityOrder = ['urgent', 'high', 'medium', 'low'];
    queue.forEach(app => {
      const projectName = app.project?.name || 'Unknown Project';
      const priority = (app as any).priority || 'medium';
      if (!map[projectName]) {
        map[projectName] = { projectName, count: 0, total: 0, highestPriority: priority };
      }
      map[projectName].count += 1;
      map[projectName].total += app.current_period_value || 0;
      if (priorityOrder.indexOf(priority) < priorityOrder.indexOf(map[projectName].highestPriority)) {
        map[projectName].highestPriority = priority;
      }
    });
    return Object.values(map);
  }, [queue]);

  // Priority badge config - NOW USING SEMANTIC COLORS
  const priorityBadge = {
    urgent: { color: 'bg-red-50 text-status-critical border-red-200', label: 'Urgent', icon: '🚨' },
    high: { color: 'bg-amber-50 text-status-warning border-amber-200', label: 'High', icon: '⚡' },
    medium: { color: 'bg-amber-50 text-status-warning border-amber-200', label: 'Medium', icon: '⚠️' },
    low: { color: 'bg-gray-50 text-status-neutral border-gray-200', label: 'Low', icon: '📌' },
  };

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

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 h-full">
      <h3 className="text-lg font-semibold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
        📋 Decisions Queue
      </h3>
      
      {loading ? (
        <LoadingSkeleton />
      ) : projectQueueSummary.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl border border-emerald-100">
            ✅
          </div>
          <span className="text-foreground font-medium">No items need your attention.</span>
          <span className="text-sm text-muted-foreground">All caught up! Great work.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {projectQueueSummary.map((proj) => {
            const badge = priorityBadge[proj.highestPriority as keyof typeof priorityBadge] || priorityBadge.medium;
            return (
              <div
                key={proj.projectName}
                className="group bg-card hover:bg-accent/50 rounded-xl p-5 border border-border transition-all duration-200 cursor-pointer"
                onClick={navigateToPaymentApplications}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToPaymentApplications();
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 font-semibold text-base text-foreground mb-2">
                      <span>{proj.projectName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}
                        title={badge.label + ' Priority'}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {proj.count} payment{proj.count > 1 ? 's' : ''} need review
                    </div>
                    <div className="text-sm text-status-neutral font-medium">
                      Total: {formatCurrency(proj.total)}
                    </div>
                  </div>
                  <button
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                    disabled={role === null}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToPaymentApplications();
                    }}
                  >
                    {role === null ? "Loading..." : "View All →"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Individual Payment Applications */}
          {queue.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Individual Applications
              </h4>
              <div className="space-y-3">
                {queue.slice(0, 3).map((app) => {
                  const statusConfig = {
                    submitted: { color: 'bg-red-50 text-status-critical border-red-200', label: 'Submitted', icon: '🚨' },
                    needs_review: { color: 'bg-amber-50 text-status-warning border-amber-200', label: 'Needs Review', icon: '⚠️' }
                  };
                  const status = statusConfig[app.status] || statusConfig.needs_review;

                  return (
                    <div
                      key={app.id}
                      className="group bg-card hover:bg-accent/50 rounded-lg p-4 border border-border transition-all duration-200 cursor-pointer"
                      onClick={() => navigateToPaymentApp(app.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigateToPaymentApp(app.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                            </span>
                          </div>
                          <div className="font-medium text-foreground">
                            {app.project?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Contractor: {app.contractor?.name || 'Unknown'}
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(app.current_period_value || 0)}
                          </div>
                        </div>
                        <div className="text-primary text-sm font-medium">
                          Review →
                        </div>
                      </div>
                    </div>
                  );
                })}
                {queue.length > 3 && (
                  <div className="text-center py-3">
                    <span className="text-sm text-muted-foreground">
                      +{queue.length - 3} more applications
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="space-y-6 sm:space-y-10">
        {/* Enhanced Dashboard Stats - New Design System */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
