import React, { useState, useEffect } from 'react';
import { Project } from '@/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/theme';

type Props = {
  selectedProject: Project;
  setSelectedProject: (project: Project | null) => void;
};

type ContractWithVendor = {
  id: number;
  contract_amount: number;
  start_date: string;
  end_date: string;
  subcontractor_id: number;
  contractors: {
    id: number;
    name: string;
    trade: string;
    phone?: string;
  };
};

// Enhanced Components
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  </div>
);

const ProjectHeader: React.FC<{
  project: Project;
  onBack: () => void;
}> = ({ project, onBack }) => {
  const router = useRouter();
  
  const handleBackToProjects = () => {
    const params = new URLSearchParams();
    params.set('tab', 'projects');
    router.replace(`/?${params.toString()}`, { scroll: false });
  };
  
  return (
  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Payment Applications</h2>
        <div className="flex items-center space-x-3 text-primary/80">
          <span className="text-xl">🏗️</span>
          <span className="text-lg font-medium">{project.name}</span>
        </div>
        {project.client_name && (
          <div className="flex items-center space-x-2 mt-2 text-primary/60">
            <span className="text-sm">Client:</span>
            <span className="text-sm font-medium">{project.client_name}</span>
          </div>
        )}
      </div>
      <button
        onClick={handleBackToProjects}
        className="bg-card/20 hover:bg-card/30 backdrop-blur-sm px-4 py-2 rounded-lg text-card-foreground font-medium transition-all duration-200 flex items-center space-x-2"
      >
        <span>←</span>
        <span>Back to Projects</span>
      </button>
    </div>
  </div>
  );
};

const ContractorCard: React.FC<{
  contract: ContractWithVendor;
  isSelected: boolean;
  onToggle: (id: number) => void;
}> = ({ contract, isSelected, onToggle }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTradeIcon = (trade: string) => {
    const icons: { [key: string]: string } = {
      'electrical': '⚡',
      'plumbing': '🔧',
      'hvac': '🌡️',
      'carpentry': '🔨',
      'painting': '🎨',
      'roofing': '🏠',
      'concrete': '🏗️',
      'landscaping': '🌿',
      'flooring': '📏',
      'general': '👷'
    };
    return icons[trade.toLowerCase()] || '🔧';
  };

  return (
    <div
      className={`relative bg-card border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${
        isSelected
          ? 'border-primary shadow-lg shadow-blue-500/25 bg-gradient-to-br from-blue-50 to-white'
          : 'border-border shadow-sm hover:border-border hover:shadow-md'
      }`}
      onClick={() => onToggle(contract.subcontractor_id)}
    >
      {/* Selection Indicator */}
      <div className="absolute top-4 right-4">
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? 'bg-primary border-primary'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          {isSelected && (
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">
          {getTradeIcon(contract.contractors.trade)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-lg mb-1">
            {contract.contractors.name}
          </h4>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {contract.contractors.trade}
            </span>
            {contract.contractors.phone && (
              <span className="text-xs text-gray-500">📞 {contract.contractors.phone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contract Details */}
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(contract.contract_amount)}
            </div>
            <div className="text-xs text-gray-500 font-medium">Contract Amount</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(contract.start_date)}
            </div>
            <div className="text-xs text-gray-500">Start Date</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {formatDate(contract.end_date)}
            </div>
            <div className="text-xs text-gray-500">End Date</div>
          </div>
        </div>
      </div>

      {/* Selection Badge */}
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold">✓</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionBar: React.FC<{
  selectedCount: number;
  onCancel: () => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
  success: string | null;
  router: any;
}> = ({ selectedCount, onCancel, onSend, sending, error, success, router }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
    {/* Status Messages */}
    {error && (
      <div className="mb-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-red-600">⚠️</span>
          </div>
          <span className="text-red-900 font-medium">{error}</span>
        </div>
      </div>
    )}
    
    {success && (
      <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-green-600">✅</span>
          </div>
          <span className="text-green-900 font-medium">{success}</span>
        </div>
      </div>
    )}

    {/* Action Summary */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedCount > 0 ? 'Ready to Send Pay Applications' : 'Select Contractors'}
        </h3>
        <p className="text-gray-600 text-sm">
          {selectedCount > 0 
            ? `${selectedCount} contractor${selectedCount > 1 ? 's' : ''} selected`
            : 'Choose contractors to send payment requests to'
          }
        </p>
      </div>
      {selectedCount > 0 && (
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-medium">
          {selectedCount} Selected
        </div>
      )}
    </div>

    {/* Action Buttons */}
    <div className="flex items-center gap-4">
      <button
        onClick={() => {
          const params = new URLSearchParams();
          params.set('tab', 'projects');
          router.replace(`/?${params.toString()}`, { scroll: false });
        }}
        disabled={sending}
        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        onClick={onSend}
        disabled={selectedCount === 0 || sending}
        className="flex-2 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {sending ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Sending Requests...</span>
          </>
        ) : (
          <>
            <span>📧</span>
            <span>Send Payment Requests {selectedCount > 0 && `(${selectedCount})`}</span>
          </>
        )}
      </button>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📋</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contracts Found</h3>
      <p className="text-gray-600 mb-4">
        No contracts are available for this project yet.
      </p>
      <p className="text-sm text-gray-500">
        Add contracts to this project to create payment applications.
      </p>
    </div>
  </div>
);

const SubcontractorSelectionView: React.FC<Props> = ({ selectedProject, setSelectedProject }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contracts, setContracts] = useState<ContractWithVendor[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    queueMicrotask(() => setLoading(true));
    supabase
      .from('contracts')
      .select('id, contract_amount, start_date, end_date, subcontractor_id, contractors(id, name, trade, phone)')
      .eq('project_id', selectedProject.id)
      .then(({ data }) => {
        const fixed = (data || []).map((c) => ({
          ...c,
          contractors: Array.isArray(c.contractors) ? c.contractors[0] : c.contractors,
        }) as unknown as ContractWithVendor);
        setContracts(fixed);
        setLoading(false);
      });
  }, [selectedProject]);

  const handleSubSelection = (subId: number) => {
    setSelectedSubs((prev) =>
      prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubs.length === contracts.length) {
      setSelectedSubs([]);
    } else {
      setSelectedSubs(contracts.map(c => c.subcontractor_id));
    }
  };

  const handleSendPaymentRequests = async () => {
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      console.log('Sending payment requests:', { projectId: selectedProject.id, contractorIds: selectedSubs });
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          contractorIds: selectedSubs,
        }),
      });
      const data = await res.json();
      console.log('Payment requests response:', res.status, data);
      if (!res.ok || data.error) {
        setSendError(data.error || 'Failed to send payment requests.');
      } else {
        // Count successful sends
        const successCount = data.results?.filter((r: any) => r.status === 'sms_sent').length || selectedSubs.length;
        const errorCount = data.results?.filter((r: any) => r.error).length || 0;
        
        let successMessage = `Payment requests sent successfully to ${successCount} contractor${successCount > 1 ? 's' : ''}!`;
        if (errorCount > 0) {
          successMessage += ` (${errorCount} failed to send)`;
        }
        
        setSendSuccess(successMessage);
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          const params = new URLSearchParams();
          params.set('tab', 'projects');
          router.replace(`/?${params.toString()}`, { scroll: false });
        }, 3000);
      }
    } catch (e) {
      console.error('Network or fetch error:', e);
      setSendError('Network error. Please try again.');
    }
    setSending(false);
  };

  if (sendSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        {/* Success Animation */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
            <span className="text-4xl text-white">✅</span>
          </div>
          <div className="absolute -inset-2 bg-green-200 rounded-full animate-ping opacity-20"></div>
        </div>
        
        {/* Success Message */}
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-green-700 mb-3">Payment Requests Sent!</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">{sendSuccess}</p>
            <p className="text-green-600 text-sm mt-2">
              Contractors will receive SMS notifications with links to submit their payment applications.
            </p>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-md w-full">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Project:</div>
            <div className="font-semibold text-gray-900">{selectedProject.name}</div>
          </div>
        </div>

        {/* Auto-redirect Notice */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            Redirecting to projects in 3 seconds...
          </p>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set('tab', 'projects');
              router.replace(`/?${params.toString()}`, { scroll: false });
            }}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-1"
          >
            Back to Projects Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-gray-900">
      {/* Project Header */}
      <ProjectHeader 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
      />

      {/* Contractor Selection */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              Select Contractors for Payment Applications
            </h3>
            <p className="text-gray-600">
              Choose which contractors should receive payment requests
            </p>
          </div>
          {contracts.length > 0 && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                {selectedSubs.length === contracts.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-500">
                {contracts.length} contractor{contracts.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : contracts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {contracts.map((contract) => (
              <ContractorCard
                key={contract.id}
                contract={contract}
                isSelected={selectedSubs.includes(contract.subcontractor_id)}
                onToggle={handleSubSelection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <ActionBar
        selectedCount={selectedSubs.length}
        onCancel={() => setSelectedProject(null)}
        onSend={handleSendPaymentRequests}
        sending={sending}
        error={sendError}
        success={sendSuccess}
        router={router}
      />
    </div>
  );
};

export default SubcontractorSelectionView;