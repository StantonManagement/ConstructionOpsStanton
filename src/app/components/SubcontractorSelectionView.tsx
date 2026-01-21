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
  contractor_id: number;
  subcontractor_id: number; // Compatibility alias for contractor_id
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
    router.push('/projects');
  };

  return (
    <div className="mb-6">
      <button
        onClick={handleBackToProjects}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-navy mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Projects
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Payment Applications</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-600">Project:</span>
          <span className="text-sm font-semibold text-brand-navy">{project.name}</span>
          {project.client_name && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600">{project.client_name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ContractorCard: React.FC<{
  contract: ContractWithVendor;
  isSelected: boolean;
  onToggle: (id: number) => void;
}> = ({ contract, isSelected, onToggle }) => {
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
      className={`relative bg-white border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${
        isSelected
          ? 'border-brand-navy shadow-lg ring-2 ring-brand-navy-200'
          : 'border-gray-200 hover:border-brand-navy-300'
      }`}
      onClick={() => onToggle(contract.subcontractor_id)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? 'bg-brand-navy border-brand-navy'
              : 'border-gray-300 bg-white'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Contractor Info */}
      <div className="mb-3 pr-8">
        <h4 className="font-bold text-gray-900 text-base mb-1">
          {contract.contractors.name}
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase">
            {contract.contractors.trade}
          </span>
          {contract.contractors.phone && (
            <span className="text-xs text-gray-500">{contract.contractors.phone}</span>
          )}
        </div>
      </div>

      {/* Contract Amount - Featured */}
      <div className="mb-3 p-3 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
        <div className="text-xs font-semibold text-emerald-700 uppercase mb-1">Contract Amount</div>
        <div className="text-xl font-bold text-emerald-900">
          {formatCurrency(contract.contract_amount)}
        </div>
      </div>

      {/* Contract Status */}
      <div className="text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span className="text-gray-600">Active Contract</span>
        </div>
      </div>
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
  <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg p-4">
    {/* Status Messages */}
    {error && (
      <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-red-800 font-medium">{error}</span>
      </div>
    )}

    {/* Action Summary & Buttons */}
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <div className="bg-brand-navy text-white px-3 py-1 rounded-full text-sm font-bold">
              {selectedCount}
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {selectedCount === 1 ? 'contractor' : 'contractors'} selected
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-600">Select contractors to continue</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/projects')}
          disabled={sending}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSend}
          disabled={selectedCount === 0 || sending}
          className="px-6 py-2 bg-gradient-to-r from-brand-navy to-brand-navy-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send Requests</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
    <div className="text-center">
      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No Contractors Found</h3>
      <p className="text-sm text-gray-600">
        No contractors are assigned to this project yet.
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
      .from('project_contractors')
      .select('id, contract_amount, contractor_id, contractors(id, name, trade, phone)')
      .eq('project_id', selectedProject.id)
      .eq('contract_status', 'active')
      .then(({ data }) => {
        const fixed = (data || []).map((c) => ({
          ...c,
          subcontractor_id: c.contractor_id, // Alias for compatibility with existing code
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
          router.push('/projects');
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-6">
        {/* Success Icon */}
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Requests Sent!</h2>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-900 font-medium mb-1">{sendSuccess}</p>
            <p className="text-xs text-emerald-700">
              Contractors will receive SMS notifications to submit their payment applications.
            </p>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md w-full">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-gray-600">Project:</span>
            <span className="font-semibold text-brand-navy">{selectedProject.name}</span>
          </div>
        </div>

        {/* Action */}
        <div className="text-center space-y-3">
          <p className="text-xs text-gray-500">Redirecting in 3 seconds...</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-2 bg-gradient-to-r from-brand-navy to-brand-navy-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <ProjectHeader
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />

        {/* Instructions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Select contractors to send payment application requests via SMS
            </p>
          </div>
          {contracts.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                {contracts.length} contractor{contracts.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-brand-navy hover:text-brand-navy-600 transition-colors"
              >
                {selectedSubs.length === contracts.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
        </div>

        {/* Contractors Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : contracts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* Action Bar - Sticky Bottom */}
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