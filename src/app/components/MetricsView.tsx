import React from 'react';
import { useData } from '../context/DataContext';

const MetricsView: React.FC = () => {
    const { projects } = useData();
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Financials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="border rounded-md p-4 text-gray-900">
                        <h4 className="font-semibold">{project.name}</h4>
                        <div className="mt-2">
                            <div className="flex justify-between text-sm text-gray-900">
                                <span>Budget</span>
                                <span>${Number(project.budget ?? 0).toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between text-sm text-gray-900"><span>Spent</span><span>${Number(project.spent ?? 0).toLocaleString()}</span></div>
                             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${(project.spent / project.budget) * 100}%`}}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MetricsView; 

