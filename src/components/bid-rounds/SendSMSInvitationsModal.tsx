'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, MessageSquare, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface Contractor {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface SendSMSInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bidRoundId: string;
  bidRoundName: string;
  onSuccess?: () => void;
}

interface SendResult {
  sent: number;
  failed: number;
  results: {
    success: Array<{ contractorId: number; contractorName: string; phone: string }>;
    failed: Array<{ contractorId: number; contractorName: string; phone: string; error: string }>;
  };
}

export default function SendSMSInvitationsModal({
  isOpen,
  onClose,
  bidRoundId,
  bidRoundName,
  onSuccess,
}: SendSMSInvitationsModalProps) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<number[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchContractors();
      setSendResult(null);
      setCustomMessage('');
    }
  }, [isOpen, bidRoundId]);

  async function fetchContractors() {
    try {
      setLoading(true);

      // Get contractors who have been invited to this bid round
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select(
          `
          contractor_id,
          contractor:contractors(id, name, phone, email)
        `
        )
        .eq('bid_round_id', bidRoundId);

      if (bidsError) throw bidsError;

      const uniqueContractors = bids
        ?.map((b) => b.contractor)
        .filter((c): c is Contractor => c !== null)
        .filter((c, index, self) => self.findIndex((other) => other.id === c.id) === index) || [];

      setContractors(uniqueContractors);

      // Auto-select contractors with phone numbers
      const contractorsWithPhone = uniqueContractors.filter(c => c.phone).map(c => c.id);
      setSelectedContractors(contractorsWithPhone);
    } catch (err) {
      console.error('[SMS MODAL] Error fetching contractors:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleContractor = (contractorId: number) => {
    setSelectedContractors((prev) =>
      prev.includes(contractorId)
        ? prev.filter((id) => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const toggleAll = () => {
    const contractorsWithPhone = contractors.filter(c => c.phone);
    if (selectedContractors.length === contractorsWithPhone.length) {
      setSelectedContractors([]);
    } else {
      setSelectedContractors(contractorsWithPhone.map((c) => c.id));
    }
  };

  const handleSend = async () => {
    if (selectedContractors.length === 0) {
      alert('Please select at least one contractor');
      return;
    }

    try {
      setSending(true);

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        alert('Session expired. Please log in again.');
        return;
      }

      const token = session.data.session.access_token;

      // Send SMS invitations
      const response = await fetch(`/api/bid-rounds/${bidRoundId}/send-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractorIds: selectedContractors,
          customMessage: customMessage || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send SMS invitations');
      }

      const result = await response.json();
      setSendResult(result.data);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('[SMS MODAL] Error sending invitations:', err);
      alert(err instanceof Error ? err.message : 'Failed to send SMS invitations');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSendResult(null);
    setCustomMessage('');
    setSelectedContractors([]);
    onClose();
  };

  if (!isOpen) return null;

  const contractorsWithPhone = contractors.filter(c => c.phone);
  const contractorsWithoutPhone = contractors.filter(c => !c.phone);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Send SMS Invitations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{bidRoundName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading contractors...</span>
            </div>
          ) : sendResult ? (
            /* Results View */
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-semibold">
                    SMS Invitations Sent: {sendResult.sent} / {sendResult.sent + sendResult.failed}
                  </h3>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Successfully sent {sendResult.sent} SMS invitation(s)
                </p>
              </div>

              {sendResult.results.success.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Successfully Sent ({sendResult.results.success.length})
                  </h4>
                  <div className="space-y-2">
                    {sendResult.results.success.map((item) => (
                      <div
                        key={item.contractorId}
                        className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {item.contractorName}
                        </span>
                        <span className="text-sm text-gray-500">({item.phone})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sendResult.results.failed.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    Failed to Send ({sendResult.results.failed.length})
                  </h4>
                  <div className="space-y-2">
                    {sendResult.results.failed.map((item) => (
                      <div
                        key={item.contractorId}
                        className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {item.contractorName}
                            <span className="text-gray-500 ml-2">({item.phone})</span>
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {item.error}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Send View */
            <div className="space-y-6">
              {/* Default Message Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Default Message Template
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 italic">
                  "Hi [Contractor], you're invited to bid on "{bidRoundName}" for [Project]. Deadline: [Date]. Trade: [Trade]. TO SUBMIT: Reply with your bid amount (e.g., "$25000" or "25000"). We'll confirm receipt."
                </p>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Leave blank to use the default template above, or add your custom introduction here..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ℹ️ Reply instructions are always included. Keep messages under 160 characters for best delivery.
                </p>
              </div>

              {/* Contractor Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Contractors ({selectedContractors.length} selected)
                  </label>
                  {contractorsWithPhone.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {selectedContractors.length === contractorsWithPhone.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {contractorsWithPhone.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No contractors with phone numbers found</p>
                    <p className="text-sm mt-1">Add phone numbers to contractor profiles to send SMS invitations</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contractorsWithPhone.map((contractor) => (
                      <label
                        key={contractor.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContractors.includes(contractor.id)}
                          onChange={() => toggleContractor(contractor.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {contractor.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {contractor.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning for contractors without phone */}
              {contractorsWithoutPhone.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">
                      {contractorsWithoutPhone.length} contractor(s) cannot receive SMS
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Missing phone numbers: {contractorsWithoutPhone.map(c => c.name).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {sendResult ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || selectedContractors.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send SMS ({selectedContractors.length})
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
