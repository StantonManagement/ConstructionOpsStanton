import React from 'react';
import { useData } from '../context/DataContext';

const ComplianceView: React.FC = () => {
    const { projects } = useData();
    return (
         <div className="bg-white rounded-lg border shadow-sm p-6 text-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permit & Compliance Status</h3>
             <div className="space-y-4">
                 {projects.map((project) => (
                     <div key={project.id} className="border rounded-md p-4 text-gray-900">
                         <h4 className="font-semibold">{project.name}</h4>
                         <div className="mt-2 flex gap-4">
                             {Object.entries(project.permits ?? {}).map(([permit, status]) => (
                                 <div key={permit} className="text-sm text-gray-900">
                                     <span className="capitalize font-medium">{permit}: </span>
                                     <span className={`font-semibold ${status === 'approved' ? 'text-green-600' : 'text-orange-600'}`}>{status}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
}

export default ComplianceView; 