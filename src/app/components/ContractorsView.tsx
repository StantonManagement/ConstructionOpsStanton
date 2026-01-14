'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Phone, Mail, CheckCircle, XCircle, AlertCircle, UserPlus, 
  ChevronRight, Building, Edit2, Trash2, MessageSquare, RefreshCw,
  Star, Shield, MoreVertical, X, HardHat
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency } from '@/lib/theme';
import VendorDetailView from './VendorDetailView';

interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone?: string;
  email?: string;
  status: string;
  performance_score?: number;
  created_at?: string;
  // Aggregated data
  total_contracts?: number;
  total_contract_value?: number;
  total_paid?: number;
  active_projects?: number;
}

interface ContractorsViewProps {
  searchQuery?: string;
}

// Form field interface
interface FormField {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}

// Contractor form fields
const contractorFields: FormField[] = [
  { name: 'name', label: 'Company Name', placeholder: 'Enter company name', required: true },
  { name: 'trade', label: 'Trade', placeholder: 'e.g., Electrical, Plumbing, HVAC', required: true },
  { name: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567', type: 'tel', defaultValue: '+1' },
  { name: 'email', label: 'Email', placeholder: 'contact@company.com', type: 'email' },
];

// Add/Edit Form Modal Component
const ContractorFormModal: React.FC<{
  title: string;
  initialData?: Partial<Contractor>;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}> = ({ title, initialData, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    contractorFields.forEach(field => {
      base[field.name] = initialData?.[field.name as keyof Contractor]?.toString() || field.defaultValue || '';
    });
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    contractorFields.forEach(field => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.type === 'email' && formData[field.name]?.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.name])) {
          newErrors[field.name] = 'Please enter a valid email address';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  const handleChange = (name: string, value: string) => {
    // Auto-format phone number
    if (name === 'phone') {
      if (!value.startsWith('+1')) {
        value = '+1' + value.replace(/[^\d]/g, '').replace(/^1*/, '');
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {contractorFields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={isLoading}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-foreground placeholder-muted-foreground ${
                  errors[field.name] ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors[field.name] && (
                <p className="text-destructive text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors[field.name]}
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Contractor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// SMS Contact Modal Component
const ContactModal: React.FC<{
  contractor: Contractor;
  onClose: () => void;
}> = ({ contractor, onClose }) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!contractor.phone || !message.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await sendSMS(contractor.phone, message);
      setStatus('success');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Contact {contractor.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!contractor.phone ? (
          <div className="text-center py-6">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No phone number on file for this contractor.</p>
            <p className="text-sm text-muted-foreground mt-1">Add a phone number to enable SMS messaging.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Sending to:</div>
              <div className="font-medium text-foreground">{contractor.phone}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                disabled={status === 'sending' || status === 'success'}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background text-foreground placeholder-muted-foreground resize-none"
              />
            </div>

            {status === 'error' && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {status === 'success' && (
              <div className="mb-4 p-3 bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg text-[var(--status-success-text)] text-sm">
                Message sent successfully!
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={status === 'sending'}
                className="flex-1 px-4 py-2.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={status === 'sending' || status === 'success' || !message.trim()}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'sending' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  contractor: Contractor;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}> = ({ contractor, onConfirm, onClose, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-destructive/10 rounded-full">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Delete Contractor</h2>
            <p className="text-sm text-muted-foreground">This action cannot be undone</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-foreground">
            Are you sure you want to delete <strong>{contractor.name}</strong>?
          </p>
          {(contractor.total_contracts || 0) > 0 && (
            <p className="text-sm text-destructive mt-2">
              Warning: This contractor has {contractor.total_contracts} project contract(s). 
              Deleting may affect project data.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ContractorsView: React.FC<ContractorsViewProps> = ({ searchQuery = '' }) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'trade' | 'total_paid' | 'performance_score'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [contactingContractor, setContactingContractor] = useState<Contractor | null>(null);
  const [deletingContractor, setDeletingContractor] = useState<Contractor | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync global search query with local search term
  useEffect(() => {
    if (searchQuery !== searchTerm) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Fetch contractors with aggregated payment data
  const fetchContractors = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Fetch all contractors
      const { data: contractorsData, error: contractorsError } = await supabase
        .from('contractors')
        .select('*')
        .order('name');

      if (contractorsError) throw contractorsError;

      // Fetch project_contractors for aggregation
      const { data: projectContractors, error: pcError } = await supabase
        .from('project_contractors')
        .select('contractor_id, contract_amount, paid_to_date, contract_status');

      if (pcError) throw pcError;

      // Aggregate data per contractor
      const aggregatedData = (contractorsData || []).map(contractor => {
        const contractorContracts = (projectContractors || []).filter(
          pc => pc.contractor_id === contractor.id
        );
        
        const totalContractValue = contractorContracts.reduce(
          (sum, pc) => sum + (parseFloat(pc.contract_amount) || 0), 0
        );
        const totalPaid = contractorContracts.reduce(
          (sum, pc) => sum + (parseFloat(pc.paid_to_date) || 0), 0
        );
        const activeProjects = contractorContracts.filter(
          pc => pc.contract_status === 'active'
        ).length;

        return {
          ...contractor,
          total_contracts: contractorContracts.length,
          total_contract_value: totalContractValue,
          total_paid: totalPaid,
          active_projects: activeProjects,
        };
      });

      setContractors(aggregatedData);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  // Extract unique trades for filter dropdown
  const uniqueTrades = useMemo(() => {
    return [...new Set(contractors.map(c => c.trade).filter(Boolean))].sort();
  }, [contractors]);

  // Filter and sort contractors
  const filteredContractors = useMemo(() => {
    return contractors
      .filter(c => 
        ((c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         (c.trade || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterTrade === '' || c.trade === filterTrade) &&
        (filterStatus === '' || c.status === filterStatus)
      )
      .sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;
        
        if (sortBy === 'total_paid' || sortBy === 'performance_score') {
          aVal = a[sortBy] || 0;
          bVal = b[sortBy] || 0;
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
  }, [contractors, searchTerm, filterTrade, filterStatus, sortBy, sortOrder]);

  // CRUD Handlers
  const handleAddContractor = async (formData: Record<string, string>) => {
    setFormLoading(true);
    try {
      const contractorData = {
        name: formData.name.trim(),
        trade: formData.trade.trim(),
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        status: 'active'
      };
      
      // Use API endpoint to bypass RLS
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/contractors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(contractorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contractor');
      }

      const result = await response.json();
      const data = result.contractor;
      
      // Add to local state with default aggregated values
      setContractors(prev => [...prev, {
        ...data,
        total_contracts: 0,
        total_contract_value: 0,
        total_paid: 0,
        active_projects: 0
      }]);
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding contractor:', error);
      alert(error instanceof Error ? error.message : 'Failed to add contractor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditContractor = async (formData: Record<string, string>) => {
    if (!editingContractor) return;
    setFormLoading(true);
    try {
      const contractorData = {
        name: formData.name.trim(),
        trade: formData.trade.trim(),
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
      };
      
      const { data, error } = await supabase
        .from('contractors')
        .update(contractorData)
        .eq('id', editingContractor.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setContractors(prev => prev.map(c => 
        c.id === editingContractor.id 
          ? { ...c, ...data }
          : c
      ));
      
      setEditingContractor(null);
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert(error instanceof Error ? error.message : 'Failed to update contractor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContractor = async () => {
    if (!deletingContractor) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', deletingContractor.id);
      
      if (error) throw error;
      
      // Remove from local state
      setContractors(prev => prev.filter(c => c.id !== deletingContractor.id));
      setDeletingContractor(null);
    } catch (error) {
      console.error('Error deleting contractor:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete contractor. It may have associated projects or payments.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (contractor: Contractor) => {
    const newStatus = contractor.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', contractor.id);
      
      if (error) throw error;
      
      setContractors(prev => prev.map(c => 
        c.id === contractor.id ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update contractor status');
    }
  };

  const handleContractorClick = (contractor: Contractor) => {
    setSelectedContractor(contractor);
  };

  const handleBackToList = () => {
    setSelectedContractor(null);
    fetchContractors(true);
  };

  // Render star rating
  const renderStarRating = (score: number | undefined) => {
    const rating = Math.round((score || 0) / 20); // Convert 0-100 to 0-5
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
        {score !== undefined && (
          <span className="ml-1 text-xs text-muted-foreground">({score})</span>
        )}
      </div>
    );
  };

  // Define columns before any early returns (React hooks rule)
  const columns = useMemo(() => [
    {
      header: 'Contractor',
      accessor: (row: Contractor) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {row.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {row.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.trade}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (row: Contractor) => (
        <SignalBadge status={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'critical' : 'warning'}>
          {row.status}
        </SignalBadge>
      )
    },
    {
      header: 'Rating',
      accessor: (row: Contractor) => renderStarRating(row.performance_score)
    },
    {
      header: 'Projects',
      accessor: (row: Contractor) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {row.active_projects || 0} active / {row.total_contracts || 0} total
          </span>
        </div>
      )
    },
    {
      header: 'Contract Value',
      accessor: (row: Contractor) => (
        <div className="text-sm font-medium text-foreground">
          {formatCurrency(row.total_contract_value || 0)}
        </div>
      ),
      align: 'right' as const
    },
    {
      header: 'Total Paid',
      accessor: (row: Contractor) => (
        <div className="text-sm font-semibold text-[var(--status-success-text)]">
          {formatCurrency(row.total_paid || 0)}
        </div>
      ),
      align: 'right' as const
    },
    {
      header: 'Contact',
      accessor: (row: Contractor) => (
        <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
          {row.phone && (
            <div className="flex items-center">
              <Phone className="w-3 h-3 mr-2" />
              <span className="text-xs">{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center">
              <Mail className="w-3 h-3 mr-2" />
              <span className="text-xs truncate max-w-[150px]">{row.email}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: (row: Contractor) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setContactingContractor(row)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            title="Send SMS"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingContractor(row)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingContractor(row)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-5 h-5 text-muted-foreground ml-1" />
        </div>
      ),
      align: 'right' as const
    }
  ], []);

  // If a contractor is selected, show the detail view
  if (selectedContractor) {
    return (
      <VendorDetailView
        contractor={selectedContractor}
        onBack={handleBackToList}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Empty state when no contractors exist
  if (contractors.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contractors</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage contractors and view payment history across all projects
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={HardHat}
            title="No contractors added"
            description="Add your subcontractors to start tracking payments and contracts. Contractors can be assigned to multiple projects."
            actionLabel="Add Contractor"
            onAction={() => setShowAddModal(true)}
          />
        </div>
        {/* Add Modal still needs to be accessible */}
        {showAddModal && (
          <ContractorFormModal
            title="Add New Contractor"
            onSubmit={handleAddContractor}
            onClose={() => setShowAddModal(false)}
            isLoading={formLoading}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contractors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage contractors and view payment history across all projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchContractors(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Contractor
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Contractors</div>
          <div className="text-2xl font-bold text-foreground">{contractors.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Contractors</div>
          <div className="text-2xl font-bold text-[var(--status-success-text)]">
            {contractors.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Contract Value</div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(contractors.reduce((sum, c) => sum + (c.total_contract_value || 0), 0))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-bold text-[var(--status-success-text)]">
            {formatCurrency(contractors.reduce((sum, c) => sum + (c.total_paid || 0), 0))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        {/* Search and Filters */}
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Contractor Directory</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredContractors.length} of {contractors.length} contractors
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative lg:col-span-2">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or trade..."
                className="pl-10 pr-4 py-2 w-full border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-background"
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
            >
              <option value="">All Trades</option>
              {uniqueTrades.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-background"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-foreground bg-background"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortOrder(order as 'asc' | 'desc');
              }}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="trade-asc">Trade A-Z</option>
              <option value="trade-desc">Trade Z-A</option>
              <option value="total_paid-desc">Highest Paid</option>
              <option value="total_paid-asc">Lowest Paid</option>
              <option value="performance_score-desc">Highest Rated</option>
              <option value="performance_score-asc">Lowest Rated</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <DataTable
            data={filteredContractors}
            columns={columns}
            onRowClick={handleContractorClick}
            emptyMessage="No contractors found. Add your first contractor to get started."
          />
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 p-4">
          {filteredContractors.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <div className="text-muted-foreground text-base mb-2">No contractors found</div>
              <div className="text-muted-foreground text-sm mb-4">
                {contractors.length === 0 
                  ? 'Add your first contractor to get started'
                  : 'Try adjusting your search or filter criteria'
                }
              </div>
              {contractors.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Contractor
                </button>
              )}
            </div>
          ) : (
            filteredContractors.map((contractor) => (
              <div 
                key={contractor.id}
                className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Header */}
                <div 
                  className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => handleContractorClick(contractor)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {contractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{contractor.name}</h3>
                      <p className="text-sm text-muted-foreground">{contractor.trade}</p>
                    </div>
                  </div>
                  <SignalBadge status={contractor.status === 'active' ? 'success' : 'critical'}>
                    {contractor.status}
                  </SignalBadge>
                </div>

                {/* Rating */}
                {contractor.performance_score !== undefined && (
                  <div className="mb-3">
                    {renderStarRating(contractor.performance_score)}
                  </div>
                )}

                {/* Stats */}
                <div 
                  className="grid grid-cols-2 gap-3 mb-3 cursor-pointer"
                  onClick={() => handleContractorClick(contractor)}
                >
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground">Projects</div>
                    <div className="text-sm font-semibold text-foreground">
                      {contractor.active_projects || 0} active / {contractor.total_contracts || 0} total
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground">Total Paid</div>
                    <div className="text-sm font-semibold text-[var(--status-success-text)]">
                      {formatCurrency(contractor.total_paid || 0)}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mb-3 space-y-1">
                  {contractor.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{contractor.phone}</span>
                    </div>
                  )}
                  {contractor.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{contractor.email}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleContractorClick(contractor)}
                    className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setContactingContractor(contractor)}
                    className="px-3 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingContractor(contractor)}
                    className="px-3 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingContractor(contractor)}
                    className="px-3 py-2 border border-destructive/50 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <ContractorFormModal
          title="Add New Contractor"
          onSubmit={handleAddContractor}
          onClose={() => setShowAddModal(false)}
          isLoading={formLoading}
        />
      )}

      {editingContractor && (
        <ContractorFormModal
          title="Edit Contractor"
          initialData={editingContractor}
          onSubmit={handleEditContractor}
          onClose={() => setEditingContractor(null)}
          isLoading={formLoading}
        />
      )}

      {contactingContractor && (
        <ContactModal
          contractor={contactingContractor}
          onClose={() => setContactingContractor(null)}
        />
      )}

      {deletingContractor && (
        <DeleteConfirmModal
          contractor={deletingContractor}
          onConfirm={handleDeleteContractor}
          onClose={() => setDeletingContractor(null)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
};

export default ContractorsView;
