'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Phone, Mail, Building, DollarSign, FileText, Eye, ChevronDown, ChevronRight, RefreshCw, CheckCircle, Clock, AlertCircle, XCircle, Edit2, MessageSquare, Star, X, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';
import { useRouter } from 'next/navigation';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency, getPaymentApplicationStatus, formatDate } from '@/lib/theme';
import RemoveFromProjectModal from './RemoveFromProjectModal';

interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone?: string;
  email?: string;
  status: string;
  performance_score?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  contact_name?: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  address?: string;
}

interface ProjectContract {
  id: number;
  project_id: number;
  contractor_id: number;
  contract_amount: number;
  paid_to_date: number;
  contract_status: string;
  last_payment_date?: string;
  project?: Project;
}

interface PaymentApplication {
  id: number;
  project_id: number;
  contractor_id: number;
  status: string;
  current_period_amount?: number;
  current_period_value?: number;
  total_amount?: number;
  created_at: string;
  approved_at?: string;
  payment_period_end?: string;
  project?: Project;
}

interface VendorDetailViewProps {
  contractor: Contractor;
  onBack: () => void;
}

// Quick Edit Modal for contractor details
const QuickEditModal: React.FC<{
  contractor: Contractor;
  onSave: (data: Partial<Contractor>) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}> = ({ contractor, onSave, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    name: contractor.name || '',
    trade: contractor.trade || '',
    phone: contractor.phone || '',
    email: contractor.email || '',
    address: contractor.address || '',
    city: contractor.city || '',
    state: contractor.state || '',
    zip: contractor.zip || '',
    contact_name: contractor.contact_name || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Edit Contractor</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Company Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Trade *</label>
            <input
              type="text"
              value={formData.trade}
              onChange={(e) => setFormData(prev => ({ ...prev, trade: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="contact@company.com"
            />
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Address & Contact</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Zip</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Officer Name</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
                  placeholder="Officer / Contact Person"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-border text-muted-foreground rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Quick Contact Modal
const QuickContactModal: React.FC<{
  contractor: Contractor;
  onClose: () => void;
}> = ({ contractor, onClose }) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!contractor.phone || !message.trim()) return;
    setStatus('sending');
    try {
      await sendSMS(contractor.phone, message);
      setStatus('success');
      setTimeout(onClose, 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Send SMS</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        {!contractor.phone ? (
          <p className="text-muted-foreground py-4">No phone number on file.</p>
        ) : (
          <>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-muted-foreground">To: </span>
              <span className="font-medium text-foreground">{contractor.phone}</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              disabled={status === 'sending' || status === 'success'}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground resize-none mb-4"
            />
            {status === 'error' && <p className="text-destructive text-sm mb-4">{error}</p>}
            {status === 'success' && <p className="text-[var(--status-success-text)] text-sm mb-4">Message sent!</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-border text-muted-foreground rounded-lg hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={status === 'sending' || status === 'success' || !message.trim()}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'sending' ? 'Sending...' : <><Send className="w-4 h-4" /> Send</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const VendorDetailView: React.FC<VendorDetailViewProps> = ({ contractor: initialContractor, onBack }) => {
  const router = useRouter();
  const [contractor, setContractor] = useState<Contractor>(initialContractor);
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [paymentApps, setPaymentApps] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [contractToRemove, setContractToRemove] = useState<ProjectContract | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch all data for this contractor
  const fetchContractorData = async () => {
    setLoading(true);
    try {
      // Fetch all contracts for this contractor with project info
      const { data: contractsData, error: contractsError } = await supabase
        .from('project_contractors')
        .select(`
          *,
          projects:project_id (
            id, name, status, address
          )
        `)
        .eq('contractor_id', contractor.id)
        .order('contract_amount', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch all payment applications for this contractor
      const { data: paymentAppsData, error: paymentAppsError } = await supabase
        .from('payment_applications')
        .select(`
          *,
          projects:project_id (
            id, name, status
          )
        `)
        .eq('contractor_id', contractor.id)
        .order('created_at', { ascending: false });

      if (paymentAppsError) throw paymentAppsError;

      // Transform contracts data - handle the nested project object
      const transformedContracts = (contractsData || []).map(contract => ({
        ...contract,
        project: contract.projects
      }));

      // Transform payment apps data
      const transformedPaymentApps = (paymentAppsData || []).map(app => ({
        ...app,
        project: app.projects
      }));

      setContracts(transformedContracts);
      setPaymentApps(transformedPaymentApps);

      // Auto-expand projects with active contracts
      const activeProjectIds = new Set(
        transformedContracts
          .filter(c => c.contract_status === 'active')
          .map(c => c.project_id)
      );
      setExpandedProjects(activeProjectIds);

    } catch (error) {
      console.error('Error fetching contractor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractorData();
  }, [contractor.id]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalContractValue = contracts.reduce((sum, c) => sum + (parseFloat(String(c.contract_amount)) || 0), 0);
    const totalPaid = contracts.reduce((sum, c) => sum + (parseFloat(String(c.paid_to_date)) || 0), 0);
    const totalRemaining = totalContractValue - totalPaid;
    const activeContracts = contracts.filter(c => c.contract_status === 'active').length;
    
    const pendingPayments = paymentApps
      .filter(app => app.status === 'submitted')
      .reduce((sum, app) => sum + (app.current_period_amount || app.current_period_value || app.total_amount || 0), 0);

    return {
      totalContractValue,
      totalPaid,
      totalRemaining,
      activeContracts,
      totalContracts: contracts.length,
      pendingPayments,
    };
  }, [contracts, paymentApps]);

  // Group payment apps by project
  const paymentAppsByProject = useMemo(() => {
    const grouped: Record<number, PaymentApplication[]> = {};
    paymentApps.forEach(app => {
      if (!grouped[app.project_id]) {
        grouped[app.project_id] = [];
      }
      grouped[app.project_id].push(app);
    });
    return grouped;
  }, [paymentApps]);

  const toggleProjectExpanded = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-[var(--status-success-text)]" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-[var(--status-warning-text)]" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-[var(--status-critical-text)]" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleReviewPaymentApp = (appId: number) => {
    router.push(`/payments/${appId}/verify`);
  };

  const handleEditContractor = async (data: Partial<Contractor>) => {
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('contractors')
        .update({
          name: data.name,
          trade: data.trade,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          contact_name: data.contact_name || null,
        })
        .eq('id', contractor.id);

      if (error) throw error;

      setContractor(prev => ({ ...prev, ...data }));
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert('Failed to update contractor');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveFromProject = async () => {
    if (!contractToRemove) return;

    setIsRemoving(true);
    try {
      // Check for active payment applications
      const { data: paymentApps, error: checkError } = await supabase
        .from('payment_applications')
        .select('id, status')
        .eq('project_id', contractToRemove.project_id)
        .eq('contractor_id', contractor.id);

      if (checkError) throw checkError;

      // Check if there are any approved or pending payment applications
      const hasActivePayments = paymentApps && paymentApps.some(
        app => app.status === 'approved' || app.status === 'submitted' || app.status === 'pending'
      );

      if (hasActivePayments) {
        alert('Cannot remove contractor with active or approved payment applications. Please archive or reject them first.');
        setIsRemoving(false);
        return;
      }

      // Delete the contract from project_contractors
      const { error } = await supabase
        .from('project_contractors')
        .delete()
        .eq('id', contractToRemove.id);

      if (error) throw error;

      // Refresh the contracts list
      await fetchContractorData();
      setShowRemoveModal(false);
      setContractToRemove(null);
    } catch (error) {
      console.error('Error removing contractor from project:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove contractor from project');
    } finally {
      setIsRemoving(false);
    }
  };

  // Render star rating
  const renderStarRating = (score: number | undefined) => {
    const rating = Math.round((score || 0) / 20);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Contractors</span>
      </button>

      {/* Contractor Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xl">
                {contractor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{contractor.name}</h1>
              <p className="text-muted-foreground">{contractor.trade}</p>
              {contractor.performance_score !== undefined && (
                <div className="mt-1">
                  {renderStarRating(contractor.performance_score)}
                </div>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {contractor.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{contractor.phone}</span>
                  </div>
                )}
                {contractor.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span>{contractor.email}</span>
                  </div>
                )}
                {contractor.contact_name && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Officer:</span>
                    <span>{contractor.contact_name}</span>
                  </div>
                )}
                {contractor.address && (
                  <div className="w-full mt-1 flex items-start gap-1">
                    <Building className="w-4 h-4 mt-0.5" />
                    <span>
                      {contractor.address}
                      {contractor.city && `, ${contractor.city}`}
                      {contractor.state && `, ${contractor.state}`}
                      {contractor.zip && ` ${contractor.zip}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <button
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Contact
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <SignalBadge status={contractor.status === 'active' ? 'success' : 'critical'} size="lg">
              {contractor.status}
            </SignalBadge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Contract Value"
          value={formatCurrency(totals.totalContractValue)}
          padding="sm"
        />
        <MetricCard
          title="Total Paid"
          value={formatCurrency(totals.totalPaid)}
          status="success"
          padding="sm"
        />
        <MetricCard
          title="Remaining"
          value={formatCurrency(totals.totalRemaining)}
          status="warning"
          padding="sm"
        />
        <MetricCard
          title="Pending Approval"
          value={formatCurrency(totals.pendingPayments)}
          status={totals.pendingPayments > 0 ? 'warning' : 'neutral'}
          padding="sm"
        />
        <MetricCard
          title="Active Projects"
          value={`${totals.activeContracts} / ${totals.totalContracts}`}
          padding="sm"
        />
      </div>

      {/* Projects & Contracts Section */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Projects & Payment History</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {contracts.length} project{contracts.length !== 1 ? 's' : ''} • {paymentApps.length} payment application{paymentApps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={fetchContractorData}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No projects found for this contractor</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contracts.map((contract) => {
              const projectPaymentApps = paymentAppsByProject[contract.project_id] || [];
              const isExpanded = expandedProjects.has(contract.project_id);
              const contractAmount = parseFloat(String(contract.contract_amount)) || 0;
              const paidToDate = parseFloat(String(contract.paid_to_date)) || 0;
              const remaining = contractAmount - paidToDate;
              const percentComplete = contractAmount > 0 ? (paidToDate / contractAmount) * 100 : 0;

              return (
                <div key={contract.id} className="bg-card">
                  {/* Project Header - Clickable to expand */}
                  <div
                    className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleProjectExpanded(contract.project_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {contract.project?.name || `Project #${contract.project_id}`}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <SignalBadge 
                              status={contract.contract_status === 'active' ? 'success' : contract.contract_status === 'completed' ? 'neutral' : 'warning'}
                              size="sm"
                            >
                              {contract.contract_status}
                            </SignalBadge>
                            <span className="text-xs text-muted-foreground">
                              {projectPaymentApps.length} payment app{projectPaymentApps.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contract Summary */}
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground">Contract</div>
                          <div className="font-semibold text-foreground">{formatCurrency(contractAmount)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Paid</div>
                          <div className="font-semibold text-[var(--status-success-text)]">{formatCurrency(paidToDate)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="font-semibold text-[var(--status-warning-text)]">{formatCurrency(remaining)}</div>
                        </div>
                        <div className="w-24">
                          <div className="text-xs text-muted-foreground mb-1">{percentComplete.toFixed(0)}% paid</div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[var(--status-success-text)] rounded-full transition-all"
                              style={{ width: `${Math.min(percentComplete, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Contract Summary */}
                    <div className="sm:hidden mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Contract</div>
                        <div className="font-semibold text-foreground">{formatCurrency(contractAmount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="font-semibold text-[var(--status-success-text)]">{formatCurrency(paidToDate)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Remaining</div>
                        <div className="font-semibold text-[var(--status-warning-text)]">{formatCurrency(remaining)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payment Applications */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-muted/30">
                      <div className="pl-11">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3 pt-2">
                          Payment Applications
                        </h4>
                        
                        {projectPaymentApps.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-4 text-center bg-card rounded-lg border border-border">
                            No payment applications yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {projectPaymentApps.map((app) => {
                              const amount = app.current_period_amount || app.current_period_value || app.total_amount || 0;
                              
                              return (
                                <div
                                  key={app.id}
                                  className="flex items-center justify-between bg-card rounded-lg border border-border p-3 hover:shadow-sm transition-shadow"
                                >
                                  <div className="flex items-center gap-3">
                                    {getStatusIcon(app.status)}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                          #{app.id}
                                        </span>
                                        <SignalBadge status={getPaymentApplicationStatus(app.status)} size="sm">
                                          {app.status.replace(/_/g, ' ')}
                                        </SignalBadge>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {formatDate(app.created_at)}
                                        {app.approved_at && ` • Approved ${formatDate(app.approved_at)}`}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-foreground">
                                        {formatCurrency(amount)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReviewPaymentApp(app.id);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    >
                                      <Eye className="w-3 h-3" />
                                      View
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Remove from Project Button */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContractToRemove(contract);
                              setShowRemoveModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove from Project</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Payment Applications Summary Table */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">All Payment Applications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete payment history across all projects
          </p>
        </div>

        {paymentApps.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No payment applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paymentApps.map((app) => {
                  const amount = app.current_period_amount || app.current_period_value || app.total_amount || 0;
                  
                  return (
                    <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        #{app.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {app.project?.name || `Project #${app.project_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SignalBadge status={getPaymentApplicationStatus(app.status)} size="sm">
                          {app.status.replace(/_/g, ' ')}
                        </SignalBadge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-foreground">
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleReviewPaymentApp(app.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Summary Footer */}
        {paymentApps.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Applications:</span>
                <span className="ml-2 font-semibold text-foreground">{paymentApps.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Approved/Paid:</span>
                <span className="ml-2 font-semibold text-[var(--status-success-text)]">
                  {formatCurrency(
                    paymentApps
                      .filter(app => app.status === 'approved' || app.status === 'paid')
                      .reduce((sum, app) => sum + (app.current_period_amount || app.current_period_value || app.total_amount || 0), 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending:</span>
                <span className="ml-2 font-semibold text-[var(--status-warning-text)]">
                  {formatCurrency(
                    paymentApps
                      .filter(app => app.status === 'submitted')
                      .reduce((sum, app) => sum + (app.current_period_amount || app.current_period_value || app.total_amount || 0), 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Rejected:</span>
                <span className="ml-2 font-semibold text-[var(--status-critical-text)]">
                  {formatCurrency(
                    paymentApps
                      .filter(app => app.status === 'rejected')
                      .reduce((sum, app) => sum + (app.current_period_amount || app.current_period_value || app.total_amount || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <QuickEditModal
          contractor={contractor}
          onSave={handleEditContractor}
          onClose={() => setShowEditModal(false)}
          isLoading={editLoading}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <QuickContactModal
          contractor={contractor}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* Remove from Project Modal */}
      {showRemoveModal && contractToRemove && (
        <RemoveFromProjectModal
          contractorName={contractor.name}
          projectName={contractToRemove.project?.name || `Project #${contractToRemove.project_id}`}
          contractAmount={contractToRemove.contract_amount}
          onConfirm={handleRemoveFromProject}
          onCancel={() => {
            setShowRemoveModal(false);
            setContractToRemove(null);
          }}
          isLoading={isRemoving}
        />
      )}
    </div>
  );
};

export default VendorDetailView;

