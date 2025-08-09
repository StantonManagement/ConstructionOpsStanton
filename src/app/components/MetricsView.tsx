import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Building } from 'lucide-react';

const MetricsView: React.FC = () => {
  const { projects, subcontractors, contracts = [] } = useData();

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => (p as any).status === 'active' || !(p as any).status).length;
    const completedProjects = projects.filter(p => (p as any).status === 'completed').length;

    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
    const remainingBudget = totalBudget - totalSpent;
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const totalContracts = contracts.length;
    const contractValue = contracts.reduce((sum, c) => sum + (Number(c.contract_amount) || 0), 0);

    const totalVendors = subcontractors.length;
    const activeVendors = subcontractors.filter(s => (s as any).status === 'active' || !(s as any).status).length;

    // Performance metrics
    const avgProjectBudget = totalProjects > 0 ? totalBudget / totalProjects : 0;
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      remainingBudget,
      budgetUtilization,
      totalContracts,
      contractValue,
      totalVendors,
      activeVendors,
      avgProjectBudget,
      completionRate
    };
  }, [projects, subcontractors, contracts]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color: string;
  }> = ({ title, value, icon, trend, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-600 text-sm">{title}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📊 Metrics & Analytics</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          Last updated  {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={metrics.totalProjects}
          icon={<Building className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <MetricCard
          title="Total Budget"
          value={`$${metrics.totalBudget.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Active Vendors"
          value={metrics.activeVendors}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-orange-500"
        />
      </div>

      {/* Financial Metrics */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">💰 Financial Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ${metrics.totalSpent.toLocaleString()}
            </div>
            <div className="text-gray-600">Total Spent</div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.budgetUtilization.toFixed(1)}% of budget
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              ${metrics.remainingBudget.toLocaleString()}
            </div>
            <div className="text-gray-600">Remaining Budget</div>
            <div className="text-sm text-gray-500 mt-1">
              Available funds
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              ${metrics.contractValue.toLocaleString()}
            </div>
            <div className="text-gray-600">Contract Value</div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.totalContracts} contracts
            </div>
          </div>
        </div>

        {/* Budget Utilization Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
            <span className="text-sm text-gray-600">{metrics.budgetUtilization.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                metrics.budgetUtilization > 90 ? 'bg-red-500' :
                metrics.budgetUtilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.budgetUtilization, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Project Completion Rate</span>
              <span className="font-semibold text-gray-900">{metrics.completionRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Project Budget</span>
              <span className="font-semibold text-gray-900">${metrics.avgProjectBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Vendor Utilization</span>
              <span className="font-semibold text-gray-900">
                {metrics.totalVendors > 0 ? ((metrics.activeVendors / metrics.totalVendors) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">New project started this week</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">2 contracts signed recently</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Budget review scheduled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Status Distribution */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">📋 Project Status Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">{metrics.activeProjects}</div>
            <div className="text-sm text-blue-700">Active Projects</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">{metrics.completedProjects}</div>
            <div className="text-sm text-green-700">Completed Projects</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 mb-1">
              {metrics.totalProjects - metrics.activeProjects - metrics.completedProjects}
            </div>
            <div className="text-sm text-gray-700">Other Status</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;