import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface LineItemData {
  id: number;
  item_no: string;
  description_of_work: string;
  scheduled_value: number;
  from_previous_application: number;
  change_order_amount?: number;
}

interface LineItemProgress {
  line_item_id: number;
  submitted_percent: number;
}

interface ManualPaymentEntryModalProps {
  projectId: number;
  projectName: string;
  contractorId: number;
  contractorName: string;
  onClose: () => void;
}

const ManualPaymentEntryModal: React.FC<ManualPaymentEntryModalProps> = ({
  projectId,
  projectName,
  contractorId,
  contractorName,
  onClose,
}) => {
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [percentages, setPercentages] = useState<Record<number, number>>({});
  const [pmNotes, setPmNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchLineItems();
  }, [projectId, contractorId]);

  const fetchLineItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch line items for this contractor and project
      const { data, error: fetchError } = await supabase
        .from('project_line_items')
        .select('id, item_no, description_of_work, scheduled_value, from_previous_application, change_order_amount')
        .eq('project_id', projectId)
        .eq('contractor_id', contractorId)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError('No line items found for this contractor. Please add line items before creating a payment application.');
        setLineItems([]);
        return;
      }

      setLineItems(data);

      // Initialize percentages with previous values
      const initialPercentages: Record<number, number> = {};
      data.forEach(item => {
        initialPercentages[item.id] = item.from_previous_application || 0;
      });
      setPercentages(initialPercentages);

    } catch (err: any) {
      console.error('Error fetching line items:', err);
      setError(err.message || 'Failed to load line items');
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (lineItemId: number, value: string) => {
    const numValue = parseFloat(value);
    
    if (value === '' || isNaN(numValue)) {
      setPercentages(prev => ({ ...prev, [lineItemId]: 0 }));
      return;
    }

    setPercentages(prev => ({ ...prev, [lineItemId]: numValue }));
    
    // Clear validation error for this item when user changes value
    if (validationErrors[lineItemId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[lineItemId];
        return newErrors;
      });
    }
  };

  const validatePercentages = (): boolean => {
    const errors: Record<number, string> = {};
    let hasProgress = false;

    lineItems.forEach(item => {
      const currentPercent = percentages[item.id] || 0;
      const previousPercent = item.from_previous_application || 0;

      if (currentPercent < 0 || currentPercent > 100) {
        errors[item.id] = 'Must be between 0-100%';
      } else if (currentPercent < previousPercent) {
        errors[item.id] = `Cannot be less than previous ${previousPercent}%`;
      }

      if (currentPercent > previousPercent) {
        hasProgress = true;
      }
    });

    if (!hasProgress) {
      setError('At least one line item must have progress from the previous period.');
      setValidationErrors(errors);
      return false;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const totals = useMemo(() => {
    let totalScheduledValue = 0;
    let totalPreviousAmount = 0;
    let totalCurrentAmount = 0;
    let totalThisPeriod = 0;

    lineItems.forEach(item => {
      const scheduledValue = (item.scheduled_value || 0) + (item.change_order_amount || 0);
      const previousPercent = item.from_previous_application || 0;
      const currentPercent = percentages[item.id] || 0;
      const thisPeriodPercent = Math.max(0, currentPercent - previousPercent);

      totalScheduledValue += scheduledValue;
      totalPreviousAmount += (scheduledValue * previousPercent) / 100;
      totalCurrentAmount += (scheduledValue * currentPercent) / 100;
      totalThisPeriod += (scheduledValue * thisPeriodPercent) / 100;
    });

    return {
      totalScheduledValue,
      totalPreviousAmount,
      totalCurrentAmount,
      totalThisPeriod,
    };
  }, [lineItems, percentages]);

  const handleSubmit = async () => {
    setError(null);

    if (!validatePercentages()) {
      return;
    }

    try {
      setSubmitting(true);

      // Prepare line items data
      const lineItemsData: LineItemProgress[] = lineItems.map(item => ({
        line_item_id: item.id,
        submitted_percent: percentages[item.id] || 0,
      }));

      // Call API to create payment application
      const response = await fetch('/api/payments/create-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          contractorId,
          lineItems: lineItemsData,
          pm_notes: pmNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment application');
      }

      const result = await response.json();

      // Success! Redirect to verification page
      if (result.paymentAppId) {
        router.push(`/payments/${result.paymentAppId}/verify?returnTo=/`);
      } else {
        // Fallback to payments tab
        const params = new URLSearchParams();
        params.set('tab', 'payments');
        router.replace(`/?${params.toString()}`, { scroll: false });
      }

    } catch (err: any) {
      console.error('Error creating payment application:', err);
      setError(err.message || 'Failed to create payment application');
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Payment Application</h2>
              <p className="text-sm text-gray-600 mt-1">
                {projectName} • {contractorName}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading line items...</p>
              </div>
            </div>
          ) : error && lineItems.length === 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                          Value
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                          Prev %
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                          Current %
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                          This Period
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lineItems.map((item, index) => {
                        const scheduledValue = (item.scheduled_value || 0) + (item.change_order_amount || 0);
                        const previousPercent = item.from_previous_application || 0;
                        const currentPercent = percentages[item.id] || 0;
                        const thisPeriodPercent = Math.max(0, currentPercent - previousPercent);
                        const thisPeriodAmount = (scheduledValue * thisPeriodPercent) / 100;
                        const hasError = !!validationErrors[item.id];

                        return (
                          <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${hasError ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {item.item_no || index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {item.description_of_work}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(scheduledValue)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                              {previousPercent.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <input
                                  type="number"
                                  min={previousPercent}
                                  max="100"
                                  step="0.1"
                                  value={currentPercent}
                                  onChange={(e) => handlePercentageChange(item.id, e.target.value)}
                                  disabled={submitting}
                                  className={`w-full px-3 py-2 text-sm text-right border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                                    hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                  }`}
                                />
                                {hasError && (
                                  <span className="text-xs text-red-600">{validationErrors[item.id]}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(thisPeriodAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900">
                          TOTALS
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(totals.totalScheduledValue)}
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                          {formatCurrency(totals.totalThisPeriod)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* PM Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PM Notes (Optional)
                </label>
                <textarea
                  value={pmNotes}
                  onChange={(e) => setPmNotes(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Add any notes about this payment application..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                />
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Contract</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalScheduledValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Previous Payments</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalPreviousAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Current Payment</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalThisPeriod)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Paid To Date</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalCurrentAmount)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loading || (lineItems.length === 0)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Payment Application</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualPaymentEntryModal;

