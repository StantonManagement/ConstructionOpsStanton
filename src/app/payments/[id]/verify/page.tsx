"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateG703Pdf } from '@/lib/g703Pdf';

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
  line_item_id: number;
  line_item?: {
    description_of_work?: string;
    scheduled_value?: number;
    [key: string]: any;
  };
  previous_percent?: number;
  percent_gc?: number;
  submitted_percent?: number;
  pm_verified_percent?: number;
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
  const searchParams = useSearchParams();
  const paymentAppId = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentApp, setPaymentApp] = useState<PaymentApp | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | 'recall' | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Helper to get project_line_items for each line item
  const [projectLineItems, setProjectLineItems] = useState<any[]>([]);
  
  // State for PM editing percentages
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null);
  const [editedPercentages, setEditedPercentages] = useState<Record<number, {
    submitted_percent: number;
    pm_verified_percent: number;
  }>>({});
  const [savingChanges, setSavingChanges] = useState(false);

  // State for change orders
  const [changeOrders, setChangeOrders] = useState<Array<{
    id: string;
    description: string;
    amount: number;
    percentage: number;
  }>>([]);
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [newChangeOrder, setNewChangeOrder] = useState({
    description: '',
    amount: 0,
    percentage: 0
  });
  const [includeChangeOrderPageInPdf, setIncludeChangeOrderPageInPdf] = useState(false);

  // Smart back navigation function
  const handleBackNavigation = () => {
    // Check if we have a returnTo parameter
    const returnTo = searchParams.get('returnTo');
    const projectId = searchParams.get('projectId');
    
    if (returnTo) {
      // Navigate to the specific return path
      router.push(returnTo);
    } else if (projectId) {
      // If we have a project ID, go back to the project's payment applications
      router.push(`/pm-dashboard?tab=projects&projectId=${projectId}`);
    } else {
      // Default fallback to dashboard
      router.push('/pm-dashboard');
    }
  };

  // Functions for editing percentages
  const startEditingLineItem = (lineItemId: number, currentSubmitted: number, currentVerified: number) => {
    setEditingLineItem(lineItemId);
    setEditedPercentages(prev => ({
      ...prev,
      [lineItemId]: {
        submitted_percent: currentSubmitted,
        pm_verified_percent: currentVerified || currentSubmitted
      }
    }));
  };

  const cancelEditingLineItem = () => {
    if (editingLineItem !== null) {
      setEditedPercentages(prev => {
        const { [editingLineItem]: removed, ...rest } = prev;
        return rest;
      });
    }
    setEditingLineItem(null);
  };

  const saveLineItemPercentage = async (lineItemId: number) => {
    if (!editedPercentages[lineItemId]) return;
    
    setSavingChanges(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const updatedData = editedPercentages[lineItemId];
      
      // Use API route instead of direct Supabase update
      const response = await fetch(`/api/payments/${paymentAppId}/update-percentage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineItemId,
          submitted_percent: updatedData.submitted_percent,
          pm_verified_percent: updatedData.pm_verified_percent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update percentage');
      }

      // Update local state
      setLineItems(prev => prev.map(li => 
        li.line_item_id === lineItemId 
          ? { 
              ...li, 
              submitted_percent: updatedData.submitted_percent,
              pm_verified_percent: updatedData.pm_verified_percent
            }
          : li
      ));

      setEditingLineItem(null);
      setEditedPercentages(prev => {
        const { [lineItemId]: removed, ...rest } = prev;
        return rest;
      });

    } catch (error) {
      console.error('Error saving percentage:', error);
      setError('Failed to save percentage changes');
    } finally {
      setSavingChanges(false);
    }
  };

  // Functions for change orders
  const addChangeOrder = () => {
    if (!newChangeOrder.description.trim() || newChangeOrder.amount <= 0) {
      setError('Please enter a description and amount for the change order.');
      return;
    }
    
    const changeOrder = {
      id: Date.now().toString(),
      description: newChangeOrder.description.trim(),
      amount: newChangeOrder.amount,
      percentage: newChangeOrder.percentage
    };
    
    setChangeOrders(prev => [...prev, changeOrder]);
    setNewChangeOrder({ description: '', amount: 0, percentage: 0 });
    setShowChangeOrderModal(false);
    setError(null);
  };

  const deleteChangeOrder = (id: string) => {
    setChangeOrders(prev => prev.filter(co => co.id !== id));
  };

  const getChangeOrderTotal = () => {
    return changeOrders.reduce((sum, co) => sum + co.amount, 0);
  };

  const getChangeOrderPercentage = () => {
    const totalContractValue = lineItemsForTable.reduce((sum, li) => sum + li.scheduled_value, 0);
    if (totalContractValue === 0) return 0;
    return (getChangeOrderTotal() / totalContractValue) * 100;
  };

  // Function to send notification to vendor
  const sendVendorNotification = async (paymentApp: any) => {
    try {
      // Get contractor info
      const contractor = paymentApp.contractor;
      const project = paymentApp.project;
      
      if (!contractor?.phone && !contractor?.email) {
        throw new Error('No contact information found for contractor');
      }

      // Prepare notification data
      const notificationData = {
        contractorId: contractor.id,
        contractorName: contractor.name,
        contractorPhone: contractor.phone,
        contractorEmail: contractor.email,
        projectName: project.name,
        paymentAppId: paymentApp.id,
        approvedAmount: paymentApp.current_payment || 0,
        approvalNotes: approvalNotes.trim() || null,
        type: 'approval'
      };

      // Send notification via API
      const response = await fetch('/api/notifications/vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending vendor notification:', error);
      throw error;
    }
  };

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
  const scheduled_value = Number(pli.scheduled_value) || 0;
  const material_presently_stored = Number(pli.material_presently_stored) || 0;
  const item_no = pli.item_no || '';
  const description_of_work = pli.description_of_work || li.line_item?.description_of_work || '';
  
  // Previous work completed (as dollar amount)
  const previous = Number(pli.from_previous_application) || 0;
  
  // Use edited percentage if available, otherwise use original
  const submittedPercent = editedPercentages[li.line_item_id]?.submitted_percent ?? (Number(li.submitted_percent) || 0);
  const pmVerifiedPercent = editedPercentages[li.line_item_id]?.pm_verified_percent ?? (Number(li.pm_verified_percent) || submittedPercent);
  
  // Calculate work completed this period (dollar amount)
  const work_completed_this_period = (pmVerifiedPercent / 100) * scheduled_value;
  const this_period = Math.max(0, work_completed_this_period - previous);
  
  // Total completed work (dollar amount)
  const total_completed = previous + this_period + material_presently_stored;
  
  // Percentage complete (as percentage)
  const percent = scheduled_value > 0 ? (total_completed / scheduled_value) * 100 : 0;
  
  // Balance to finish
  const balance_to_finish = scheduled_value - total_completed;
  const retainage = 0; // Placeholder, as no DB field
  
  return {
    idx: idx + 1,
    line_item_id: li.line_item_id,
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
    current_payment: this_period,
    submitted_percent: submittedPercent,
    pm_verified_percent: pmVerifiedPercent,
  };
});
  const grandTotal = lineItemsForTable.reduce((sum, li) => sum + li.current_payment, 0);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/payments/${paymentAppId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          approvalNotes: approvalNotes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve payment application');
      }

      const result = await response.json();
      console.log('Payment approved:', result);
      
      // Ask if user wants to send notification to vendor
      const sendNotification = confirm(
        'Payment application approved successfully!\n\nWould you like to send a notification to the vendor/contractor about this approval?'
      );

      if (sendNotification) {
        try {
          // Send notification to vendor
          await sendVendorNotification(result.paymentApp);
          alert('Approval notification sent to vendor successfully!');
        } catch (notificationError) {
          console.error('Failed to send vendor notification:', notificationError);
          alert('Payment approved, but failed to send vendor notification. You may need to notify them manually.');
        }
      }
      
      router.push("/pm-dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to approve"));
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
      setApprovalNotes('');
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError(null);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/payments/${paymentAppId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rejectionNotes: rejectionNotes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject payment application');
      }

      const result = await response.json();
      console.log('Payment rejected:', result);
      
      // Show success message and redirect
      alert('Payment application rejected successfully!');
      router.push("/pm-dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to reject"));
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
      setRejectionNotes('');
    }
  };

  const handleRecall = async () => {
    setActionLoading(true);
    setError(null);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/payments/${paymentAppId}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recallNotes: rejectionNotes.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recall payment application');
      }

      const result = await response.json();
      console.log('Payment recalled:', result);
      
      // Show success message and redirect
      alert('Payment application recalled successfully!');
      router.push("/pm-dashboard");
    } catch (err) {
      setError((err instanceof Error ? err.message : "Failed to recall"));
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
      setRejectionNotes('');
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
            onClick={handleBackNavigation}
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
              onClick={handleBackNavigation}
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

        {/* PM Notes Section */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl shadow-sm mb-8 px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-yellow-800 mb-1">Notes for Project Manager</div>
              <div className="text-gray-800 text-base">
                {paymentApp?.pm_notes?.trim() ? paymentApp.pm_notes : <span className="text-gray-500 italic">No notes provided.</span>}
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
                  src={document?.url}
                  width="100%"
                  height="600px"
                  className="rounded-lg border border-gray-300"
                  title="Payment Request PDF Preview"
                />
                <div className="mt-4 flex justify-end">
                  <a
                    href={document?.url}
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

        {/* PDF Download Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={async () => {
              if (!project || !contractor || !paymentApp?.id) {
                setError('Missing required data to generate PDF.');
                return;
              }
              const { pdfBytes, filename } = await generateG703Pdf({
                project: { name: project.name || '', address: (project as any).address || '' },
                contractor: { name: contractor.name || '' },
                applicationNumber: paymentApp.id,
                invoiceDate: paymentApp.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '',
                period: '', // You can fill this with the correct value if available
                dateSubmitted: paymentApp.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '',
                previousDate: '', // Added to fix linter error
                lineItems: lineItemsForTable,
                changeOrders: changeOrders, // Add change orders to PDF generation
                includeChangeOrderPage: includeChangeOrderPageInPdf, // Pass the new state variable
              });
              const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = (typeof window !== 'undefined' && window.document) ? window.document.createElement('a') as HTMLAnchorElement : null;
              if (a) {
                a.href = url;
                a.download = filename;
                if (window.document.body) {
                  window.document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 100);
                } else {
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Change Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
                <p className="text-gray-600 mt-1">Add change orders to be included in the PDF</p>
              </div>
              <button
                onClick={() => setShowChangeOrderModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Change Order
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {changeOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No change orders added yet.</p>
                <p className="text-sm">Click "Add Change Order" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {changeOrders.map((changeOrder) => (
                  <div key={changeOrder.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{changeOrder.description}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>Amount: {changeOrder.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                        <span>Percentage: {changeOrder.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteChangeOrder(changeOrder.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete change order"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">Total Change Orders:</span>
                    <span className="font-bold text-blue-900">
                      {getChangeOrderTotal().toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-blue-700">Percentage of Contract:</span>
                    <span className="text-sm font-medium text-blue-700">
                      {getChangeOrderPercentage().toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Include Change Order Page Checkbox */}
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeChangeOrderPage"
                      checked={includeChangeOrderPageInPdf}
                      onChange={(e) => setIncludeChangeOrderPageInPdf(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="includeChangeOrderPage" className="text-sm font-medium text-yellow-800">
                      Include Change Order Page in PDF
                    </label>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1 ml-7">
                    When checked, a separate third page will be added to the PDF with change order details in the same format as the continuation sheet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Line Items Breakdown</h2>
                <p className="text-gray-600 mt-1">Detailed breakdown of work completed and payment requested</p>
                <p className="text-sm text-blue-600 mt-1">💡 Hover over PM Verified% to edit percentages</p>
              </div>
              {Object.keys(editedPercentages).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 font-medium">
                    {Object.keys(editedPercentages).length} unsaved changes
                  </span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
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
                    Previous%
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    This Period%
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PM Verified%
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
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        {editingLineItem === li.line_item_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editedPercentages[li.line_item_id]?.pm_verified_percent || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setEditedPercentages(prev => ({
                                  ...prev,
                                  [li.line_item_id]: {
                                    ...prev[li.line_item_id],
                                    pm_verified_percent: value
                                  }
                                }));
                              }}
                              className="w-16 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              disabled={savingChanges}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveLineItemPercentage(li.line_item_id)}
                                disabled={savingChanges}
                                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                title="Save"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEditingLineItem}
                                disabled={savingChanges}
                                className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 group">
                            <span className="text-gray-700 font-medium">
                              {li.pm_verified_percent.toFixed(1)}%
                            </span>
                            <button
                              onClick={() => startEditingLineItem(li.line_item_id, li.submitted_percent, li.pm_verified_percent)}
                              className="p-1 text-gray-700 hover:text-blue-600 transition-all"
                              title="Edit percentage"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
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
                    <td colSpan={10} className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
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
            {/* Show different buttons based on status */}
            {paymentApp?.status === 'approved' ? (
              // For approved applications, show recall button
              <button
                onClick={() => setShowConfirmDialog('recall')}
                disabled={actionLoading}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Recall Application
              </button>
            ) : paymentApp?.status === 'rejected' ? (
              // For rejected applications, show only approve button (to re-approve)
              <button
                onClick={() => setShowConfirmDialog('approve')}
                disabled={actionLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Re-approve Application
              </button>
            ) : (
              // For other statuses, show both approve and reject buttons
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0  bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  showConfirmDialog === 'approve' ? 'bg-green-100' : 
                  showConfirmDialog === 'recall' ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                  {showConfirmDialog === 'approve' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : showConfirmDialog === 'recall' ? (
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showConfirmDialog === 'approve' ? 'Approve Payment' : 
                     showConfirmDialog === 'recall' ? 'Recall Payment' : 'Reject Payment'}
                  </h3>
                  <p className="text-gray-600">
                    {showConfirmDialog === 'approve' 
                      ? 'Add optional notes and approve this payment application' 
                      : showConfirmDialog === 'recall'
                        ? 'Provide a reason for recalling this approved payment application'
                        : 'Please provide a reason for rejection'}
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

              {/* Form fields */}
              <div className="space-y-4 mb-6">
                {showConfirmDialog === 'approve' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Notes (Optional)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any notes for this approval..."
                      className="w-full px-3 py-2  border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-700"
                      rows={3}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {showConfirmDialog === 'recall' ? 'Recall Notes (Optional)' : 'Rejection Notes (Optional)'}
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder={showConfirmDialog === 'recall' 
                        ? "Provide details about the recall..." 
                        : "Provide details about the rejection..."}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(null);
                    setRejectionNotes('');
                    setApprovalNotes('');
                    setError(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog === 'approve' ? handleApprove : showConfirmDialog === 'recall' ? handleRecall : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors ${
                    showConfirmDialog === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : showConfirmDialog === 'recall'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    `${showConfirmDialog === 'approve' ? 'Approve' : showConfirmDialog === 'recall' ? 'Recall' : 'Reject'} Payment`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Order Modal */}
      {showChangeOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Add Change Order</h3>
                  <p className="text-gray-600">Enter change order details to be included in the PDF</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newChangeOrder.description}
                    onChange={(e) => setNewChangeOrder(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the change order..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-700"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newChangeOrder.amount || ''}
                      onChange={(e) => setNewChangeOrder(prev => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newChangeOrder.percentage || ''}
                      onChange={(e) => setNewChangeOrder(prev => ({ 
                        ...prev, 
                        percentage: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowChangeOrderModal(false);
                      setNewChangeOrder({ description: '', amount: 0, percentage: 0 });
                      setError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addChangeOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Change Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}