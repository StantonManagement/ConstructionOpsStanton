import React, { useState, useMemo } from 'react';
import { Search, Filter, Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import { useData, Subcontractor } from '../context/DataContext';
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
    <div className="bg-card rounded-xl p-6 w-full shadow-2xl max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">{icon}{title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-accent"><XCircle className="w-6 h-6" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{labelize(field.name)}{field.required && <span className="text-[var(--status-critical-text)] ml-1">*</span>}</label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-input text-foreground placeholder-muted-foreground ${errors[field.name] && touched[field.name] ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-border focus:border-primary'}`}
              placeholder={field.placeholder}
              disabled={isLoading}
            />
            {errors[field.name] && touched[field.name] && (
              <p className="text-[var(--status-critical-text)] text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors[field.name]}</p>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors duration-200">Cancel</button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:bg-primary/50 flex items-center gap-2">{isLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>) : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};
// --- End AddForm ---

const validators = {
  required: (value: string) => value.trim() !== '' || 'This field is required',
  email: (value: string) => {
    if (!value.trim()) return true; // Allow empty email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address';
  },
  phone: (value: string) => {
    if (!value.trim()) return true; // Allow empty phone
    return /^[\+]?[-\s\-\(\)]?[\d\s\-\(\)]{10,}$/.test(value) || 'Please enter a valid phone number';
  },
};

const vendorFields: AddFormField[] = [
  { name: 'name', placeholder: 'Vendor Name', required: true, validators: [validators.required] },
  { name: 'trade', placeholder: 'Trade', required: true, validators: [validators.required] },
  { name: 'phone', placeholder: 'Phone', type: 'tel', validators: [validators.phone], defaultValue: '+1' },
  { name: 'email', placeholder: 'Email (optional)', type: 'email', validators: [validators.email] },
];

interface SubcontractorsViewProps {
    searchQuery?: string;
}

const SubcontractorsView: React.FC<SubcontractorsViewProps> = ({ searchQuery = '' }) => {
    const { subcontractors, dispatch } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    // Sync global search query with local search term
    React.useEffect(() => {
        if (searchQuery !== searchTerm) {
            setSearchTerm(searchQuery);
        }
    }, [searchQuery]);
    const [filterTrade, setFilterTrade] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'trade' | 'performance_score'>('name');
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
                let aVal: string | number;
                let bVal: string | number;
                
                if (sortBy === 'performance_score') {
                    // Use performance_score as rating if available, otherwise 0
                    aVal = (a as any).performance_score || 0;
                    bVal = (b as any).performance_score || 0;
                } else {
                    aVal = String(a[sortBy] || '').toLowerCase();
                    bVal = String(b[sortBy] || '').toLowerCase();
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
                return <CheckCircle className="w-4 h-4 text-[var(--status-success-text)]" />;
            case 'inactive':
                return <XCircle className="w-4 h-4 text-[var(--status-critical-text)]" />;
            case 'pending':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
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
                        className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-muted-foreground'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">({rating}/5)</span>
            </div>
        );
    };

    // Add Subcontractor handler
    const handleAddSubcontractor = async (formData: Record<string, string>) => {
      setLoading(true);
      try {
        const { name, trade, phone, email } = formData;
        const contractorData = {
          name: name.trim(),
          trade: trade.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null
        };
        const { data, error } = await supabase.from('contractors').insert([contractorData]).select().single();
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
        const contractorData = {
          name: name.trim(),
          trade: trade.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null
        };
        const { data, error } = await supabase.from('contractors').update(contractorData).eq('id', selectedSub.id).select().single();
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
        <div className="bg-card rounded-lg border shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-800">Subcontractor Directory</h3>
                        <p className="mt-1 text-sm text-neutral-600">
                            {filteredSubcontractors.length} of {subcontractors.length} subcontractors
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2" onClick={() => { setSelectedSub(null); setModal('add'); }}>
                          <UserPlus className="w-4 h-4" /> Add Subcontractor
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search subcontractors..."
                            className="pl-10 pr-4 py-2 w-full border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-muted-foreground placeholder-neutral-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select
                        className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-muted-foreground"
                        value={filterTrade}
                        onChange={(e) => setFilterTrade(e.target.value)}
                    >
                        <option value="" className="text-muted-foreground">All Trades</option>
                        {uniqueTrades.map(trade => (
                            <option key={trade} value={trade} className="text-muted-foreground">{trade}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-muted-foreground"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="" className="text-muted-foreground">All Status</option>
                        <option value="active" className="text-muted-foreground">Active</option>
                        <option value="inactive" className="text-muted-foreground">Inactive</option>
                        <option value="pending" className="text-muted-foreground">Pending</option>
                    </select>

                    <select
                        className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-muted-foreground"
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field as 'name' | 'trade' | 'performance_score');
                            setSortOrder(order as 'asc' | 'desc');
                        }}
                    >
                        <option value="name-asc" className="text-muted-foreground">Name A-Z</option>
                        <option value="name-desc" className="text-muted-foreground">Name Z-A</option>
                        <option value="trade-asc" className="text-muted-foreground">Trade A-Z</option>
                        <option value="trade-desc" className="text-muted-foreground">Trade Z-A</option>
                        <option value="performance_score-desc" className="text-muted-foreground">Highest Rated</option>
                        <option value="performance_score-asc" className="text-muted-foreground">Lowest Rated</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-muted">
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
                    <tbody className="bg-card divide-y divide-gray-200">
                        {filteredSubcontractors.map((sub) => {
                            const complianceScore = getComplianceScore(sub.compliance);
                            
                            return (
                                <tr 
                                    key={sub.id} 
                                    className="hover:bg-primary/5 hover:shadow-sm hover:border-l-4 hover:border-l-primary transition-all duration-200 cursor-pointer group border-l-4 border-l-transparent"
                                    onClick={() => handleView(sub)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleView(sub);
                                        }
                                    }}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-primary font-medium text-sm">
                                                        {sub.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-neutral-800 group-hover:text-primary transition-colors">
                                                    {sub.name}
                                                    <span className="ml-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Click to view →
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {sub.trade}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-neutral-800">{sub.trade}</div>
                                        {(sub as any).performance_score && renderStarRating((sub as any).performance_score)}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {getStatusIcon(sub.status)}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                sub.status === 'active' 
                                                    ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' 
                                                    : sub.status === 'inactive'
                                                    ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]'
                                                    : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
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
                                                        sub.compliance.insurance === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'
                                                    }`}></span>
                                                    <span className="text-muted-foreground">Insurance</span>
                                                </div>
                                                <div className="flex items-center text-xs">
                                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                                        sub.compliance.license === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'
                                                    }`}></span>
                                                    <span className="text-muted-foreground">License</span>
                                                </div>
                                            </div>
                                            <div className="ml-3">
                                                <div className={`text-xs font-semibold ${
                                                    complianceScore >= 80 ? 'text-[var(--status-success-text)]' :
                                                    complianceScore >= 60 ? 'text-[var(--status-warning-text)]' : 'text-[var(--status-critical-text)]'
                                                }`}>
                                                    {complianceScore}%
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                                            <button 
                                                className="text-primary hover:text-primary text-sm" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(sub);
                                                }}
                                            >
                                                View
                                            </button>
                                            <button 
                                                className="text-[var(--status-success-text)] hover:text-[var(--status-success-text)] text-sm" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleContact(sub);
                                                }}
                                            >
                                                Contact
                                            </button>
                                            <button 
                                                className="text-muted-foreground hover:text-foreground text-sm" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSub(sub);
                                                    setModal('edit');
                                                }}
                                            >
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4 p-4">
                {filteredSubcontractors.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-muted-foreground text-base mb-2">No subcontractors found</div>
                        <div className="text-muted-foreground text-sm">
                            Try adjusting your search or filter criteria
                        </div>
                    </div>
                ) : (
                    filteredSubcontractors.map((sub) => {
                        const complianceScore = getComplianceScore(sub.compliance);
                        
                        return (
                            <div 
                                key={sub.id}
                                className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleView(sub)}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-medium text-sm">
                                                {sub.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground text-base">{sub.name}</h3>
                                            <p className="text-sm text-muted-foreground">{sub.trade}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(sub.status)}
                                        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                            sub.status === 'active' 
                                                ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' 
                                                : sub.status === 'inactive'
                                                ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]'
                                                : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                                        }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Rating */}
                                {(sub as any).performance_score && (
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <svg
                                                        key={star}
                                                        className={`w-4 h-4 ${star <= (sub as any).performance_score ? 'text-yellow-400' : 'text-muted-foreground'}`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                            <span className="text-sm text-muted-foreground">({(sub as any).performance_score}/5)</span>
                                        </div>
                                    </div>
                                )}

                                {/* Compliance */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center text-xs">
                                                <span className={`w-2 h-2 rounded-full mr-2 ${
                                                    sub.compliance.insurance === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'
                                                }`}></span>
                                                <span className="text-muted-foreground">Insurance</span>
                                            </div>
                                            <div className="flex items-center text-xs">
                                                <span className={`w-2 h-2 rounded-full mr-2 ${
                                                    sub.compliance.license === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'
                                                }`}></span>
                                                <span className="text-muted-foreground">License</span>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-semibold ${
                                            complianceScore >= 80 ? 'text-[var(--status-success-text)]' :
                                            complianceScore >= 60 ? 'text-[var(--status-warning-text)]' : 'text-[var(--status-critical-text)]'
                                        }`}>
                                            {complianceScore}%
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="mb-4">
                                    <div className="space-y-2">
                                        {sub.phone && (
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                                                <span>{sub.phone}</span>
                                            </div>
                                        )}
                                        {sub.email && (
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                                <span className="truncate">{sub.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button 
                                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleView(sub);
                                        }}
                                    >
                                        View Details
                                    </button>
                                    <button 
                                        className="flex-1 px-3 py-2 bg-[var(--status-success-text)] text-[var(--status-success-bg)] text-sm font-medium rounded-md hover:bg-[var(--status-success-text)]/90 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleContact(sub);
                                        }}
                                    >
                                        Contact
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {/* Add/Edit Modal */}
            {modal === 'add' && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <AddForm
                  title="Add Subcontractor"
                  icon={<UserPlus className="w-6 h-6 text-primary" />}
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
                  icon={<UserPlus className="w-6 h-6 text-primary" />}
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
                <div className="relative bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-border flex flex-col">
                  <button onClick={() => setModal(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-muted-foreground p-1 rounded-full hover:bg-secondary transition-colors"><XCircle className="w-6 h-6" /></button>
                  <h3 className="text-2xl font-bold text-primary mb-4 text-center">Subcontractor Details</h3>
                  <div className="space-y-3 text-base text-foreground">
                    <div><span className="font-semibold">Name:</span> {selectedSub.name}</div>
                    <div><span className="font-semibold">Trade:</span> {selectedSub.trade}</div>
                    <div><span className="font-semibold">Status:</span> <span className={`capitalize px-2 py-1 rounded-full text-xs font-semibold ml-1 ${
                      selectedSub.status === 'active' ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]' : 
                      selectedSub.status === 'inactive' ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]' : 
                      'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'
                    }`}>
                      {selectedSub.status}
                    </span></div>
                    <div><span className="font-semibold">Phone:</span> {selectedSub.phone || <span className="text-muted-foreground">N/A</span>}</div>
                    <div><span className="font-semibold">Email:</span> {selectedSub.email || <span className="text-muted-foreground">N/A</span>}</div>
                    <div><span className="font-semibold">Trade:</span> {selectedSub.trade}</div>
                  </div>
                  <div className="my-4 border-t border-border" />
                  <div>
                    <div className="font-semibold text-muted-foreground mb-2">Compliance</div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${selectedSub.compliance.insurance === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'}`}></span>
                        <span className="text-sm text-muted-foreground">Insurance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${selectedSub.compliance.license === 'valid' ? 'bg-[var(--status-success-text)]' : 'bg-[var(--status-critical-text)]'}`}></span>
                        <span className="text-sm text-muted-foreground">License</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Contact Modal */}
            {contactModal && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-card rounded-xl p-8 max-w-md w-full shadow-2xl border border-border">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-foreground">Send SMS to {contactModal.name}</h3>
                    <button onClick={() => setContactModal(null)} className="text-muted-foreground hover:text-muted-foreground p-1 rounded-full hover:bg-secondary"><XCircle className="w-6 h-6" /></button>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                    <textarea
                      className="w-full border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all text-muted-foreground"
                      rows={4}
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={contactStatus === 'sending'}
                    />
                  </div>
                  {contactStatus === 'error' && (
                    <div className="text-[var(--status-critical-text)] text-sm mb-2">{contactError}</div>
                  )}
                  {contactStatus === 'success' && (
                    <div className="text-[var(--status-success-text)] text-sm mb-2">Message sent successfully!</div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setContactModal(null)}
                      className="px-4 py-2 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                      disabled={contactStatus === 'sending'}
                    >Cancel</button>
                    <button
                      onClick={handleSendContact}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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