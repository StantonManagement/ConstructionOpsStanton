'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  FileText,
  Home
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

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
}

// Colors
const STATUS_COLORS = {
  'On Track': '#10b981',
  'Warning': '#f59e0b',
  'Critical': '#f97316',
  'Over Budget': '#ef4444'
};

const BudgetDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/dashboard/budget-metrics', {
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
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard: {error}</p>
        <button onClick={fetchData} className="text-red-600 underline mt-2">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Prepare chart data
  const statusChartData = [
    { name: 'On Track', value: data.statusSummary.onTrack, color: STATUS_COLORS['On Track'] },
    { name: 'Warning', value: data.statusSummary.warning, color: STATUS_COLORS['Warning'] },
    { name: 'Critical', value: data.statusSummary.critical, color: STATUS_COLORS['Critical'] },
    { name: 'Over Budget', value: data.statusSummary.overBudget, color: STATUS_COLORS['Over Budget'] }
  ].filter(item => item.value > 0);

  const topProjectsByRemaining = [...data.projects]
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budget vs Actual Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Budget</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${data.heroMetrics.totalRevised.toLocaleString()}
          </p>
          {data.heroMetrics.totalRevised !== data.heroMetrics.totalBudget && (
            <p className="text-xs text-gray-400 mt-1">
              Original: ${data.heroMetrics.totalBudget.toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Spent</p>
            <TrendingDown className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${data.heroMetrics.totalSpent.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {data.heroMetrics.percentSpent.toFixed(1)}% of budget
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Committed</p>
            <FileText className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            ${data.heroMetrics.totalCommitted.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Approved but unpaid</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Remaining</p>
            <TrendingUp className={`w-5 h-5 ${data.heroMetrics.totalRemaining < 0 ? 'text-red-500' : 'text-blue-500'}`} />
          </div>
          <p className={`text-3xl font-bold ${data.heroMetrics.totalRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ${data.heroMetrics.totalRemaining.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Available to spend</p>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Change Orders</p>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {data.changeOrdersSummary.pending}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ${data.changeOrdersSummary.pendingAmount.toLocaleString()} pending
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-900">On Track</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.statusSummary.onTrack}</p>
          <p className="text-xs text-green-600 mt-1">properties performing well</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="font-semibold text-yellow-900">Warning</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{data.statusSummary.warning}</p>
          <p className="text-xs text-yellow-600 mt-1">approaching budget limit</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <p className="font-semibold text-orange-900">Critical</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{data.statusSummary.critical}</p>
          <p className="text-xs text-orange-600 mt-1">need immediate attention</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="font-semibold text-red-900">Over Budget</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{data.statusSummary.overBudget}</p>
          <p className="text-xs text-red-600 mt-1">exceeded budget</p>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">Active Alerts</h3>
              <div className="space-y-2">
                {data.alerts.map((alert, idx) => (
                  <div key={idx} className={`text-sm ${
                    alert.type === 'critical' ? 'text-red-700' :
                    alert.type === 'warning' ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>
                    • {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Projects by Remaining Budget */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects by Remaining Budget</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProjectsByRemaining} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} fontSize={12} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Bar dataKey="remaining" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Property Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Property Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Original</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revised</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Spent</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No active properties with budgets</p>
                  </td>
                </tr>
              ) : (
                data.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      {project.portfolio_name && (
                        <div className="text-xs text-gray-500">{project.portfolio_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ${project.budgetOriginal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={project.budgetRevised !== project.budgetOriginal ? 'font-semibold text-blue-600' : 'text-gray-900'}>
                        ${project.budgetRevised.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ${project.actualSpend.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={project.remaining < 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        ${project.remaining.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium">
                      {project.percentSpent.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[project.budgetStatus as keyof typeof STATUS_COLORS]}20`,
                          color: STATUS_COLORS[project.budgetStatus as keyof typeof STATUS_COLORS]
                        }}
                      >
                        {project.budgetStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;

