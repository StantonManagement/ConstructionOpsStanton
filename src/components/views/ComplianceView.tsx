import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '@/app/context/DataContext';

const ComplianceView: React.FC = () => {
    const { state } = useData();
    const [projects, setProjects] = useState<any[]>([]);

    // Mock compliance data structure
    const mockCompliance = {
        permits: { building: 'approved', electrical: 'pending', plumbing: 'approved' },
        inspections: { foundation: 'passed', framing: 'scheduled', final: 'not_started' },
        safety: { incidents: 0, lastAudit: '2024-01-15', nextAudit: '2024-04-15' }
    };

    useEffect(() => {
        // Add mock compliance data to projects
        const enhancedProjects = state.projects.map(project => ({
            ...project,
            ...mockCompliance
        }));
        setProjects(enhancedProjects);
    }, [state.projects]);

    const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
        const getStatusConfig = (status: string) => {
            switch (status) {
                case 'approved':
                case 'passed':
                    return { color: 'bg-green-100 text-green-800', icon: '✅' };
                case 'pending':
                case 'scheduled':
                    return { color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
                case 'rejected':
                case 'failed':
                    return { color: 'bg-red-100 text-red-800', icon: '❌' };
                default:
                    return { color: 'bg-gray-100 text-gray-800', icon: '➖' };
            }
        };

        const config = getStatusConfig(status);
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.icon} {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Compliance & Safety</h2>
                <p className="text-gray-600">Monitor permits, inspections, and safety requirements</p>
            </div>

            <div className="grid gap-6">
                {projects.map(project => {
                    return (
                        <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                                <span className="text-sm text-gray-500">{project.client_name}</span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
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

                                <div className="space-y-2">
                                    <h5 className="text-sm font-medium text-gray-700">Inspections:</h5>
                                    {Object.entries(project.inspections).length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">No inspections scheduled</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(project.inspections).map(([inspection, status]) => (
                                                <div key={inspection} className="flex items-center gap-1">
                                                    <span className="text-xs font-medium capitalize text-gray-700">{inspection}:</span>
                                                    <StatusBadge status={status} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h5 className="text-sm font-medium text-gray-700">Safety:</h5>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">Incidents:</span>
                                            <span className={`text-xs font-medium ${project.safety.incidents === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {project.safety.incidents}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">Last Audit:</span>
                                            <span className="text-xs text-gray-800">{project.safety.lastAudit}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">Next Audit:</span>
                                            <span className="text-xs text-gray-800">{project.safety.nextAudit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ComplianceView;