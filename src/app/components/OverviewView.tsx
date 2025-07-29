import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import ProjectCard from '../../components/ProjectCard';
import { supabase } from '@/lib/supabaseClient';

// Types for better type safety
interface PaymentApplication {
  id: string;
  status: 'needs_review' | 'submitted';
  current_payment: number;
  created_at: string;
  project: { name: string } | null;
  contractor: { name: string } | null;
}

interface Project {
  id: string;
  budget: number;
  spent: number;
  [key: string]: any;
}

interface StatusConfig {
  color: string;
  label: string;
  icon: string;
}

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border rounded-lg p-4 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    ))}
  </div>
);

// Extracted queue card component for better reusability
const QueueCard: React.FC<{ 
  app: PaymentApplication; 
  status: StatusConfig; 
  onReview: (id: string) => void 
}> = ({ app, status, onReview }) => (
  <div
    className="flex flex-col border rounded-lg p-4 bg-white shadow hover:shadow-lg transition-all duration-200 group focus-within:ring-2 focus-within:ring-blue-400"
    tabIndex={0}
    aria-label={`Review application for ${app.project?.name}`}
  >
    <div className="flex items-center gap-2 mb-2">
      <span className={`px-2 py-1 rounded text-xs font-semibold ${status.color}`}>{status.icon} {status.label}</span>
      <span className="ml-auto text-xs text-gray-500">{app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}</span>
    </div>
    <div className="flex items-center gap-2 font-bold text-lg text-blue-900 mb-1">
      <span className="text-blue-500">🏗️</span>
      {app.project?.name || 'Unknown Project'}
    </div>
    <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
      <span className="text-green-600">👷</span>
      Contractor: <span className="font-medium">{app.contractor?.name || 'Unknown'}</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
      <span className="text-yellow-600">💲</span>
      Amount:
      <span
        className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded cursor-help relative group-hover:bg-green-100"
        tabIndex={0}
        aria-label={`Amount for this application: $${app.current_payment?.toLocaleString() || '0'}`}
      >
        ${app.current_payment?.toLocaleString() || '0'}
      </span>
    </div>
    <button
      onClick={() => onReview(app.id)}
      className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors w-max self-end focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`Go to review for ${app.project?.name}`}
    >
      Go to Application
    </button>
  </div>
);

const DecisionQueueCards: React.FC<{ role: string | null, setError: (msg: string) => void }> = ({ role, setError }) => {
  const [queue, setQueue] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState<string | null>(null); // Only for local fetch errors

  const fetchQueue = useCallback(async () => {
    try {
      setLocalError(null);
      const { data, error } = await supabase
        .from('payment_applications')
        .select('id, status, current_payment, created_at, project_id, project:projects(id, name), contractor:contractors(name)')
        .in('status', ['needs_review', 'submitted'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQueue(
        (data || []).map((item: any) => ({
          ...item,
          project: item.project || { name: '' },
          contractor: item.contractor || { name: '' },
        }))
      );
    } catch (err) {
      console.error('Error fetching queue:', err);
      setLocalError('Failed to load decision queue');
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
      // Assume app.priority exists, fallback to 'medium' if not
      const priority = (app as any).priority || 'medium';
      if (!map[projectName]) {
        map[projectName] = { projectName, count: 0, total: 0, highestPriority: priority };
      }
      map[projectName].count += 1;
      map[projectName].total += app.current_payment || 0;
      // Update highest priority if this app is higher
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
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Decisions Queue</h3>
        <div className="text-red-500 text-center py-8 flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button 
            onClick={fetchQueue}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Decisions Queue</h3>
      {loading ? (
        <LoadingSkeleton />
      ) : projectQueueSummary.length === 0 ? (
        <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
          <span className="text-2xl">✅</span>
          <span>No items need your attention.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {projectQueueSummary.map((proj) => {
            const badge = priorityBadge[proj.highestPriority as keyof typeof priorityBadge] || priorityBadge.medium;
            return (
              <div
                key={proj.projectName}
                className={`flex items-center justify-between border rounded-lg p-4 shadow hover:shadow-md transition-all ${
                  proj.highestPriority === 'urgent' ? 'border-red-300 bg-red-50' :
                  proj.highestPriority === 'high' ? 'border-orange-300 bg-orange-50' :
                  proj.highestPriority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-lg text-blue-900">
                    {proj.projectName}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}
                      title={badge.label + ' Priority'}
                    >
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">{proj.count} payment{proj.count > 1 ? 's' : ''} need review</div>
                  <div className="text-xs text-green-700 mt-1">Total: ${proj.total.toLocaleString()}</div>
                </div>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors"
                  disabled={role === null}
                  onClick={() => {
                    if (role === "admin") {
                      window.location.href = "/pm-dashboard";
                    } else if (role !== null) {
                      setError("You are not authenticated for the page");
                    }
                  }}
                >
                  {role === null ? "Checking role..." : "View All"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const OverviewView: React.FC = () => {
  const { projects } = useData();
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const getRole = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session:", session, "Error:", sessionError);
      if (session?.user) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single();
        console.log("User role fetch:", data, error);
        setRole(data?.role || "unknown");
      } else {
        setRole("unknown");
      }
    };
    getRole();
  }, []);

  // Memoize calculations to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
    const remainingBudget = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      totalProjects,
      totalBudget,
      totalSpent,
      remainingBudget,
      utilizationRate
    };
  }, [projects]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    colorClass: string;
    icon?: string;
  }> = ({ title, value, subtitle, colorClass, icon }) => (
    <div className={`${colorClass} rounded-lg p-4 text-center transition-transform hover:scale-105`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <div className={`text-2xl font-bold ${colorClass.includes('blue') ? 'text-blue-700' : 
                                           colorClass.includes('green') ? 'text-green-700' : 
                                           colorClass.includes('yellow') ? 'text-yellow-700' : 
                                           'text-red-700'}`}>
          {value}
        </div>
      </div>
      <div className={`text-sm font-medium ${colorClass.includes('blue') ? 'text-blue-900' : 
                                            colorClass.includes('green') ? 'text-green-900' : 
                                            colorClass.includes('yellow') ? 'text-yellow-900' : 
                                            'text-red-900'}`}>
        {title}
      </div>
      {subtitle && (
        <div className="text-xs opacity-75 mt-1">{subtitle}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <StatCard
          title="Active Projects"
          value={stats.totalProjects}
          colorClass="bg-blue-50"
          icon="🏗️"
        />
        <StatCard
          title="Total Budget"
          value={`$${stats.totalBudget.toLocaleString()}`}
          colorClass="bg-green-50"
          icon="💰"
        />
        <StatCard
          title="Total Spent"
          value={`$${stats.totalSpent.toLocaleString()}`}
          subtitle={`${stats.utilizationRate.toFixed(1)}% utilized`}
          colorClass="bg-yellow-50"
          icon="💸"
        />
        <StatCard
          title="Remaining Budget"
          value={`$${stats.remainingBudget.toLocaleString()}`}
          colorClass={stats.remainingBudget >= 0 ? "bg-green-50" : "bg-red-50"}
          icon={stats.remainingBudget >= 0 ? "✅" : "⚠️"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Projects List */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🏗️ Active Projects ({projects.length})
            </h3>
            {projects.length > 5 && (
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={() => {
                if (role === "admin") {
                  window.location.href = "/pm-dashboard";
                } else {
                  setError("You are not authenticated for the page");
                }
              }}>
                View All
              </button>
            )}
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                <span className="text-2xl">📋</span>
                <span>No active projects</span>
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            )}
          </div>
        </div>

        {/* Decisions Queue Cards */}
        <DecisionQueueCards role={role} setError={setError} />
      </div>
    </div>
  );
};

export default OverviewView;

