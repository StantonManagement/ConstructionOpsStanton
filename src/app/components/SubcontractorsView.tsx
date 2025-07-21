import React, { useState, useMemo } from 'react';
import { Search, Filter, Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

// Extend Subcontractor type to include missing properties
interface Subcontractor {
  id: number;
  name: string;
  trade: string;
  status: string;
  compliance: Record<string, string>;
  phone?: string;
  rating?: number;
  company?: string;
  email?: string;
}

const SubcontractorsView: React.FC = () => {
    const { subcontractors } = useData() as { subcontractors: Subcontractor[] };
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTrade, setFilterTrade] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'trade' | 'rating'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Extract unique trades for filter dropdown
    const uniqueTrades = useMemo(() => {
        return [...new Set(subcontractors.map(sub => sub.trade))];
    }, [subcontractors]);

    // Filter and sort subcontractors
    const filteredSubcontractors = useMemo(() => {
        return subcontractors
            .filter(sub => 
                sub.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (filterTrade === '' || sub.trade === filterTrade) &&
                (filterStatus === '' || sub.status === filterStatus)
            )
            .sort((a, b) => {
                let aVal: string | number = a[sortBy] ?? (sortBy === 'rating' ? 0 : '');
                let bVal: string | number = b[sortBy] ?? (sortBy === 'rating' ? 0 : '');
                
                if (sortBy === 'rating') {
                    aVal = a.rating || 0;
                    bVal = b.rating || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                
                if (sortOrder === 'asc') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            });
    }, [subcontractors, searchTerm, filterTrade, filterStatus, sortBy, sortOrder]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'inactive':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pending':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getComplianceScore = (compliance: any) => {
        const items = Object.values(compliance);
        const validItems = items.filter(item => item === 'valid').length;
        return Math.round((validItems / items.length) * 100);
    };

    const renderStarRating = (rating: number) => {
        return (
            <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
                <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-800">Subcontractor Directory</h3>
                        <p className="mt-1 text-sm text-neutral-600">
                            {filteredSubcontractors.length} of {subcontractors.length} subcontractors
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                            Add Subcontractor
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search subcontractors..."
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-700 placeholder-neutral-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-700"
                        value={filterTrade}
                        onChange={(e) => setFilterTrade(e.target.value)}
                    >
                        <option value="" className="text-neutral-700">All Trades</option>
                        {uniqueTrades.map(trade => (
                            <option key={trade} value={trade} className="text-neutral-700">{trade}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="" className="text-neutral-700">All Status</option>
                        <option value="active" className="text-neutral-700">Active</option>
                        <option value="inactive" className="text-neutral-700">Inactive</option>
                        <option value="pending" className="text-neutral-700">Pending</option>
                    </select>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-700"
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field as 'name' | 'trade' | 'rating');
                            setSortOrder(order as 'asc' | 'desc');
                        }}
                    >
                        <option value="name-asc" className="text-neutral-700">Name A-Z</option>
                        <option value="name-desc" className="text-neutral-700">Name Z-A</option>
                        <option value="trade-asc" className="text-neutral-700">Trade A-Z</option>
                        <option value="trade-desc" className="text-neutral-700">Trade Z-A</option>
                        <option value="rating-desc" className="text-neutral-700">Highest Rated</option>
                        <option value="rating-asc" className="text-neutral-700">Lowest Rated</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Subcontractor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Trade & Rating
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Compliance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSubcontractors.map((sub) => {
                            const complianceScore = getComplianceScore(sub.compliance);
                            
                            return (
                                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <span className="text-blue-800 font-medium text-sm">
                                                        {sub.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-neutral-800">{sub.name}</div>
                                                <div className="text-sm text-neutral-700">
                                                    {sub.company || 'Individual Contractor'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-neutral-800">{sub.trade}</div>
                                        {sub.rating && renderStarRating(sub.rating)}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {getStatusIcon(sub.status)}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                sub.status === 'active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : sub.status === 'inactive'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center text-xs">
                                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                                        sub.compliance.insurance === 'valid' ? 'bg-green-500' : 'bg-red-500'
                                                    }`}></span>
                                                    <span className="text-neutral-700">Insurance</span>
                                                </div>
                                                <div className="flex items-center text-xs">
                                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                                        sub.compliance.license === 'valid' ? 'bg-green-500' : 'bg-red-500'
                                                    }`}></span>
                                                    <span className="text-neutral-700">License</span>
                                                </div>
                                            </div>
                                            <div className="ml-3">
                                                <div className={`text-xs font-semibold ${
                                                    complianceScore >= 80 ? 'text-green-600' :
                                                    complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                    {complianceScore}%
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                                        <div className="flex flex-col space-y-1">
                                            {sub.phone && (
                                                <div className="flex items-center">
                                                    <Phone className="w-3 h-3 mr-2" />
                                                    <span className="text-xs">{sub.phone}</span>
                                                </div>
                                            )}
                                            {sub.email && (
                                                <div className="flex items-center">
                                                    <Mail className="w-3 h-3 mr-2" />
                                                    <span className="text-xs">{sub.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                View
                                            </button>
                                            <button className="text-green-600 hover:text-green-900 text-sm">
                                                Contact
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900 text-sm">
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {filteredSubcontractors.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-neutral-500 text-lg mb-2">No subcontractors found</div>
                        <div className="text-neutral-400 text-sm">
                            Try adjusting your search or filter criteria
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubcontractorsView;