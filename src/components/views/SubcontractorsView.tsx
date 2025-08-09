import React, { useState, useMemo } from 'react';
import { Search, Filter, Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import { useData, Subcontractor } from '@/app/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';

// Define Subcontractor type locally since it's not in the main types
// interface Subcontractor {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   trade: string;
//   project_id?: string;
//   contract_amount?: number;
//   paid_to_date?: number;
//   status?: string;
// }

const SubcontractorsView: React.FC = () => {
  const { state } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Use contractors from state as subcontractors
  const subcontractors = useMemo(() => {
    return state.contractors.map(contractor => ({
      ...contractor,
      status: 'active' // Default status
    })) as Subcontractor[];
  }, [state.contractors]);

  const filteredSubcontractors = useMemo(() => {
    return subcontractors.filter(sub => {
      const name = sub.name || '';
      const trade = sub.trade || '';
      const email = sub.email || '';

      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTrade = filterTrade === 'all' || trade === filterTrade;
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;

      return matchesSearch && matchesTrade && matchesStatus;
    });
  }, [subcontractors, searchTerm, filterTrade, filterStatus]);

  const uniqueTrades = useMemo(() => {
    return Array.from(new Set(subcontractors.map(sub => sub.trade || 'Unknown').filter(trade => trade !== 'Unknown')));
  }, [subcontractors]);

  const handleSendMessage = async (subcontractor: Subcontractor) => {
    try {
      await sendSMS(subcontractor.phone, `Hello ${subcontractor.name}, please check your project updates.`);
      alert('Message sent successfully!');
    } catch (error) {
      alert('Failed to send message');
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Subcontractors</h2>
        <p className="text-gray-600">Manage your subcontractor network and communications</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Trades</option>
              {uniqueTrades.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subcontractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubcontractors.map((subcontractor) => (
          <div key={subcontractor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{subcontractor.name}</h3>
                <p className="text-sm text-gray-600">{subcontractor.trade}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(subcontractor.status)}
                <span className="text-xs text-gray-500 capitalize">{subcontractor.status}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <a href={`mailto:${subcontractor.email}`} className="hover:text-blue-600">
                  {subcontractor.email}
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                <a href={`tel:${subcontractor.phone}`} className="hover:text-blue-600">
                  {subcontractor.phone}
                </a>
              </div>
            </div>

            {subcontractor.contract_amount && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Contract Amount:</span>
                  <span className="font-medium">${subcontractor.contract_amount.toLocaleString()}</span>
                </div>
                {subcontractor.paid_to_date && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Paid to Date:</span>
                    <span className="font-medium">${subcontractor.paid_to_date.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => handleSendMessage(subcontractor)}
                className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Send Message
              </button>
              <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSubcontractors.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subcontractors found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default SubcontractorsView;