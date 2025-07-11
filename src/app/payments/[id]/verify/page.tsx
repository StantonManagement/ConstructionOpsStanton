"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Define types for fetched data
interface Project {
  id: number;
  name: string;
  [key: string]: any;
}
interface Contractor {
  id: number;
  name: string;
  trade?: string;
  [key: string]: any;
}
interface LineItem {
  id: number;
  line_item?: {
    description_of_work?: string;
    scheduled_value?: number;
    [key: string]: any;
  };
  previous_percent?: number;
  percent_gc?: number;
  submitted_percent?: number;
  this_period?: number;
  [key: string]: any;
}
interface PaymentApp {
  id: number;
  created_at?: string;
  status?: string;
  [key: string]: any;
}
interface Document {
  url?: string;
  [key: string]: any;
}

export default function PaymentVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const paymentAppId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentApp, setPaymentApp] = useState<PaymentApp | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | null>(null);

  // Helper to get project_line_items for each line item
  const [projectLineItems, setProjectLineItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch payment application
        const { data: app, error: appError } = await supabase
          .from("payment_applications")
          .select("*, project:projects(*), contractor:contractors(*), line_item_progress:payment_line_item_progress(*, line_item:project_line_items(*))")
          .eq("id", paymentAppId)
          .single();
        if (appError) throw new Error(appError.message);
        setPaymentApp(app as PaymentApp);
        setProject(app.project as Project);
        setContractor(app.contractor as Contractor);
        setLineItems((app.line_item_progress || []) as LineItem[]);
        // 2. Fetch document
        const { data: docs, error: docError } = await supabase
          .from("payment_documents")
          .select("*")
          .eq("payment_app_id", paymentAppId);
        if (docError) throw new Error(docError.message);
        setDocument(docs && docs.length > 0 ? (docs[0] as Document) : null);
      } catch (err) {
        setError((err instanceof Error ? err.message : "Failed to load data"));
      } finally {
        setLoading(false);
      }
    }
    if (paymentAppId) fetchData();
  }, [paymentAppId]);

  useEffect(() => {
    async function fetchProjectLineItems() {
      if (!lineItems.length) return;
      const ids = lineItems.map((li) => li.line_item_id).filter(Boolean);
      if (!ids.length) return;
      const { data, error } = await supabase
        .from('project_line_items')
        .select('*')
        .in('id', ids);
      if (!error && data) setProjectLineItems(data);
    }
    fetchProjectLineItems();
  }, [lineItems]);

  // Map project_line_items by id for easy lookup
  const pliMap: Record<number, any> = {};
  projectLineItems.forEach((pli) => { pliMap[pli.id] = pli; });

  // Build line items for the table
  const lineItemsForTable = lineItems.map((li, idx) => {
    const pli = pliMap[li.line_item_id] || {};
    const previous = Number(pli.from_previous_application) || 0;
    const this_period = Number(pli.this_period) || 0;
    const material_presently_stored = Number(pli.material_presently_stored) || 0;
    const scheduled_value = Number(pli.scheduled_value) || 0;
    const item_no = pli.item_no || '';
    const description_of_work = pli.description_of_work || li.line_item?.description_of_work || '';
    const total_completed = previous + this_period + material_presently_stored;
    const percent = scheduled_value ? ((total_completed / scheduled_value) * 100) : 0;
    const balance_to_finish = scheduled_value - total_completed;
    const retainage = 0; // Placeholder, as no DB field
    return {
      idx: idx + 1,
      item_no,
      description_of_work,
      scheduled_value,
      previous,
      this_period,
      material_presently_stored,
      total_completed,
      percent,
      balance_to_finish,
      retainage,
      current_payment: Number(pli.amount_for_this_period) || 0,
    };
  });
  const grandTotal = lineItemsForTable.reduce((sum, li) => sum + li.current_payment, 0);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("payment_applications")
        .update({ status: "approved" })
        .eq("id", paymentAppId);
      if (updateError) throw new Error(updateError.message);
      router.push("/dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to approve"));
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("payment_applications")
        .update({ status: "rejected" })
        .eq("id", paymentAppId);
      if (updateError) throw new Error(updateError.message);
      router.push("/dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to reject"));
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading payment application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(paymentApp?.status || '')}`}>
                {paymentApp?.status?.toUpperCase() || 'PENDING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Application Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Payment Application Review</h1>
            <p className="text-gray-600 mt-1">Review and approve or reject this payment request</p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="text-lg font-semibold text-gray-900">{project?.name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Contractor</label>
                <p className="text-lg font-semibold text-gray-900">{contractor?.name}</p>
                {contractor?.trade && (
                  <p className="text-sm text-gray-600">{contractor.trade}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Submitted</label>
                <p className="text-lg font-semibold text-gray-900">
                  {paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-2xl font-bold text-green-600">
                  {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        {document?.url && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Supporting Documents</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <iframe
                  src={document.url}
                  width="100%"
                  height="600px"
                  className="rounded-lg border border-gray-300"
                  title="Payment Request PDF Preview"
                />
                <div className="mt-4 flex justify-end">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Line Items Breakdown</h2>
            <p className="text-gray-600 mt-1">Detailed breakdown of work completed and payment requested</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    This Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Materials Stored
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Completed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Complete
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItemsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No line items found for this payment application.
                    </td>
                  </tr>
                ) : (
                  lineItemsForTable.map((li, i) => (
                    <tr key={li.idx} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {li.item_no}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={li.description_of_work}>
                          {li.description_of_work}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {li.scheduled_value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        {li.previous.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        {li.this_period.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        {li.material_presently_stored.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {li.total_completed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(li.percent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-700 font-medium">
                            {li.percent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        {li.balance_to_finish.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {li.current_payment.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lineItemsForTable.length > 0 && (
                <tfoot className="bg-blue-50">
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                      Total Payment Requested:
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-lg font-bold text-green-600">
                      {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={() => setShowConfirmDialog('reject')}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject Application
            </button>
            <button
              onClick={() => setShowConfirmDialog('approve')}
              disabled={actionLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve Application
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  showConfirmDialog === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {showConfirmDialog === 'approve' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showConfirmDialog === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                  </h3>
                  <p className="text-gray-600">
                    Are you sure you want to {showConfirmDialog} this payment application?
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Amount:</strong> {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Contractor:</strong> {contractor?.name}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog === 'approve' ? handleApprove : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors ${
                    showConfirmDialog === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `${showConfirmDialog === 'approve' ? 'Approve' : 'Reject'} Payment`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}