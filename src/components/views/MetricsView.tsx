import React, { useMemo } from 'react';
import { useData } from '@/app/context/DataContext';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Building } from 'lucide-react';

const MetricsView: React.FC = () => {
  const { state } = useData();

  const metrics = useMemo(() => {
    const projects = state.projects;
    const contractors = state.contractors;
    const paymentApplications = state.paymentApplications;

    // Calculate project metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.current_phase === 'active').length;
    const completedProjects = projects.filter(p => p.current_phase === 'completed').length;

    // Calculate budget metrics
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

    // Calculate payment metrics
    const totalPayments = paymentApplications.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const pendingPayments = paymentApplications.filter(p => p.status === 'pending').length;
    const approvedPayments = paymentApplications.filter(p => p.status === 'approved').length;

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0
      },
      budget: {
        total: totalBudget,
        average: totalProjects > 0 ? totalBudget / totalProjects : 0,
        utilization: 75 // Mock utilization rate
      },
      contractors: {
        total: contractors.length,
        active: contractors.length // Assuming all contractors are active
      },
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        approved: approvedPayments,
        averageAmount: paymentApplications.length > 0 ? totalPayments / paymentApplications.length : 0
      }
    };
  }, [state]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: 'up' | 'down';
    trendValue?: number;
    icon?: React.ReactNode;
    color?: string;
  }> = ({ title, value, subtitle, trend, trendValue, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600'
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {trendValue}% from last month
              </div>
            )}
          </div>
          {icon && (
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Metrics</h2>
        <p className="text-gray-600">Track performance and insights across your projects</p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={metrics.projects.total}
          subtitle={`${metrics.projects.active} active, ${metrics.projects.completed} completed`}
          trend="up"
          trendValue={12}
          icon={<Building className="w-6 h-6" />}
          color="blue"
        />

        <MetricCard
          title="Total Budget"
          value={`$${(metrics.budget.total / 1000000).toFixed(1)}M`}
          subtitle={`Average: $${(metrics.budget.average / 1000).toFixed(0)}K per project`}
          trend="up"
          trendValue={8}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />

        <MetricCard
          title="Active Contractors"
          value={metrics.contractors.total}
          subtitle="Across all projects"
          trend="up"
          trendValue={5}
          icon={<Users className="w-6 h-6" />}
          color="purple"
        />

        <MetricCard
          title="Completion Rate"
          value={`${Math.round(metrics.projects.completionRate)}%`}
          subtitle="Projects completed on time"
          trend="up"
          trendValue={3}
          icon={<TrendingUp className="w-6 h-6" />}
          color="yellow"
        />
      </div>

      {/* Payment Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Payments Processed</span>
              <span className="font-semibold">${metrics.payments.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Payment Amount</span>
              <span className="font-semibold">${Math.round(metrics.payments.averageAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending Approvals</span>
              <span className="font-semibold text-yellow-600">{metrics.payments.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approved This Month</span>
              <span className="font-semibold text-green-600">{metrics.payments.approved}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Overall Utilization</span>
                <span className="font-semibold">{metrics.budget.utilization}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.budget.utilization}%` }}
                />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Allocated Budget</span>
                <span className="font-medium">${metrics.budget.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Remaining Budget</span>
                <span className="font-medium text-green-600">
                  ${((metrics.budget.total * (100 - metrics.budget.utilization)) / 100).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline Performance</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Performance charts coming soon</p>
            <p className="text-sm text-gray-400">Track project timelines and milestones</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;