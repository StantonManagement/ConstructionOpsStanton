
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
          <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-300 rounded-lg w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded-lg w-1/2"></div>
            <div className="h-3 bg-gray-300 rounded-lg w-1/4"></div>
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
    className="group relative bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-2xl p-6 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
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
    <div className="flex items-center justify-between mb-4">
      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold ${status.color} backdrop-blur-sm`}>
        <span className="mr-1">{status.icon}</span>
        {status.label}
      </span>
      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
        {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
      </span>
    </div>

    {/* Project info */}
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-3 font-bold text-lg text-gray-900">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
          🏗️
        </div>
        <span className="group-hover:text-blue-700 transition-colors">
          {app.project?.name || 'Unknown Project'}
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-gray-700">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm">
          👷
        </div>
        <span>Contractor: <span className="font-medium">{app.contractor?.name || 'Unknown'}</span></span>
      </div>
      
      <div className="flex items-center gap-3 text-gray-700">
        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center text-white text-sm">
          💲
        </div>
        <span>Amount: 
          <span className="ml-2 font-bold text-lg text-green-700 bg-green-50 px-3 py-1 rounded-lg">
            ${(app.current_payment || app.grand_total || 0).toLocaleString()}
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
      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300"
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
    window.location.href = `/payments/${paymentAppId}/verify`;
  };

  const navigateToPMDashboard = () => {
    if (role === "admin") {
      window.location.href = "/pm-dashboard";
    } else if (role !== null) {
      setError("You are not authenticated for the page");
    }
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
      map[projectName].total += app.current_payment || 0;
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
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
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
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium transition-colors"
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
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
                  proj.highestPriority === 'urgent' ? 'from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-300' :
                  proj.highestPriority === 'high' ? 'from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-orange-300' :
                  proj.highestPriority === 'medium' ? 'from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-300' :
                  'from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border-gray-300'
                } rounded-2xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-[1.01]`}
                onClick={navigateToPMDashboard}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigateToPMDashboard();
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 font-bold text-lg text-gray-900 mb-2">
                      <span>{proj.projectName}</span>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border ${badge.color}`}
                        title={badge.label + ' Priority'}
                      >
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1 font-medium">
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
                      navigateToPMDashboard();
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
              <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
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
                      className="group bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-[1.01]"
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
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-700">
                            {app.project?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Contractor: {app.contractor?.name || 'Unknown'}
                          </div>
                          <div className="text-sm font-bold text-green-700 bg-green-50 inline-block px-2 py-1 rounded-lg">
                            ${(app.current_payment || app.grand_total || 0).toLocaleString()}
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
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
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
            .from("users")
            .select("role")
            .eq("uuid", session.user.id)
            .single();

          if (error) {
            console.error("Role fetch error:", error);
            setRole("pending");
          } else {
            setRole(data?.role || "user");
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

  // Fetch enhanced project data with contractor stats
  const fetchEnhancedProjectData = useCallback(async () => {
    if (projects.length === 0) return;
    
    setStatsLoading(true);
    try {
      const enhancedData = await Promise.all(projects.map(async (project) => {
        const { data: contractorsData } = await supabase
          .from('project_contractors')
          .select('contract_amount, paid_to_date')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        const calculatedBudget = contractorsData?.reduce((sum, contract) => 
          sum + (Number(contract.contract_amount) || 0), 0) || 0;
        
        const calculatedSpent = contractorsData?.reduce((sum, contract) => 
          sum + (Number(contract.paid_to_date) || 0), 0) || 0;

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
  }, [projects]);

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

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    colorClass: string;
    icon?: string;
    onClick?: () => void;
  }> = ({ title, value, subtitle, colorClass, icon, onClick }) => (
    <div
      className={`group ${colorClass} rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-xl transform hover:scale-105 ${
        onClick ? 'cursor-pointer hover:shadow-2xl' : ''
      } backdrop-blur-sm border border-white/20`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-center gap-3 mb-3">
        {icon && (
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
            {icon}
          </div>
        )}
        <div className={`text-3xl font-bold ${colorClass.includes('blue') ? 'text-blue-800' :
                                           colorClass.includes('green') ? 'text-green-800' :
                                           colorClass.includes('yellow') ? 'text-yellow-800' :
                                           colorClass.includes('purple') ? 'text-purple-800' :
                                           'text-red-800'}`}>
          {value}
        </div>
      </div>
      <div className={`text-sm font-semibold mb-2 ${colorClass.includes('blue') ? 'text-blue-900' :
                                            colorClass.includes('green') ? 'text-green-900' :
                                            colorClass.includes('yellow') ? 'text-yellow-900' :
                                            colorClass.includes('purple') ? 'text-purple-900' :
                                            'text-red-900'}`}>
        {title}
      </div>
      {subtitle && (
        <div className="text-xs opacity-75 mb-2">{subtitle}</div>
      )}
      {onClick && (
        <div className="text-xs font-semibold text-blue-700 bg-white/30 px-3 py-1 rounded-lg inline-block group-hover:bg-white/50 transition-colors">
          Click to view projects →
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="space-y-8 p-6">
        {/* Enhanced Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            subtitle={`${stats.activeProjects} active`}
            colorClass="bg-gradient-to-br from-blue-400 to-blue-600"
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
            colorClass="bg-gradient-to-br from-green-400 to-emerald-600"
            icon="💰"
          />
          <StatCard
            title="Total Spent"
            value={`$${stats.totalSpent.toLocaleString()}`}
            subtitle={`${stats.utilizationRate}% utilized`}
            colorClass={stats.utilizationRate > 90 ? "bg-gradient-to-br from-red-400 to-red-600" : 
                       stats.utilizationRate > 75 ? "bg-gradient-to-br from-yellow-400 to-orange-500" : 
                       "bg-gradient-to-br from-green-400 to-emerald-600"}
            icon="💸"
          />
          <StatCard
            title="Remaining Budget"
            value={`$${stats.remainingBudget.toLocaleString()}`}
            subtitle={stats.remainingBudget < 0 ? "Over budget!" : "Available"}
            colorClass={stats.remainingBudget >= 0 ? "bg-gradient-to-br from-green-400 to-emerald-600" : "bg-gradient-to-br from-red-400 to-red-600"}
            icon={stats.remainingBudget >= 0 ? "✅" : "⚠️"}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Enhanced Projects List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-3"
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                  🏗️
                </div>
                Active Projects ({enhancedProjects.length})
                <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-lg">
                  → View all
                </span>
              </h3>
              {projects.length > 5 && (
                <button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105" 
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
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
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
                    {searchQuery ? 'No projects match your search' : 'No active projects'}
                  </span>
                </div>
              ) : (
                filteredEnhancedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={{
                      ...project,
                      budget: project.calculatedBudget,
                      spent: project.calculatedSpent
                    }}
                    onSelect={onProjectSelect}
                  />
                ))
              )}
            </div>
          </div>

          {/* Decisions Queue Cards */}
          <DecisionQueueCards role={role} setError={setError} />
        </div>
      </div>

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
