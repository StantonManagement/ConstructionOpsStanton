import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  FileText,
  Home,
  Filter,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { MetricCard } from '@/components/ui/MetricCard';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { DataTable } from '@/components/ui/DataTable';
import { getBudgetStatus, formatCurrency, formatPercent } from '@/lib/theme';

// Types
interface HeroMetrics {
  totalBudget: number;
  totalRevised: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  percentSpent: number;
}

interface StatusSummary {
  onTrack: number;
  warning: number;
  critical: number;
  overBudget: number;
}

interface ChangeOrdersSummary {
  total: number;
  pending: number;
  approved: number;
  pendingAmount: number;
  approvedAmount: number;
}

interface ProjectMetrics {
  id: number;
  name: string;
  owner_entity_id: number | null;
  portfolio_name: string | null;
  status: string;
  budgetOriginal: number;
  budgetRevised: number;
  actualSpend: number;
  remaining: number;
  percentSpent: number;
  budgetStatus: string;
}

interface BudgetLineItem {
  id: number;
  project_id: number;
  category_name: string;
  original: number;
  revised: number;
  actual: number;
  committed: number;
  remaining: number;
  percentSpent: number;
  status: string;
}

interface Alert {
  type: 'info' | 'warning' | 'critical';
  message: string;
  projectId: number | null;
  projectName: string | null;
}

interface DashboardData {
  heroMetrics: HeroMetrics;
  statusSummary: StatusSummary;
  changeOrdersSummary: ChangeOrdersSummary;
  projects: ProjectMetrics[];
  alerts: Alert[];
  budgetItems?: BudgetLineItem[];
}

const BudgetDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Append selected project to API call
      const projectParam = selectedProject !== 'all' ? `?project=${selectedProject}` : '';
      const response = await fetch(`/api/dashboard/budget-metrics${projectParam}`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Read project filter from URL on mount
  useEffect(() => {
    const projectFromUrl = searchParams.get('project');
    if (projectFromUrl) {
      setSelectedProject(projectFromUrl);
    }
  }, [searchParams]);

  // Handle project filter change
  const handleProjectFilterChange = (projectId: string) => {
    setSelectedProject(projectId);
    const params = new URLSearchParams(searchParams.toString());
    if (projectId === 'all') {
      params.delete('project');
    } else {
      params.set('project', projectId);
    }
    router.replace(`/?tab=budget&${params.toString()}`, { scroll: false });
  };

  // Filter projects or budget items based on selection and filters
  const filteredItems = useMemo(() => {
    if (!data) return [];
    
    if (selectedProject === 'all') {
        // Mode A: Portfolio View (Projects)
        let filtered = data.projects;
        if (statusFilter) {
            filtered = filtered.filter(p => p.budgetStatus === statusFilter);
        }
        return filtered;
    } else {
        // Mode B: Single Project View (Line Items)
        let filtered = data.budgetItems || [];
        if (statusFilter) {
            filtered = filtered.filter(item => item.status === statusFilter);
        }
        return filtered;
    }
  }, [data, selectedProject, statusFilter]);

  // Get selected project name for display
  const selectedProjectName = useMemo(() => {
    if (!data) return 'All Projects';
    if (selectedProject === 'all') return 'All Projects';
    const project = data.projects.find(p => p.id.toString() === selectedProject);
    return project?.name || 'All Projects';
  }, [data, selectedProject]);

  // Identify Items to Watch (Critical or Over Budget)
  // Returns ProjectMetrics for 'all' mode, BudgetLineItem for single project mode
  const itemsToWatch = useMemo(() => {
    if (!data) return [];
    
    if (selectedProject === 'all') {
        return data.projects
          .filter(p => p.budgetStatus === 'Critical' || p.budgetStatus === 'Over Budget' || p.percentSpent > 90)
          .sort((a, b) => b.percentSpent - a.percentSpent)
          .slice(0, 5);
    } else {
        return (data.budgetItems || [])
          .filter(item => item.status === 'Critical' || item.status === 'Over Budget' || item.percentSpent > 90)
          .sort((a, b) => b.percentSpent - a.percentSpent)
          .slice(0, 5);
    }
  }, [data, selectedProject]);

  // Handle row click to navigate to project budget detail (Portfolio Mode Only)
  const handleProjectRowClick = (projectId: number) => {
    router.push(`/?tab=projects&project=${projectId}&subtab=budget`);
  };

  // Toggle status filter
  const handleStatusCardClick = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter(null); // Deselect if already selected
    } else {
      setStatusFilter(status);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-status-critical">Error loading dashboard: {error}</p>
        <button onClick={fetchData} className="text-status-critical underline mt-2">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isPortfolioMode = selectedProject === 'all';

  // Ensure valid data for charts to prevent width/height errors
  const chartData = isPortfolioMode 
    ? filteredItems.slice(0, 10) 
    : filteredItems.slice(0, 12);
  
  const showChart = chartData && chartData.length > 0;

  const columns = isPortfolioMode ? [
    { 
      header: 'Property', 
      accessor: (row: ProjectMetrics) => (
        <div>
          <div className="text-sm font-medium text-foreground">{row.name}</div>
          {row.portfolio_name && <div className="text-xs text-muted-foreground">{row.portfolio_name}</div>}
        </div>
      )
    },
    { 
      header: 'Total Budget', 
      accessor: (row: ProjectMetrics) => (
        <div className="text-right">
          <div className="font-medium">{formatCurrency(row.budgetRevised)}</div>
          {row.budgetRevised !== row.budgetOriginal && (
            <div className="text-[10px] text-muted-foreground">Orig: {formatCurrency(row.budgetOriginal)}</div>
          )}
        </div>
      ),
      align: 'right' as const 
    },
    { header: 'Spent', accessor: (row: ProjectMetrics) => formatCurrency(row.actualSpend), align: 'right' as const },
    { 
      header: 'Remaining', 
      accessor: (row: ProjectMetrics) => (
        <span className={row.remaining < 0 ? 'text-status-critical font-bold' : 'text-status-success'}>
          {formatCurrency(row.remaining)}
        </span>
      ), 
      align: 'right' as const 
    },
    { header: '% Used', accessor: (row: ProjectMetrics) => formatPercent(row.percentSpent), align: 'center' as const },
    { 
      header: 'Status', 
      accessor: (row: ProjectMetrics) => {
        const status = row.budgetStatus === 'Over Budget' ? 'critical' :
                      row.budgetStatus === 'Critical' ? 'critical' :
                      row.budgetStatus === 'Warning' ? 'warning' : 'neutral';
        return (
          <SignalBadge status={status}>
            {row.budgetStatus}
          </SignalBadge>
        );
      }, 
      align: 'center' as const 
    },
    {
      header: 'Action',
      accessor: () => (
        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors mx-auto" />
      ),
      align: 'center' as const
    }
  ] : [
    { header: 'Category', accessor: 'category_name', className: 'font-medium' },
    { 
      header: 'Budget', 
      accessor: (row: BudgetLineItem) => (
        <div className="text-right">
          <div className="font-medium">{formatCurrency(row.revised)}</div>
          {row.revised !== row.original && (
            <div className="text-[10px] text-muted-foreground">Orig: {formatCurrency(row.original)}</div>
          )}
        </div>
      ),
      align: 'right' as const 
    },
    { header: 'Spent', accessor: (row: BudgetLineItem) => formatCurrency(row.actual), align: 'right' as const },
    { header: 'Committed', accessor: (row: BudgetLineItem) => formatCurrency(row.committed), align: 'right' as const },
    { 
      header: 'Remaining', 
      accessor: (row: BudgetLineItem) => (
        <span className={row.remaining < 0 ? 'text-status-critical font-bold' : 'text-status-success'}>
          {formatCurrency(row.remaining)}
        </span>
      ), 
      align: 'right' as const 
    },
    { header: '% Used', accessor: (row: BudgetLineItem) => formatPercent(row.percentSpent), align: 'center' as const },
    { 
      header: 'Status', 
      accessor: (row: BudgetLineItem) => {
        const status = row.status === 'Over Budget' ? 'critical' :
                      row.status === 'Critical' ? 'critical' :
                      row.status === 'Warning' ? 'warning' : 'neutral';
        return (
          <SignalBadge status={status}>
            {row.status}
          </SignalBadge>
        );
      }, 
      align: 'center' as const 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isPortfolioMode ? 'Budget Dashboard' : `${selectedProjectName} Budget`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPortfolioMode 
                ? 'Financial health overview and cash flow analysis' 
                : 'Trade breakdown and line item performance'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isPortfolioMode && (
            <button
              onClick={() => router.push(`/?tab=projects&project=${selectedProject}`)}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-accent hover:text-primary transition-colors"
              title="Go to Project Details"
            >
              <span className="hidden sm:inline">View Project</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedProject}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              className="border border-input bg-background rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-input"
            >
              <option value="all">All Projects</option>
              {data.projects.map((project) => (
                <option key={project.id} value={project.id.toString()}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          title="Total Budget"
          value={formatCurrency(data.heroMetrics.totalRevised)}
          subtitle="Total approved budget"
          padding="sm"
        />

        <MetricCard 
          title="Total Spent"
          value={formatCurrency(data.heroMetrics.totalSpent)}
          status={getBudgetStatus(data.heroMetrics.totalSpent, data.heroMetrics.totalRevised)}
          subtitle={`${formatPercent(data.heroMetrics.percentSpent)} of total budget`}
          padding="sm"
        />

        <MetricCard 
          title="Committed Costs"
          value={formatCurrency(data.heroMetrics.totalCommitted)}
          status="warning"
          subtitle="Approved pending payment"
          padding="sm"
        />

        <MetricCard 
          title="Remaining"
          value={formatCurrency(data.heroMetrics.totalRemaining)}
          status={data.heroMetrics.totalRemaining < 0 ? 'critical' : 'neutral'}
          statusLabel={data.heroMetrics.totalRemaining < 0 ? 'Over Budget' : undefined}
          subtitle="Available to spend"
          padding="sm"
        />

        <MetricCard 
          title="Change Orders"
          value={data.changeOrdersSummary.pending}
          status="warning"
          subtitle={`${formatCurrency(data.changeOrdersSummary.pendingAmount)} pending approval`}
          padding="sm"
        />
      </div>

      {/* Clickable Status Summary Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'On Track', count: data.statusSummary.onTrack, status: 'success', desc: isPortfolioMode ? 'Properties performing well' : 'Trades within budget' },
          { label: 'Warning', count: data.statusSummary.warning, status: 'warning', desc: isPortfolioMode ? 'Approaching budget limit' : 'Trades nearing limit' },
          { label: 'Critical', count: data.statusSummary.critical, status: 'critical', desc: isPortfolioMode ? 'Need immediate attention' : 'Trades overspending' },
          { label: 'Over Budget', count: data.statusSummary.overBudget, status: 'critical', desc: isPortfolioMode ? 'Exceeded budget' : 'Trades exceeded budget' }
        ].map((statusItem) => (
          <div 
            key={statusItem.label}
            onClick={() => handleStatusCardClick(statusItem.label)}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md bg-card ${
              statusFilter === statusItem.label 
                ? `ring-2 ring-offset-2 ring-primary border-primary` 
                : `border-border hover:bg-accent/50`
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SignalBadge status={statusItem.status === 'success' ? 'neutral' : statusItem.status as any}>
                  {statusItem.label}
                </SignalBadge>
              </div>
              {statusFilter === statusItem.label && <div className="w-2 h-2 rounded-full bg-primary"></div>}
            </div>
            <p className="text-2xl font-bold text-foreground">{statusItem.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{statusItem.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items to Watch (Projects or Trades) */}
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm lg:col-span-1">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            {isPortfolioMode ? 'Projects to Watch' : 'Trades to Watch'}
          </h3>
          {itemsToWatch.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-status-success" />
              <p>{isPortfolioMode ? 'All projects are healthy!' : 'All trades are on budget!'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsToWatch.map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={isPortfolioMode ? () => handleProjectRowClick(item.id) : undefined}
                  className={`p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors group ${isPortfolioMode ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className={`font-medium text-foreground ${isPortfolioMode ? 'group-hover:text-primary' : ''} transition-colors`}>
                        {isPortfolioMode ? item.name : item.category_name}
                      </h4>
                      <div className="mt-1">
                        <SignalBadge status={
                          (isPortfolioMode ? item.budgetStatus : item.status) === 'Over Budget' ? 'critical' :
                          (isPortfolioMode ? item.budgetStatus : item.status) === 'Critical' ? 'critical' :
                          'warning'
                        }>
                          {isPortfolioMode ? item.budgetStatus : item.status}
                        </SignalBadge>
                      </div>
                    </div>
                    {isPortfolioMode && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Spent: {item.percentSpent.toFixed(1)}%</span>
                        <span>{formatCurrency(item.remaining)} left</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.percentSpent >= 100 ? 'bg-status-critical' :
                            item.percentSpent >= 90 ? 'bg-status-warning' :
                            'bg-status-warning'
                          }`}
                          style={{ width: `${Math.min(item.percentSpent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Health Chart (Portfolio or Category Breakdown) */}
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {isPortfolioMode ? 'Portfolio Budget Health' : 'Budget vs Actual by Category'}
          </h3>
          <div className="h-[300px] w-full">
            {showChart ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                {isPortfolioMode ? (
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120} 
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'var(--accent)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card p-3 border border-border shadow-lg rounded text-sm">
                                <p className="font-bold text-foreground">{data.name}</p>
                                <p className="text-muted-foreground">Budget: {formatCurrency(data.budgetRevised)}</p>
                                <p className="text-muted-foreground">Spent: {formatCurrency(data.actualSpend)} ({formatPercent(data.percentSpent)})</p>
                                <p className="text-muted-foreground">Remaining: {formatCurrency(data.remaining)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="percentSpent" name="% Spent" barSize={20}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.percentSpent >= 100 ? 'var(--status-critical)' : 
                              entry.percentSpent >= 90 ? 'var(--status-warning)' : 
                              entry.percentSpent >= 75 ? 'var(--status-warning)' : 
                              'var(--status-success)'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                ) : (
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="category_name" 
                        width={100} 
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip 
                          formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      />
                      <Legend />
                      <Bar dataKey="revised" name="Budget" fill="var(--muted-foreground)" barSize={20} />
                      <Bar dataKey="actual" name="Spent" fill="var(--primary)" barSize={20} />
                    </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for chart
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {isPortfolioMode 
                ? 'Showing spending percentage for top 10 active projects' 
                : 'Showing Budget vs Actual for top budget categories'}
          </p>
        </div>
      </div>

      {/* Cash Flow Projection Placeholder */}
      <div className="bg-card rounded-lg border-2 border-dashed border-muted p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Cash Flow Projection</h3>
          <p className="text-sm text-muted-foreground mb-1">Coming Soon</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Track when payments are due out and when draws are expected in. 
            Project your cash position 30/60/90 days out.
          </p>
        </div>
      </div>

      {/* Data Table (Projects or Line Items) */}
      <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
                {isPortfolioMode ? 'Property Performance' : 'Budget Line Items'}
            </h3>
            {statusFilter && (
              <p className="text-sm text-primary mt-1 flex items-center gap-1">
                Filtered by: {statusFilter}
                <button onClick={() => setStatusFilter(null)} className="hover:underline ml-2 text-muted-foreground text-xs">
                  (Clear)
                </button>
              </p>
            )}
          </div>
        </div>
        
        <DataTable 
          data={filteredItems} 
          columns={columns as any} 
          emptyMessage={
            statusFilter 
              ? `No items match the "${statusFilter}" status filter.` 
              : "No data available."
          }
          onRowClick={isPortfolioMode ? (row: any) => handleProjectRowClick(row.id) : undefined}
        />
      </div>
    </div>
  );
};

export default BudgetDashboard;
