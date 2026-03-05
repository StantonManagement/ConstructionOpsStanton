'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/authFetch';
import ProjectHealthCard, { ProjectHealth, BudgetHealth, TimelineHealth } from './ProjectHealthCard';
import LoadingAnimation from './LoadingAnimation';
import PageContainer from './PageContainer';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
  Building2,
} from 'lucide-react';

type SortOption = 'name' | 'health_score' | 'budget_health' | 'timeline_health' | 'completion' | 'action_items';
type SortDirection = 'asc' | 'desc';

/**
 * ProjectHealthDashboard Component
 *
 * Displays a grid of project health cards with sorting and filtering options
 */
export default function ProjectHealthDashboard() {
  const [projects, setProjects] = useState<ProjectHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<SortOption>('health_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterBudgetHealth, setFilterBudgetHealth] = useState<BudgetHealth | 'all'>('all');
  const [filterTimelineHealth, setFilterTimelineHealth] = useState<TimelineHealth | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  /**
   * Fetch project health data
   */
  const fetchProjectHealth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authFetch('/api/projects/health');

      if (!response.ok) {
        throw new Error('Failed to fetch project health data');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching project health:', err);
      setError('Failed to load project health data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjectHealth();
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProjectHealth();
  };

  /**
   * Toggle sort direction
   */
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  /**
   * Change sort option
   */
  const handleSortChange = (newSort: SortOption) => {
    if (sortBy === newSort) {
      toggleSortDirection();
    } else {
      setSortBy(newSort);
      setSortDirection('desc'); // Default to descending for most metrics
    }
  };

  /**
   * Filter and sort projects
   */
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply filters
    if (filterBudgetHealth !== 'all') {
      filtered = filtered.filter((p) => p.budgetHealth === filterBudgetHealth);
    }

    if (filterTimelineHealth !== 'all') {
      filtered = filtered.filter((p) => p.timelineHealth === filterTimelineHealth);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'health_score':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'budget_health':
          comparison = a.budgetPercentUsed - b.budgetPercentUsed;
          break;
        case 'timeline_health':
          const timelineOrder = { on_track: 0, at_risk: 1, behind: 2 };
          comparison = timelineOrder[a.timelineHealth] - timelineOrder[b.timelineHealth];
          break;
        case 'completion':
          comparison = a.completionPercentage - b.completionPercentage;
          break;
        case 'action_items':
          comparison = a.openActionItemsCount - b.openActionItemsCount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [projects, sortBy, sortDirection, filterBudgetHealth, filterTimelineHealth, filterStatus]);

  /**
   * Get unique statuses for filter dropdown
   */
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(projects.map((p) => p.status));
    return Array.from(statuses).sort();
  }, [projects]);

  /**
   * Calculate summary stats
   */
  const summaryStats = useMemo(() => {
    const total = projects.length;
    const healthy = projects.filter((p) => p.healthScore >= 80).length;
    const needsAttention = projects.filter((p) => p.healthScore >= 60 && p.healthScore < 80).length;
    const critical = projects.filter((p) => p.healthScore < 60).length;

    return { total, healthy, needsAttention, critical };
  }, [projects]);

  if (isLoading) {
    return <LoadingAnimation text="Loading project health data..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-destructive mb-4">{error}</h2>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Project Health Dashboard</h1>
            <p className="text-muted-foreground">Monitor project health across budget, timeline, and completion</p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summaryStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summaryStats.healthy}</p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summaryStats.needsAttention}</p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summaryStats.critical}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Filters & Sorting</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="health_score">Health Score</option>
                <option value="name">Project Name</option>
                <option value="budget_health">Budget Health</option>
                <option value="timeline_health">Timeline Health</option>
                <option value="completion">Completion %</option>
                <option value="action_items">Action Items</option>
              </select>
              <button
                onClick={toggleSortDirection}
                className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter by Budget Health */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Budget Health</label>
            <select
              value={filterBudgetHealth}
              onChange={(e) => setFilterBudgetHealth(e.target.value as BudgetHealth | 'all')}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Filter by Timeline Health */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Timeline Health</label>
            <select
              value={filterTimelineHealth}
              onChange={(e) => setFilterTimelineHealth(e.target.value as TimelineHealth | 'all')}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="behind">Behind</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Project Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filterBudgetHealth !== 'all' || filterTimelineHealth !== 'all' || filterStatus !== 'all') && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filterBudgetHealth !== 'all' && (
              <span className="px-2 py-1 bg-muted rounded text-sm">
                Budget: <strong>{filterBudgetHealth}</strong>
              </span>
            )}
            {filterTimelineHealth !== 'all' && (
              <span className="px-2 py-1 bg-muted rounded text-sm">
                Timeline: <strong>{filterTimelineHealth.replace('_', ' ')}</strong>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="px-2 py-1 bg-muted rounded text-sm">
                Status: <strong>{filterStatus}</strong>
              </span>
            )}
            <button
              onClick={() => {
                setFilterBudgetHealth('all');
                setFilterTimelineHealth('all');
                setFilterStatus('all');
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{filteredAndSortedProjects.length}</strong> of{' '}
          <strong className="text-foreground">{projects.length}</strong> projects
        </p>
      </div>

      {/* Project Cards Grid */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-card border border-border rounded-lg">
          <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No projects found</h3>
          <p className="text-muted-foreground text-center">
            {projects.length === 0
              ? 'No projects available. Create your first project to get started.'
              : 'No projects match your current filters. Try adjusting your filter criteria.'}
          </p>
          {projects.length > 0 && (
            <button
              onClick={() => {
                setFilterBudgetHealth('all');
                setFilterTimelineHealth('all');
                setFilterStatus('all');
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedProjects.map((project) => (
            <ProjectHealthCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
