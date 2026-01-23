import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/providers/AuthProvider';
import ProjectCard from '../../components/ProjectCard';
import { supabase } from '@/lib/supabaseClient';
import { Project } from '@/context/DataContext';
import { formatCurrency } from '@/lib/theme';
import { TrendingUp, TrendingDown, DollarSign, FolderOpen, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface OverviewViewProps {
  onProjectSelect?: (project: Project) => void;
  onSwitchToPayments?: () => void;
  searchQuery?: string;
}

// Modern Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ title, value, subtitle, trend, trendValue, icon, onClick }) => (
  <div
    className={`bg-white rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all ${
      onClick ? 'cursor-pointer hover:border-primary/30' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="p-1.5 bg-primary/10 rounded-lg">
        {icon}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-600 mb-0.5">{title}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

// Simplified Action Item Component
const ActionItem: React.FC<{
  title: string;
  subtitle: string;
  amount: string;
  status: 'urgent' | 'review' | 'ready';
  onClick: () => void;
  daysOld?: number;
}> = ({ title, subtitle, amount, status, onClick, daysOld }) => {
  const statusConfig = {
    urgent: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    review: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    ready: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  };

  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={`${config.bg} ${config.border} border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span className="font-semibold text-sm text-gray-900 truncate">{title}</span>
            {daysOld !== undefined && daysOld > 0 && (
              <span className="text-xs text-gray-500">{daysOld}d</span>
            )}
          </div>
          <p className="text-xs text-gray-600 truncate ml-3.5">{subtitle}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-sm text-gray-900">{amount}</p>
        </div>
      </div>
    </div>
  );
};

const ImprovedOverviewView: React.FC<OverviewViewProps> = ({
  onProjectSelect,
  onSwitchToPayments,
  searchQuery = ''
}) => {
  const { projects } = useData();
  const { role } = useAuth();
  const [queueData, setQueueData] = useState<any>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [enhancedProjects, setEnhancedProjects] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch action queue
  const fetchQueue = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch('/api/dashboard/queue', {
        headers: { 'Authorization': `Bearer ${session.session.access_token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setQueueData(result.data);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  // Fetch enhanced project data
  const fetchEnhancedProjectData = useCallback(async () => {
    if (projects.length === 0) {
      setStatsLoading(false);
      return;
    }

    try {
      const { data: approvedPayments } = await supabase
        .from('payment_applications')
        .select('current_period_value, project_id')
        .eq('status', 'approved');

      const approvedByProject = (approvedPayments || []).reduce((acc: any, p) => {
        acc[p.project_id] = (acc[p.project_id] || 0) + (Number(p.current_period_value) || 0);
        return acc;
      }, {});

      const enhanced = await Promise.all(projects.map(async (project) => {
        const { data: contractors } = await supabase
          .from('project_contractors')
          .select('contract_amount')
          .eq('project_id', project.id)
          .eq('contract_status', 'active');

        const budget = contractors?.reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0) || 0;
        const spent = approvedByProject[project.id] || 0;

        return { ...project, calculatedBudget: budget, calculatedSpent: spent };
      }));

      setEnhancedProjects(enhanced);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    fetchQueue();
    fetchEnhancedProjectData();
    const interval = setInterval(fetchQueue, 60000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchEnhancedProjectData]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return enhancedProjects;
    const lower = searchQuery.toLowerCase();
    return enhancedProjects.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.client_name?.toLowerCase().includes(lower)
    );
  }, [enhancedProjects, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const active = filteredProjects.filter(p =>
      !p.current_phase?.toLowerCase().includes('complete')
    ).length;
    const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.calculatedBudget || 0), 0);
    const totalSpent = filteredProjects.reduce((sum, p) => sum + (p.calculatedSpent || 0), 0);
    const utilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

    return {
      total,
      active,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      utilization
    };
  }, [filteredProjects]);

  const totalQueueItems = queueData?.totals?.total || 0;
  const urgentCount = queueData?.totals?.urgent || 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Projects"
          value={stats.active}
          subtitle={`${stats.total} total`}
          icon={<FolderOpen className="w-5 h-5 text-primary" />}
          onClick={() => window.location.href = '/projects'}
        />
        <MetricCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          subtitle={`${stats.utilization}% utilized`}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          subtitle={`${formatCurrency(stats.remaining)} remaining`}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Actions Needed"
          value={totalQueueItems}
          subtitle={urgentCount > 0 ? `${urgentCount} urgent` : 'All clear'}
          icon={urgentCount > 0 ? <AlertCircle className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
          onClick={() => window.location.href = '/payments'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Projects List - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Projects ({filteredProjects.length})</h2>
            <button
              onClick={() => window.location.href = '/projects'}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              View All →
            </button>
          </div>

          <div className="p-3">
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-6">
                <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No projects found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {filteredProjects.slice(0, 5).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={{
                      ...project,
                      budget: project.calculatedBudget,
                      spent: project.calculatedSpent
                    }}
                    onSelect={onProjectSelect}
                    isLoading={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Queue - Takes 1 column */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Actions ({totalQueueItems})</h2>
            <button
              onClick={fetchQueue}
              className="text-gray-400 hover:text-gray-600"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            {queueLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : totalQueueItems === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-xs text-gray-900 mb-0.5">All caught up!</p>
                <p className="text-xs text-gray-500">No items need attention</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {/* Urgent Items */}
                {queueData?.urgent?.slice(0, 5).map((item: any) => (
                  <ActionItem
                    key={item.id}
                    title={item.contractorName}
                    subtitle={item.projectName}
                    amount={formatCurrency(item.amount)}
                    status="urgent"
                    daysOld={item.daysOld}
                    onClick={() => window.location.href = `/payments/${item.id}/verify`}
                  />
                ))}

                {/* Needs Review Items */}
                {queueData?.needsReview?.slice(0, 3).map((item: any) => (
                  <ActionItem
                    key={item.id}
                    title={item.contractorName}
                    subtitle={item.projectName}
                    amount={formatCurrency(item.amount)}
                    status="review"
                    daysOld={item.daysOld}
                    onClick={() => window.location.href = `/payments/${item.id}/verify`}
                  />
                ))}

                {/* Ready to Pay Items */}
                {queueData?.readyToPay?.slice(0, 2).map((item: any) => (
                  <ActionItem
                    key={item.id}
                    title={item.contractorName}
                    subtitle={item.projectName}
                    amount={formatCurrency(item.amount)}
                    status="ready"
                    onClick={() => window.location.href = `/payments/${item.id}/verify`}
                  />
                ))}

                {totalQueueItems > 10 && (
                  <button
                    onClick={() => window.location.href = '/payments'}
                    className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    View All {totalQueueItems} Items →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedOverviewView;
