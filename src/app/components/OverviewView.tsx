import React from 'react';
import { useData } from '../context/DataContext';
import ProjectCard from '../../components/ProjectCard';

const OverviewView: React.FC = () => {
    const { projects } = useData();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏗️ Active Projects ({projects.length})</h3>
                <div className="space-y-3">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-lg border shadow-sm p-4">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Decisions Queue</h3>
                 <p className="text-sm text-black">High-priority items needing attention.</p>
                 <p className="text-xs text-black mt-2">(Project cards now show a budget usage tracker.)</p>
                 {/* This would be populated from data */}
            </div>
        </div>
    );
};

export default OverviewView; 