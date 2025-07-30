
import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';

const MetricsView: React.FC = () => {
    const { projects } = useData();

    // Calculate comprehensive metrics
    const metrics = useMemo(() => {
        const totalProjects = projects.length;
        const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
        const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
        const remainingBudget = totalBudget - totalSpent;
        const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        
        // Project status analysis
        const activeProjects = projects.filter(p => p.status === 'active').length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const onHoldProjects = projects.filter(p => p.status === 'on_hold').length;
        
        // Budget risk analysis
        const overBudgetProjects = projects.filter(p => (Number(p.spent) || 0) > (Number(p.budget) || 0)).length;
        const nearBudgetProjects = projects.filter(p => {
            const spent = Number(p.spent) || 0;
            const budget = Number(p.budget) || 0;
            return budget > 0 && spent / budget >= 0.8 && spent <= budget;
        }).length;
        
        // Performance metrics
        const avgUtilization = projects.length > 0 
            ? projects.reduce((sum, p) => {
                const budget = Number(p.budget) || 0;
                const spent = Number(p.spent) || 0;
                return sum + (budget > 0 ? (spent / budget) * 100 : 0);
            }, 0) / projects.length 
            : 0;

        return {
            totalProjects,
            totalBudget,
            totalSpent,
            remainingBudget,
            utilizationRate,
            activeProjects,
            completedProjects,
            onHoldProjects,
            overBudgetProjects,
            nearBudgetProjects,
            avgUtilization
        };
    }, [projects]);

    // Helper component for metric cards
    const MetricCard: React.FC<{
        title: string;
        value: string | number;
        subtitle?: string;
        color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
        icon: string;
        trend?: { value: number; label: string };
    }> = ({ title, value, subtitle, color, icon, trend }) => {
        const colorClasses = {
            blue: 'bg-blue-50 border-blue-200 text-blue-900',
            green: 'bg-green-50 border-green-200 text-green-900',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
            red: 'bg-red-50 border-red-200 text-red-900',
            purple: 'bg-purple-50 border-purple-200 text-purple-900',
            gray: 'bg-gray-50 border-gray-200 text-gray-900'
        };

        return (
            <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${colorClasses[color]}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{icon}</span>
                    {trend && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            trend.value > 0 ? 'bg-green-100 text-green-700' : 
                            trend.value < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {trend.value > 0 ? '↗' : trend.value < 0 ? '↘' : '→'} {trend.label}
                        </span>
                    )}
                </div>
                <div className="text-2xl font-bold mb-1">{value}</div>
                <div className="text-sm font-medium opacity-75">{title}</div>
                {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
            </div>
        );
    };

    // Progress bar component
    const ProgressBar: React.FC<{
        percentage: number;
        color: 'blue' | 'green' | 'yellow' | 'red';
        height?: 'sm' | 'md' | 'lg';
    }> = ({ percentage, color, height = 'md' }) => {
        const heightClasses = {
            sm: 'h-2',
            md: 'h-3',
            lg: 'h-4'
        };
        
        const colorClasses = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            red: 'bg-red-500'
        };

        return (
            <div className={`w-full bg-gray-200 rounded-full ${heightClasses[height]} overflow-hidden`}>
                <div 
                    className={`${colorClasses[color]} ${heightClasses[height]} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Project Metrics & Analytics</h2>
                <p className="text-gray-600">Comprehensive overview of project performance and financial health</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Projects"
                    value={metrics.totalProjects}
                    subtitle={`${metrics.activeProjects} active`}
                    color="blue"
                    icon="🏗️"
                />
                <MetricCard
                    title="Total Budget"
                    value={`$${metrics.totalBudget.toLocaleString()}`}
                    subtitle="Across all projects"
                    color="green"
                    icon="💰"
                />
                <MetricCard
                    title="Total Spent"
                    value={`$${metrics.totalSpent.toLocaleString()}`}
                    subtitle={`${metrics.utilizationRate.toFixed(1)}% utilized`}
                    color="yellow"
                    icon="💸"
                />
                <MetricCard
                    title="Remaining Budget"
                    value={`$${metrics.remainingBudget.toLocaleString()}`}
                    subtitle={metrics.remainingBudget >= 0 ? "Available funds" : "Over budget"}
                    color={metrics.remainingBudget >= 0 ? "green" : "red"}
                    icon={metrics.remainingBudget >= 0 ? "✅" : "⚠️"}
                />
            </div>

            {/* Project Status & Risk Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Status Breakdown */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        📈 Project Status Breakdown
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Active Projects</span>
                            <span className="text-lg font-bold text-green-600">{metrics.activeProjects}</span>
                        </div>
                        <ProgressBar 
                            percentage={metrics.totalProjects > 0 ? (metrics.activeProjects / metrics.totalProjects) * 100 : 0} 
                            color="green" 
                        />
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Completed Projects</span>
                            <span className="text-lg font-bold text-blue-600">{metrics.completedProjects}</span>
                        </div>
                        <ProgressBar 
                            percentage={metrics.totalProjects > 0 ? (metrics.completedProjects / metrics.totalProjects) * 100 : 0} 
                            color="blue" 
                        />
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">On Hold Projects</span>
                            <span className="text-lg font-bold text-yellow-600">{metrics.onHoldProjects}</span>
                        </div>
                        <ProgressBar 
                            percentage={metrics.totalProjects > 0 ? (metrics.onHoldProjects / metrics.totalProjects) * 100 : 0} 
                            color="yellow" 
                        />
                    </div>
                </div>

                {/* Budget Risk Analysis */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        ⚠️ Budget Risk Analysis
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Over Budget</span>
                            <span className="text-lg font-bold text-red-600">{metrics.overBudgetProjects}</span>
                        </div>
                        <ProgressBar 
                            percentage={metrics.totalProjects > 0 ? (metrics.overBudgetProjects / metrics.totalProjects) * 100 : 0} 
                            color="red" 
                        />
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Near Budget (80%+)</span>
                            <span className="text-lg font-bold text-yellow-600">{metrics.nearBudgetProjects}</span>
                        </div>
                        <ProgressBar 
                            percentage={metrics.totalProjects > 0 ? (metrics.nearBudgetProjects / metrics.totalProjects) * 100 : 0} 
                            color="yellow" 
                        />
                        
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Average Budget Utilization</div>
                            <div className="text-xl font-bold text-gray-900">{metrics.avgUtilization.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Project Details */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    🏗️ Individual Project Performance
                </h3>
                {projects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl block mb-2">📊</span>
                        No projects available for analysis
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {projects.map((project) => {
                            const budget = Number(project.budget) || 0;
                            const spent = Number(project.spent) || 0;
                            const utilization = budget > 0 ? (spent / budget) * 100 : 0;
                            const remaining = budget - spent;
                            
                            const getStatusColor = () => {
                                if (spent > budget) return 'red';
                                if (utilization >= 80) return 'yellow';
                                return 'green';
                            };

                            const getStatusIcon = () => {
                                if (spent > budget) return '🚨';
                                if (utilization >= 80) return '⚠️';
                                return '✅';
                            };

                            return (
                                <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex-1">{project.name}</h4>
                                        <span className="text-lg ml-2">{getStatusIcon()}</span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Budget</span>
                                            <span className="font-medium">${budget.toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Spent</span>
                                            <span className="font-medium">${spent.toLocaleString()}</span>
                                        </div>
                                        
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Remaining</span>
                                            <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ${remaining.toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Utilization</span>
                                                <span>{utilization.toFixed(1)}%</span>
                                            </div>
                                            <ProgressBar 
                                                percentage={utilization} 
                                                color={getStatusColor()} 
                                                height="lg"
                                            />
                                        </div>
                                        
                                        {project.completion_date && (
                                            <div className="text-xs text-gray-500">
                                                Target completion: {new Date(project.completion_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricsView;
