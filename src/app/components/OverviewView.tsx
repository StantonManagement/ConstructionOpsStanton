
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import ProjectCard from '../../components/ProjectCard';
import { supabase } from '@/lib/supabaseClient';
import { Project } from '../context/DataContext';

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
      <div key={i} className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-2xl p-6 animate-pulse">
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

// Modern queue card component
const QueueCard: React.FC<{
  app: PaymentApplication;
  status: StatusConfig;
  onReview: (id: string) => void
}> = ({ app, status, onReview }) => (
  <div
    className="group relative bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
    tabIndex={0}
    aria-label={`Review application for ${app.project?.name}`}
    onClick={() => onReview(app.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onReview(app.id);
      }
    }}
  >
    {/* Status badge */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
      <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold ${status.color} backdrop-blur-sm`}>
        <span className="mr-1">{status.icon}</span>
        {status.label}
      </span>
      <span className="text-xs sm:text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
        {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
      </span>
    </div>

    {/* Project info */}
    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3 font-bold text-base sm:text-lg text-foreground">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
          🏗️
        </div>
        <span className="group-hover:text-primary transition-colors truncate">
          {app.project?.name || 'Unknown Project'}
        </span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xs sm:text-sm">
          👷
        </div>
        <span className="text-sm sm:text-base">Contractor: <span className="font-medium truncate">{app.contractor?.name || 'Unknown'}</span></span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center text-white text-xs sm:text-sm">
          💲
        </div>
        <span className="text-sm sm:text-base">Current Period Value: 
          <span className="ml-2 font-bold text-base sm:text-lg text-green-700 bg-green-50 px-2 sm:px-3 py-1 rounded-lg">
            ${(app.current_period_value || 0).toLocaleString()}
          </span>
        </span>
      </div>
    </div>

    {/* Action button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onReview(app.id);
      }}
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300 text-sm sm:text-base"
      aria-label={`Go to review for ${app.project?.name}`}
    >
      <span className="flex items-center justify-center gap-2">
        <span>Review Application</span>
        <span className="text-blue-200">→</span>
      </span>
    </button>
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

  // Priority badge config
  const priorityBadge = {
    urgent: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Urgent', icon: '🚨' },
    high: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'High', icon: '⚡' },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Medium', icon: '⚠️' },
    low: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Low', icon: '📌' },
  };

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            📋
          </div>
          Decisions Queue
        </h3>
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="text-red-700 text-center py-6 flex flex-col items-center gap-4">
            <span className="text-3xl">⚠️</span>
            <div className="font-medium">{error}</div>
            <div className="flex gap-3">
              <button
                onClick={fetchQueue}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </button>
              <button
                onClick={() => setLocalError(null)}
                className="px-6 py-3 bg-gray-200 text-muted-foreground rounded-xl hover:bg-muted font-medium transition-colors"
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
    <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-300 shadow-xl p-4 sm:p-6 hover:shadow-2xl hover:border-purple-400 transition-all duration-300">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
          📋
        </div>
        Decisions Queue
      </h3>
      
      {loading ? (
        <LoadingSkeleton />
      ) : projectQueueSummary.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl">
            ✅
          </div>
          <span className="text-gray-600 font-medium">No items need your attention.</span>
          <span className="text-sm text-gray-500">All caught up! Great work.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {projectQueueSummary.map((proj) => {
            const badge = priorityBadge[proj.highestPriority as keyof typeof priorityBadge] || priorityBadge.medium;
            return (
              <div
                key={proj.projectName}
                className={`group bg-gradient-to-r ${
                  proj.highestPriority === 'urgent' ? 'from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-400' :
                  proj.highestPriority === 'high' ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-orange-400' :
                  proj.highestPriority === 'medium' ? 'from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-400' :
                  'from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-gray-400'
                } rounded-2xl p-5 border-2 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-[1.02]`}
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
                    <div className="flex items-center gap-3 font-bold text-lg text-foreground mb-2">
                      <span>{proj.projectName}</span>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border ${badge.color}`}
                        title={badge.label + ' Priority'}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1 font-medium">
                      {proj.count} payment{proj.count > 1 ? 's' : ''} need review
                    </div>
                    <div className="text-sm text-green-700 font-semibold bg-green-50 inline-block px-2 py-1 rounded-lg">
                      Total: ${proj.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600 mt-2 font-medium group-hover:text-blue-700">
                      Click to view details →
                    </div>
                  </div>
                  <button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    disabled={role === null}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToPaymentApplications();
                    }}
                  >
                    {role === null ? "Loading..." : "View All"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Individual Payment Applications */}
          {queue.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs">
                  📄
                </div>
                Individual Applications
              </h4>
              <div className="space-y-3">
                {queue.slice(0, 3).map((app) => {
                  const statusConfig = {
                    submitted: { color: 'bg-red-100 text-red-800', label: 'Submitted', icon: '🚨' },
                    needs_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Needs Review', icon: '⚠️' }
                  };
                  const status = statusConfig[app.status] || statusConfig.needs_review;

                  return (
                    <div
                      key={app.id}
                      className="group bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl p-4 border-2 border-gray-300 hover:border-blue-400 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
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
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                            </span>
                          </div>
                          <div className="font-semibold text-foreground group-hover:text-blue-700">
                            {app.project?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Contractor: {app.contractor?.name || 'Unknown'}
                          </div>
                          <div className="text-sm font-bold text-green-700 bg-green-50 inline-block px-2 py-1 rounded-lg">
                            ${(app.current_period_value || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-blue-600 text-sm font-medium group-hover:text-blue-700">
                          Review →
                        </div>
                      </div>
                    </div>
                  );
                })}
                {queue.length > 3 && (
                  <div className="text-center py-3">
                    <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
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
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setRole("unknown");
          return;
        }

        if (session?.user) {
          const { data, error } = await supabase
            .from("user_role")
            .select("role")
            .eq("user_id", session.user.id)
            .single();

          // Handle role: default to 'staff' if no role found (expected) or error
          // Only log actual errors (not "no rows found" which is PGRST116)
          if (error) {
            // PGRST116 is "no rows found" - expected when user has no role entry yet
            if (error.code !== 'PGRST116') {
              console.error("Role fetch error:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
            }
            // Default to 'staff' when no role found or on error
            setRole('staff');
          } else {
            setRole(data?.role || 'staff');
          }
        } else {
          setRole("unauthenticated");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setRole("unknown");
      }
    };

    getRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getRole();
      } else if (event === 'SIGNED_OUT') {
        setRole("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Enhanced project stats with contractor data
  const [enhancedProjects, setEnhancedProjects] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Budget details modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetModalData, setBudgetModalData] = useState<any>({});
  const [budgetModalType, setBudgetModalType] = useState<'budget' | 'spent' | 'progress'>('budget');
  const [loadingBudgetModal, setLoadingBudgetModal] = useState(false);
  const [statsModalTitle, setStatsModalTitle] = useState('');

  // Fetch enhanced project data with contractor stats and approved payments
  const fetchEnhancedProjectData = useCallback(async () => {
    if (projects.length === 0) return;
    
    setStatsLoading(true);
    try {
      // Fetch approved payments for spent calculation
      const { data: approvedPayments } = await supabase
        .from('payment_applications')
        .select('current_payment, project_id')
        .eq('status', 'approved');

      const approvedPaymentsByProject = (approvedPayments || []).reduce((acc: any, payment) => {
        if (!acc[payment.project_id]) {
          acc[payment.project_id] = 0;
        }
        acc[payment.project_id] += Number(payment.current_payment) || 0;
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
  }, [projects.length]); // Changed from [projects] to [projects.length] to prevent infinite loops

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

  const handleBudgetCardClick = async (type: 'budget' | 'spent' | 'progress') => {
    setBudgetModalType(type);
    setLoadingBudgetModal(true);
    setShowBudgetModal(true);

    try {
      let modalData: any = {};
      let modalTitle = '';

      switch (type) {
        case 'budget':
          modalTitle = 'Total Budget Breakdown';
          // Fetch all active contracts with contractor details
          const { data: contractsData } = await supabase
            .from('project_contractors')
            .select(`
              contract_amount,
              contractor:contractors(name, trade),
              project:projects(name, client_name)
            `)
            .eq('contract_status', 'active')
            .order('contract_amount', { ascending: false });

          modalData = {
            total: stats.totalBudget,
            items: contractsData?.map((contract: any) => ({
              name: contract.contractor?.name || 'Unknown Contractor',
              trade: contract.contractor?.trade || 'Unknown Trade',
              project: contract.project?.name || 'Unknown Project',
              amount: contract.contract_amount,
              percentage: stats.totalBudget > 0 ? ((contract.contract_amount / stats.totalBudget) * 100).toFixed(1) : '0'
            })) || []
          };
          break;

        case 'spent':
          modalTitle = 'Total Spent Breakdown';
          // Fetch all approved payment applications with details
          const { data: approvedPaymentsData } = await supabase
            .from('payment_applications')
            .select(`
              current_period_value,
              created_at,
              contractor:contractors(name, trade),
              project:projects(name, client_name)
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          modalData = {
            total: stats.totalSpent,
            items: approvedPaymentsData?.map((payment: any) => ({
              name: payment.contractor?.name || 'Unknown Contractor',
              trade: payment.contractor?.trade || 'Unknown Trade',
              project: payment.project?.name || 'Unknown Project',
              amount: payment.current_period_value,
              date: new Date(payment.created_at).toLocaleDateString(),
              percentage: stats.totalSpent > 0 ? ((payment.current_period_value / stats.totalSpent) * 100).toFixed(1) : '0'
            })) || []
          };
          break;

        case 'progress':
          modalTitle = 'Budget Utilization Details';
          // Fetch project-level budget utilization
          const { data: projectStatsData } = await supabase
            .from('projects')
            .select(`
              name,
              client_name,
              budget,
              spent
            `)
            .eq('status', 'active')
            .order('spent', { ascending: false });

          modalData = {
            totalBudget: stats.totalBudget,
            totalSpent: stats.totalSpent,
            remainingBudget: stats.totalBudget - stats.totalSpent,
            utilizationRate: stats.utilizationRate,
            items: projectStatsData?.map((project: any) => {
              const projectBudget = Number(project.budget) || 0;
              const projectSpent = Number(project.spent) || 0;
              const projectUtilization = projectBudget > 0 ? ((projectSpent / projectBudget) * 100) : 0;
              return {
                name: project.name,
                client: project.client_name,
                budget: projectBudget,
                spent: projectSpent,
                remaining: projectBudget - projectSpent,
                utilization: projectUtilization,
                status: projectUtilization > 90 ? 'Over Budget' : 
                       projectUtilization > 75 ? 'Near Limit' : 
                       projectUtilization > 50 ? 'High Usage' : 'On Track'
              };
            }) || []
          };
          break;
      }

      setBudgetModalData(modalData);
      setStatsModalTitle(modalTitle);
    } catch (error) {
      console.error('Error fetching budget details:', error);
      setError('Failed to load budget details');
    } finally {
      setLoadingBudgetModal(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    colorClass: string;
    icon?: string;
    onClick?: () => void;
  }> = ({ title, value, subtitle, colorClass, icon, onClick }) => (
    <div
      className={`group ${colorClass} rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
        onClick ? 'cursor-pointer border border-gray-200 hover:border-blue-300' : 'border border-gray-200'
      } relative overflow-hidden`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-white rounded-full -translate-y-8 sm:-translate-y-10 translate-x-8 sm:translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-12 sm:w-16 h-12 sm:h-16 bg-white rounded-full translate-y-6 sm:translate-y-8 -translate-x-6 sm:-translate-x-8"></div>
      </div>

      <div className="relative z-10">
        {/* Icon and Value Row */}
        <div className="flex flex-col items-center mb-2 sm:mb-3">
          {icon && (
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl mb-1 sm:mb-2 shadow-md ${
              colorClass.includes('blue') ? 'bg-blue-500 text-white' :
              colorClass.includes('emerald') ? 'bg-emerald-500 text-white' :
              colorClass.includes('amber') ? 'bg-amber-500 text-white' :
              colorClass.includes('red') ? 'bg-red-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {icon}
            </div>
          )}
          <div className={`text-lg sm:text-2xl font-bold ${
            colorClass.includes('blue') ? 'text-blue-700' :
            colorClass.includes('emerald') ? 'text-emerald-700' :
            colorClass.includes('amber') ? 'text-amber-700' :
            colorClass.includes('red') ? 'text-red-700' :
            'text-muted-foreground'
          }`}>
            {value}
          </div>
        </div>

        {/* Title */}
        <div className={`text-xs sm:text-sm font-bold mb-1 sm:mb-2 ${
          colorClass.includes('blue') ? 'text-blue-800' :
          colorClass.includes('emerald') ? 'text-emerald-800' :
          colorClass.includes('amber') ? 'text-amber-800' :
          colorClass.includes('red') ? 'text-red-800' :
          'text-gray-800'
        }`}>
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className={`text-xs font-medium mb-1 sm:mb-2 ${
            colorClass.includes('blue') ? 'text-blue-600' :
            colorClass.includes('emerald') ? 'text-emerald-600' :
            colorClass.includes('amber') ? 'text-amber-600' :
            colorClass.includes('red') ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {subtitle}
          </div>
        )}

        {/* Click indicator */}
        {onClick && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block group-hover:shadow-md transition-all duration-200 ${
            colorClass.includes('blue') ? 'text-blue-700 bg-blue-200/50 group-hover:bg-blue-200' :
            colorClass.includes('emerald') ? 'text-emerald-700 bg-emerald-200/50 group-hover:bg-emerald-200' :
            colorClass.includes('amber') ? 'text-amber-700 bg-amber-200/50 group-hover:bg-amber-200' :
            colorClass.includes('red') ? 'text-red-700 bg-red-200/50 group-hover:bg-red-200' :
            'text-muted-foreground bg-gray-200/50 group-hover:bg-gray-200'
          }`}>
            View Details →
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="space-y-6 sm:space-y-10 p-4 sm:p-8">
        {/* Enhanced Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            subtitle={`${stats.activeProjects} active`}
            colorClass="bg-gradient-to-br from-blue-50 to-blue-100"
            icon="🏗️"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set('tab', 'projects');
              window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          />
          <StatCard
            title="Total Budget"
            value={`$${stats.totalBudget.toLocaleString()}`}
            subtitle={`Avg: $${stats.avgProjectBudget.toLocaleString()}`}
            colorClass="bg-gradient-to-br from-emerald-50 to-emerald-100"
            icon="💰"
            onClick={() => handleBudgetCardClick('budget')}
          />
          <StatCard
            title="Total Spent"
            value={`$${stats.totalSpent.toLocaleString()}`}
            subtitle={`${stats.utilizationRate}% utilized`}
            colorClass={stats.utilizationRate > 90 ? "bg-gradient-to-br from-red-50 to-red-100" : 
                       stats.utilizationRate > 75 ? "bg-gradient-to-br from-amber-50 to-amber-100" : 
                       "bg-gradient-to-br from-emerald-50 to-emerald-100"}
            icon="💸"
            onClick={() => handleBudgetCardClick('spent')}
          />
          <StatCard
            title="Remaining Budget"
            value={`$${stats.remainingBudget.toLocaleString()}`}
            subtitle={stats.remainingBudget < 0 ? "Over budget!" : "Available"}
            colorClass={stats.remainingBudget >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100" : "bg-gradient-to-br from-red-50 to-red-100"}
            icon={stats.remainingBudget >= 0 ? "✅" : "⚠️"}
            onClick={() => handleBudgetCardClick('progress')}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-10">
          {/* Enhanced Projects List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-gray-200 shadow-2xl p-4 sm:p-8 hover:shadow-3xl hover:border-blue-300 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
              <h3
                className="text-xl sm:text-2xl font-bold text-foreground cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-3 sm:gap-4"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', 'projects');
                  window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const params = new URLSearchParams(window.location.search);
                    params.set('tab', 'projects');
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg">
                  🏗️
                </div>
                <div className="flex flex-col">
                  <span>Active Projects</span>
                  <span className="text-xs sm:text-sm text-blue-600 font-medium">
                    {enhancedProjects.length} total projects
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-blue-600 font-semibold bg-blue-50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
                  View All →
                </span>
              </h3>
              {projects.length > 5 && (
                <button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105" 
                  onClick={() => {
                    if (role === "admin") {
                      window.location.href = "/pm-dashboard";
                    } else {
                      setError("You are not authenticated for the page");
                    }
                  }}
                >
                  View All
                </button>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <div className="text-red-700 font-medium">{error}</div>
              </div>
            )}
            <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
              {statsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600 font-medium">Loading project data...</span>
                </div>
              ) : filteredEnhancedProjects.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center text-2xl">
                    📋
                  </div>
                  <span className="text-gray-600 font-medium">
                    {searchQuery ? 'No projects match your search' : 'No projects'}
                  </span>
                </div>
              ) : (
                                 filteredEnhancedProjects.map((project) => (
                   <div key={project.id} className="border-2 border-gray-200 rounded-xl shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                     <ProjectCard
                       project={{
                         ...project,
                         budget: project.calculatedBudget,
                         spent: project.calculatedSpent
                       }}
                       onSelect={onProjectSelect}
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

      {/* Budget Details Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-foreground">{statsModalTitle}</h2>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingBudgetModal ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading data...</span>
                </div>
              ) : budgetModalType === 'progress' ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Total Budget</div>
                      <div className="text-2xl font-bold text-blue-900">${budgetModalData.totalBudget?.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                      <div className="text-2xl font-bold text-purple-900">${budgetModalData.totalSpent?.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Remaining</div>
                      <div className="text-2xl font-bold text-green-900">${budgetModalData.remainingBudget?.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {/* Project Breakdown */}
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Project Breakdown</h4>
                    <div className="space-y-3">
                      {budgetModalData.items?.map((project: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-foreground">{project.name}</div>
                              <div className="text-sm text-gray-600">{project.client}</div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              project.status === 'Over Budget' ? 'bg-red-100 text-red-800' :
                              project.status === 'Near Limit' ? 'bg-yellow-100 text-yellow-800' :
                              project.status === 'High Usage' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Budget</div>
                              <div className="font-medium">${project.budget?.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Spent</div>
                              <div className="font-medium">${project.spent?.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Remaining</div>
                              <div className="font-medium">${project.remaining?.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Utilization</span>
                              <span>{project.utilization?.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  project.utilization > 90 ? 'bg-red-500' :
                                  project.utilization > 75 ? 'bg-yellow-500' :
                                  project.utilization > 50 ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(project.utilization, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : budgetModalData.total ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="text-sm text-gray-600">Total Amount</div>
                    <div className="text-2xl font-bold text-foreground">${budgetModalData.total?.toLocaleString()}</div>
                  </div>
                  
                  {/* Items List */}
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      {budgetModalType === 'budget' ? 'Contract Breakdown' : 'Payment Breakdown'}
                    </h4>
                    <div className="space-y-3">
                      {budgetModalData.items?.map((item: any, index: number) => (
                        <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">{item.name}</span>
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">{item.trade}</span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                <div>Project: {item.project}</div>
                                {item.date && <div>Date: {item.date}</div>}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.percentage}% of total
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-foreground">${item.amount?.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-500 font-medium">No data available</p>
                  <p className="text-sm text-gray-400">There are no items in this category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default OverviewView;
