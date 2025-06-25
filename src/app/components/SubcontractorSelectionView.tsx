import React, { useState, useEffect } from 'react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

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

const SubcontractorSelectionView: React.FC<Props> = ({ selectedProject, setSelectedProject }) => {
  const [contracts, setContracts] = useState<ContractWithVendor[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
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
        setSendSuccess('Payment requests sent successfully!');
        setSelectedProject(null);
        setSelectedSubs([]);
      }
    } catch (e) {
      console.error('Network or fetch error:', e);
      setSendError('Network error. Please try again.');
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Create Payment Applications
            </h3>
            <p className="text-sm text-gray-600">
              Project: {selectedProject.name}
            </p>
          </div>
          <button
            onClick={() => setSelectedProject(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Projects
          </button>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            Select Subcontractors for Payment Request
          </h4>
          {loading ? (
            <div className="text-gray-500">Loading contracts...</div>
          ) : contracts.length === 0 ? (
            <div className="text-gray-500">No contracts found for this project.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSubs.includes(contract.subcontractor_id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSubSelection(contract.subcontractor_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900">{contract.contractors.name}</h5>
                      <p className="text-sm text-gray-600">{contract.contractors.trade}</p>
                      <p className="text-sm text-gray-500">Contract: ${Number(contract.contract_amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Start: {contract.start_date}</p>
                      <p className="text-sm text-gray-500">End: {contract.end_date}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <input
                        type="checkbox"
                        checked={selectedSubs.includes(contract.subcontractor_id)}
                        onChange={() => handleSubSelection(contract.subcontractor_id)}
                        className="w-4 h-4 text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            {sendError && <div className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2 w-full text-center">{sendError}</div>}
            {sendSuccess && <div className="text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-2 w-full text-center">{sendSuccess}</div>}
            <button
              onClick={() => setSelectedProject(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={sending}
            >
              Cancel
            </button>
            <button
              onClick={handleSendPaymentRequests}
              disabled={selectedSubs.length === 0 || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Sending...</span>
              ) : (
                <>Send Payment Requests ({selectedSubs.length})</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubcontractorSelectionView; 