import React from 'react';
import { useData } from '../context/DataContext';

const SubcontractorsView: React.FC = () => {
    const { subcontractors } = useData();
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcontractor Directory</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compliance</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {subcontractors.map((sub) => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.trade}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{sub.status}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`mr-2 ${sub.compliance.insurance === 'valid' ? 'text-green-500' : 'text-red-500'}`}>●</span>Insurance
                                    <span className={`ml-4 mr-2 ${sub.compliance.license === 'valid' ? 'text-green-500' : 'text-red-500'}`}>●</span>License
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubcontractorsView; 