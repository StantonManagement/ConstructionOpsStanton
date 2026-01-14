import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';

const ComplianceView: React.FC = () => {
    const { projects } = useData();

    // Calculate compliance metrics
    const complianceMetrics = useMemo(() => {
        let totalItems = 0;
        let validItems = 0;
        let expiredItems = 0;
        let pendingItems = 0;

        const permitTypes = new Set<string>();
        const projectCompliance: Array<{
            id: number;
            name: string;
            permits: Record<string, string>;
            complianceScore: number;
            status: 'excellent' | 'good' | 'warning' | 'critical';
        }> = [];

        projects.forEach(project => {
            const permits = project.permits || {};
            const permitEntries = Object.entries(permits);

            permitEntries.forEach(([type, status]) => {
                permitTypes.add(type);
                totalItems++;

                switch (status) {
                    case 'approved':
                    case 'valid':
                        validItems++;
                        break;
                    case 'expired':
                        expiredItems++;
                        break;
                    case 'pending':
                        pendingItems++;
                        break;
                }
            });

            const projectValidItems = permitEntries.filter(([, status]) => status === 'approved' || status === 'valid').length;
            const complianceScore = permitEntries.length > 0 ? (projectValidItems / permitEntries.length) * 100 : 0;

            let status: 'excellent' | 'good' | 'warning' | 'critical';
            if (complianceScore >= 90) status = 'excellent';
            else if (complianceScore >= 75) status = 'good';
            else if (complianceScore >= 50) status = 'warning';
            else status = 'critical';

            projectCompliance.push({
                id: project.id,
                name: project.name,
                permits,
                complianceScore,
                status
            });
        });

        const overallCompliance = totalItems > 0 ? (validItems / totalItems) * 100 : 0;

        return {
            totalItems,
            validItems,
            expiredItems,
            pendingItems,
            overallCompliance,
            permitTypes: Array.from(permitTypes),
            projectCompliance
        };
    }, [projects]);

    // Helper component for metric cards
    const ComplianceCard: React.FC<{
        title: string;
        value: string | number;
        subtitle?: string;
        color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
        icon: string;
    }> = ({ title, value, subtitle, color, icon }) => {
        const colorClasses = {
            blue: 'bg-primary/10 border-primary/20 text-primary',
            green: 'bg-green-50 border-green-200 text-green-900',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
            red: 'bg-red-50 border-red-200 text-red-900',
            purple: 'bg-purple-50 border-purple-200 text-purple-900',
            gray: 'bg-muted border-border text-foreground'
        };

        return (
            <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${colorClasses[color]}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{icon}</span>
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
            blue: 'bg-primary',
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            red: 'bg-red-500'
        };

        return (
            <div className={`w-full bg-muted rounded-full ${heightClasses[height]} overflow-hidden`}>
                <div 
                    className={`${colorClasses[color]} ${heightClasses[height]} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        );
    };

    // Status badge component
    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const getStatusStyles = () => {
            switch (status) {
                case 'approved':
                case 'valid':
                    return 'bg-green-100 text-green-800 border-green-200';
                case 'expired':
                    return 'bg-red-100 text-red-800 border-red-200';
                case 'pending':
                    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                default:
                    return 'bg-secondary text-secondary-foreground border-border';
            }
        };

        const getStatusIcon = () => {
            switch (status) {
                case 'approved':
                case 'valid':
                    return '✅';
                case 'expired':
                    return '❌';
                case 'pending':
                    return '⏳';
                default:
                    return '❓';
            }
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusStyles()}`}>
                <span>{getStatusIcon()}</span>
                <span className="capitalize">{status}</span>
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">🛡️ Permit & Compliance Dashboard</h2>
                <p className="text-muted-foreground">Monitor project compliance status and permit requirements</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ComplianceCard
                    title="Overall Compliance"
                    value={`${complianceMetrics.overallCompliance.toFixed(1)}%`}
                    subtitle={`${complianceMetrics.validItems} of ${complianceMetrics.totalItems} items valid`}
                    color={complianceMetrics.overallCompliance >= 90 ? "green" : complianceMetrics.overallCompliance >= 75 ? "yellow" : "red"}
                    icon="📊"
                />
                <ComplianceCard
                    title="Valid Permits"
                    value={complianceMetrics.validItems}
                    subtitle="Currently approved"
                    color="green"
                    icon="✅"
                />
                <ComplianceCard
                    title="Expired Items"
                    value={complianceMetrics.expiredItems}
                    subtitle="Require renewal"
                    color="red"
                    icon="⚠️"
                />
                <ComplianceCard
                    title="Pending Approvals"
                    value={complianceMetrics.pendingItems}
                    subtitle="Awaiting review"
                    color="yellow"
                    icon="⏳"
                />
            </div>

            {/* Compliance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Permit Type Breakdown */}
                <div className="bg-card rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        📋 Permit Types Overview
                    </h3>
                    {complianceMetrics.permitTypes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl block mb-2">📄</span>
                            No permits configured yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {complianceMetrics.permitTypes.map(permitType => {
                                const typeCount = complianceMetrics.projectCompliance.reduce((count, project) => {
                                    return count + (project.permits[permitType] ? 1 : 0);
                                }, 0);
                                const validCount = complianceMetrics.projectCompliance.reduce((count, project) => {
                                    const status = project.permits[permitType];
                                    return count + (status === 'approved' || status === 'valid' ? 1 : 0);
                                }, 0);
                                const percentage = typeCount > 0 ? (validCount / typeCount) * 100 : 0;

                                return (
                                    <div key={permitType} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700 capitalize">{permitType}</span>
                                            <span className="text-sm text-muted-foreground">{validCount}/{typeCount}</span>
                                        </div>
                                        <ProgressBar 
                                            percentage={percentage} 
                                            color={percentage >= 90 ? "green" : percentage >= 50 ? "yellow" : "red"} 
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Compliance Status Distribution */}
                <div className="bg-card rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        🎯 Project Compliance Status
                    </h3>
                    <div className="space-y-4">
                        {['excellent', 'good', 'warning', 'critical'].map((status) => {
                            const count = complianceMetrics.projectCompliance.filter(p => p.status === status).length;
                            const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                            const colors = {
                                excellent: 'green',
                                good: 'blue',
                                warning: 'yellow',
                                critical: 'red'
                            } as const;
                            const labels = {
                                excellent: 'Excellent (90%+)',
                                good: 'Good (75-89%)',
                                warning: 'Warning (50-74%)',
                                critical: 'Critical (<50%)'
                            } as const;

                            return (
                                <div key={status} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">{labels[status as keyof typeof labels]}</span>
                                        <span className="text-lg font-bold">{count}</span>
                                    </div>
                                    <ProgressBar 
                                        percentage={percentage} 
                                        color={colors[status as keyof typeof colors]} 
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Individual Project Compliance */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                    🏗️ Project-by-Project Compliance
                </h3>
                {complianceMetrics.projectCompliance.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl block mb-2">🏗️</span>
                        No projects with compliance data available
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {complianceMetrics.projectCompliance.map((project) => {
                            const getProjectStatusColor = () => {
                                switch (project.status) {
                                    case 'excellent': return 'border-green-200 bg-green-50';
                                    case 'good': return 'border-blue-200 bg-primary/10';
                                    case 'warning': return 'border-yellow-200 bg-yellow-50';
                                    case 'critical': return 'border-red-200 bg-red-50';
                                    default: return 'border-gray-200 bg-gray-50';
                                }
                            };

                            const getProjectStatusIcon = () => {
                                switch (project.status) {
                                    case 'excellent': return '🌟';
                                    case 'good': return '✅';
                                    case 'warning': return '⚠️';
                                    case 'critical': return '🚨';
                                    default: return '❓';
                                }
                            };

                            return (
                                <div key={project.id} className={`border rounded-lg p-4 hover:shadow-md transition-all ${getProjectStatusColor()}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-foreground flex-1">{project.name}</h4>
                                        <span className="text-lg ml-2">{getProjectStatusIcon()}</span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>Compliance Score</span>
                                            <span>{project.complianceScore.toFixed(1)}%</span>
                                        </div>
                                        <ProgressBar 
                                            percentage={project.complianceScore} 
                                            color={project.complianceScore >= 90 ? "green" : project.complianceScore >= 75 ? "blue" : project.complianceScore >= 50 ? "yellow" : "red"} 
                                            height="lg"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-gray-700">Permit Status:</h5>
                                        {Object.entries(project.permits).length === 0 ? (
                                            <p className="text-xs text-gray-500 italic">No permits configured</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(project.permits).map(([permit, status]) => (
                                                    <div key={permit} className="flex items-center gap-1">
                                                        <span className="text-xs font-medium capitalize text-gray-700">{permit}:</span>
                                                        <StatusBadge status={status} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Action Items */}
            {(complianceMetrics.expiredItems > 0 || complianceMetrics.pendingItems > 0) && (
                <div className="bg-card rounded-lg border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        📋 Action Items Required
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {complianceMetrics.expiredItems > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-red-600">🚨</span>
                                    <h4 className="font-semibold text-red-900">Expired Permits</h4>
                                </div>
                                <p className="text-sm text-red-700">
                                    {complianceMetrics.expiredItems} permit{complianceMetrics.expiredItems !== 1 ? 's' : ''} require immediate renewal
                                </p>
                            </div>
                        )}
                        {complianceMetrics.pendingItems > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-yellow-600">⏳</span>
                                    <h4 className="font-semibold text-yellow-900">Pending Approvals</h4>
                                </div>
                                <p className="text-sm text-yellow-700">
                                    {complianceMetrics.pendingItems} permit{complianceMetrics.pendingItems !== 1 ? 's' : ''} awaiting approval
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceView;