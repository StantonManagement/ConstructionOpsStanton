import React, { useState, useMemo } from 'react';
import { Search, Filter, Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';

// --- AddForm copied from ManageView for reuse ---
interface AddFormField {
  name: string;
  placeholder: string;
  type?: string;
  validators?: ((value: string) => string | true)[];
  required?: boolean;
  defaultValue?: string;
}
interface AddFormProps {
  title: string;
  icon: React.ReactNode;
  fields: AddFormField[];
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  initialData?: Record<string, string>;
}
const AddForm = ({ title, icon, fields, onSubmit, onClose, isLoading = false, initialData }: AddFormProps) => {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const base = fields.reduce((acc: Record<string, string>, field: AddFormField) => {
      acc[field.name] = field.defaultValue || '';
      return acc;
    }, {});
    return { ...base, ...(initialData || {}) };
  });
  const [errors, setErrors] = useState<Record<string, string>>({} as Record<string, string>);
  const [touched, setTouched] = useState<Record<string, boolean>>({} as Record<string, boolean>);
  const validateField = (name: string, value: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';
    if (field.required && !value.trim()) return 'This field is required';
    if (field.validators) {
      for (const validator of field.validators) {
        const result = validator(value);
        if (result !== true) return result;
      }
    }
    return '';
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      let newValue = value;
      if (!newValue.startsWith('+1')) {
        newValue = '+1' + newValue.replace(/[^\d]/g, '').replace(/^1*/, '');
      }
      setFormData(prev => ({ ...prev, [name]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if ((errors as Record<string, string>)[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };
  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    fields.forEach((field: AddFormField) => {
      newTouched[field.name] = true;
      const error = validateField(field.name, formData[field.name] || '');
      if (error) newErrors[field.name] = error;
    });
    setTouched(newTouched);
    setErrors(newErrors);
    if (Object.values(newErrors).some(error => error !== '')) return;
    await onSubmit(formData);
  };
  const labelize = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <div className="bg-white rounded-xl p-6 w-full shadow-2xl max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">{icon}{title}</h3>
        <button onClick={onClose} className="text-black-500 hover:text-black-700 p-1 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-black mb-1.5">{labelize(field.name)}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-gray-50 text-black placeholder-gray-400 ${errors[field.name] && touched[field.name] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-blue-500'}`}
              placeholder={field.placeholder}
              disabled={isLoading}
            />
            {errors[field.name] && touched[field.name] && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors[field.name]}</p>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400 flex items-center gap-2">{isLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>) : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};
// --- End AddForm ---

const validators = {
  required: (value: string) => value.trim() !== '' || 'This field is required',
  email: (value: string) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address',
  phone: (value: string) => 
    /^[\+]?[-\s\-\(\)]?[\d\s\-\(\)]{10,}$/.test(value) || 'Please enter a valid phone number',
};

const vendorFields: AddFormField[] = [
  { name: 'name', placeholder: 'Vendor Name', required: true, validators: [validators.required] },
  { name: 'trade', placeholder: 'Trade', required: true, validators: [validators.required] },
  { name: 'phone', placeholder: 'Phone', type: 'tel', validators: [validators.phone], defaultValue: '+1' },
  { name: 'email', placeholder: 'Email', type: 'email', validators: [validators.email] },
];

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
    const { subcontractors, dispatch } = useData() as { subcontractors: Subcontractor[], dispatch: any };
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTrade, setFilterTrade] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'trade' | 'rating'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [modal, setModal] = useState<'add' | 'edit' | 'view' | null>(null);
    const [selectedSub, setSelectedSub] = useState<Subcontractor | null>(null);
    const [loading, setLoading] = useState(false);
    const [contactModal, setContactModal] = useState<Subcontractor | null>(null);
    const [contactMessage, setContactMessage] = useState('');
    const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [contactError, setContactError] = useState('');

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

    // Add Subcontractor handler
    const handleAddSubcontractor = async (formData: Record<string, string>) => {
      setLoading(true);
      try {
        const { name, trade, phone, email } = formData;
        const { data, error } = await supabase.from('contractors').insert([{ name, trade, phone, email }]).select().single();
        if (error) throw error;
        dispatch({ type: 'ADD_SUBCONTRACTOR', payload: data });
        setModal(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error) || 'Failed to add subcontractor');
      } finally {
        setLoading(false);
      }
    };
    // Edit Subcontractor handler
    const handleEditSubcontractor = async (formData: Record<string, string>) => {
      if (!selectedSub) return;
      setLoading(true);
      try {
        const { name, trade, phone, email } = formData;
        const { data, error } = await supabase.from('contractors').update({ name, trade, phone, email }).eq('id', selectedSub.id).select().single();
        if (error) throw error;
        dispatch({ type: 'UPDATE_SUBCONTRACTOR', payload: data });
        setModal(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error) || 'Failed to update subcontractor');
      } finally {
        setLoading(false);
      }
    };
    // View handler just sets selectedSub
    const handleView = (sub: Subcontractor) => {
      setSelectedSub(sub);
      setModal('view');
    };
    // Contact handler
    const handleContact = (sub: Subcontractor) => {
      setContactModal(sub);
      setContactMessage('');
      setContactStatus('idle');
      setContactError('');
    };
    const handleSendContact = async () => {
      if (!contactModal?.phone || !contactMessage.trim()) return;
      setContactStatus('sending');
      setContactError('');
      try {
        await sendSMS(contactModal.phone, contactMessage);
        setContactStatus('success');
      } catch (err) {
        setContactStatus('error');
        setContactError(err instanceof Error ? err.message : String(err));
      }
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
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2" onClick={() => { setSelectedSub(null); setModal('add'); }}>
                          <UserPlus className="w-4 h-4" /> Add Subcontractor
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
                                            <button className="text-blue-600 hover:text-blue-900 text-sm" onClick={() => handleView(sub)}>
                                                View
                                            </button>
                                            <button className="text-green-600 hover:text-green-900 text-sm" onClick={() => handleContact(sub)}>
                                                Contact
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900 text-sm" onClick={() => { setSelectedSub(sub); setModal('edit'); }}>
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
            {/* Add/Edit Modal */}
            {modal === 'add' && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <AddForm
                  title="Add Subcontractor"
                  icon={<UserPlus className="w-6 h-6 text-blue-600" />}
                  fields={vendorFields}
                  onSubmit={handleAddSubcontractor}
                  onClose={() => setModal(null)}
                  isLoading={loading}
                  initialData={{}}
                />
              </div>
            )}
            {modal === 'edit' && selectedSub && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <AddForm
                  title="Edit Subcontractor"
                  icon={<UserPlus className="w-6 h-6 text-blue-600" />}
                  fields={vendorFields}
                  onSubmit={handleEditSubcontractor}
                  onClose={() => setModal(null)}
                  isLoading={loading}
                  initialData={{
                    name: selectedSub.name || '',
                    trade: selectedSub.trade || '',
                    phone: selectedSub.phone || '',
                    email: selectedSub.email || '',
                  }}
                />
              </div>
            )}
            {/* View Modal */}
            {modal === 'view' && selectedSub && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 flex flex-col">
                  <button onClick={() => setModal(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"><XCircle className="w-6 h-6" /></button>
                  <h3 className="text-2xl font-bold text-blue-900 mb-4 text-center">Subcontractor Details</h3>
                  <div className="space-y-3 text-base text-gray-800">
                    <div><span className="font-semibold">Name:</span> {selectedSub.name}</div>
                    <div><span className="font-semibold">Trade:</span> {selectedSub.trade}</div>
                    <div><span className="font-semibold">Status:</span> <span className="capitalize px-2 py-1 rounded-full text-xs font-semibold ml-1
                      ${selectedSub.status === 'active' ? 'bg-green-100 text-green-800' : selectedSub.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                      {selectedSub.status}
                    </span></div>
                    <div><span className="font-semibold">Phone:</span> {selectedSub.phone || <span className="text-gray-400">N/A</span>}</div>
                    <div><span className="font-semibold">Email:</span> {selectedSub.email || <span className="text-gray-400">N/A</span>}</div>
                    <div><span className="font-semibold">Company:</span> {selectedSub.company || <span className="text-gray-400">N/A</span>}</div>
                  </div>
                  <div className="my-4 border-t border-gray-https://construction-ops-stanton.vercel.app/200" />
                  <div>
                    <div className="font-semibold text-gray-700 mb-2">Compliance</div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${selectedSub.compliance.insurance === 'valid' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm text-gray-700">Insurance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${selectedSub.compliance.license === 'valid' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm text-gray-700">License</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Contact Modal */}
            {contactModal && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Send SMS to {contactModal.name}</h3>
                    <button onClick={() => setContactModal(null)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6" /></button>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-neutral-700"
                      rows={4}
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={contactStatus === 'sending'}
                    />
                  </div>
                  {contactStatus === 'error' && (
                    <div className="text-red-600 text-sm mb-2">{contactError}</div>
                  )}
                  {contactStatus === 'success' && (
                    <div className="text-green-600 text-sm mb-2">Message sent successfully!</div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setContactModal(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={contactStatus === 'sending'}
                    >Cancel</button>
                    <button
                      onClick={handleSendContact}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={contactStatus === 'sending' || !contactMessage.trim()}
                    >{contactStatus === 'sending' ? 'Sending...' : 'Send SMS'}</button>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
};

export default SubcontractorsView;
import React from 'react';

const SubcontractorsView: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 text-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcontractors</h3>
      <p className="text-gray-600">Subcontractor management view coming soon...</p>
    </div>
  );
};

export default SubcontractorsView;
