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
  
  // State for previous approved percentages
  const [previousPercentages, setPreviousPercentages] = useState<Record<number, number>>({});
  
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
        let errorMessage = 'Failed to update percentage';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
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
        approvedAmount: paymentApp.current_period_value || 0,
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
        let errorMessage = 'Failed to send notification';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
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

  // Fetch previous approved percentages for each line item
  useEffect(() => {
    async function fetchPreviousPercentages() {
      if (!lineItems.length) return;
      
      const lineItemIds = lineItems.map((li) => li.line_item_id).filter(Boolean);
      if (!lineItemIds.length) return;

      try {
        // Get previous percentages directly from project_line_items table
        const { data: projectLineItemsData, error: pliError } = await supabase
          .from('project_line_items')
          .select('id, from_previous_application')
          .in('id', lineItemIds);

        if (pliError) {
          console.error('Error fetching project line items:', pliError);
          return;
        }

        // Map previous percentages by line item ID
        const prevPercentages: Record<number, number> = {};
        lineItemIds.forEach(id => { prevPercentages[id] = 0; }); // Default to 0

        if (projectLineItemsData) {
          projectLineItemsData.forEach((pli) => {
            prevPercentages[pli.id] = Number(pli.from_previous_application) || 0;
          });
        }

        setPreviousPercentages(prevPercentages);
      } catch (error) {
        console.error('Error in fetchPreviousPercentages:', error);
      }
    }

    fetchPreviousPercentages();
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
  
  // Get percentages from SMS submission and database
  const submittedPercent = editedPercentages[li.line_item_id]?.submitted_percent ?? (Number(li.submitted_percent) || 0);
  const pmVerifiedPercent = editedPercentages[li.line_item_id]?.pm_verified_percent ?? (Number(li.pm_verified_percent) || submittedPercent);
  
  // Get previous percentage from database (from_previous_application field)
  const previousPercent = Number(pli.from_previous_application) || 0;
  
  // Calculate this period percentage (what was actually submitted this time)
  const thisPeriodPercent = Math.max(0, pmVerifiedPercent - previousPercent);
  
  // Debug logging for payment calculation
  if (process.env.NODE_ENV === 'development') {
    console.log(`Line Item ${li.line_item_id} (${description_of_work}):`, {
      submittedPercent,
      pmVerifiedPercent,
      previousPercent,
      thisPeriodPercent,
      scheduledValue: scheduled_value
    });
  }
  
  // Calculate dollar amounts based on percentages
  const previous = (previousPercent / 100) * scheduled_value; // Previous work in dollars
  const this_period = (thisPeriodPercent / 100) * scheduled_value; // This period work in dollars
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
    previous, // Previous work in dollars
    this_period, // This period work in dollars
    material_presently_stored,
    total_completed,
    percent, // Total percentage complete
    balance_to_finish,
    retainage,
    current_payment: this_period,
    submitted_percent: submittedPercent, // Original submitted percentage
    pm_verified_percent: pmVerifiedPercent, // PM verified percentage
    // Add percentage values for PDF generation
    previous_percent: previousPercent, // Previous percentage (0 for first application)
    this_period_percent: thisPeriodPercent, // This period percentage
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
        let errorMessage = 'Failed to approve payment application';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
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
      
      router.push("/");
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
        let errorMessage = 'Failed to reject payment application';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Payment rejected:', result);
      
      // Show success message and redirect
      alert('Payment application rejected successfully!');
      router.push("/");
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
        let errorMessage = 'Failed to recall payment application';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use default message
          errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Payment recalled:', result);
      
      // Show success message and redirect
      alert('Payment application recalled successfully!');
      router.push("/");
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200 shadow-sm';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm';
      case 'needs_review':
        return 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'submitted':
        return '📤';
      case 'needs_review':
        return '⚠️';
      case 'pending':
        return '⏳';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center px-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading Payment Application</h2>
            <p className="text-slate-600">Please wait while we fetch the payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-xl mx-4 max-w-md border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Error Loading Data</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={handleBackNavigation}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Sticky Header with Glass Effect */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-6 gap-4">
            <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackNavigation}
                className="group flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-all duration-200 border border-slate-200 hover:border-slate-300 hover:shadow-md"
            >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
                <span className="hidden sm:inline font-medium">Back to Dashboard</span>
                <span className="sm:hidden font-medium">Back</span>
            </button>
              <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-slate-200 to-slate-400"></div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  #{paymentAppId}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Payment Verification
                    <span className="text-sm text-slate-500 font-normal">#{paymentAppId}</span>
                  </h1>
                  <p className="text-sm text-slate-600">Review and process payment request</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusColor(paymentApp?.status || '')}`}>
                  <span className="mr-2">{getStatusIcon(paymentApp?.status || '')}</span>
                {paymentApp?.status?.toUpperCase() || 'PENDING'}
              </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Enhanced Payment Application Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-6 sm:px-8 py-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Payment Application Review</h1>
                <p className="text-blue-100 text-lg">Detailed verification and approval process</p>
          </div>
              <div className="text-right">
                <p className="text-blue-200 text-sm font-semibold uppercase tracking-wide mb-2">Total Amount</p>
                <p className="text-4xl sm:text-5xl font-bold text-white">
                  {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 sm:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform duration-300">
                    🏗️
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Project</label>
                    <p className="text-xl font-bold text-gray-900 mt-1">{project?.name}</p>
                  </div>
                </div>
              </div>
              <div className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform duration-300">
                    👷
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contractor</label>
                    <p className="text-xl font-bold text-gray-900 mt-1">{contractor?.name}</p>
                {contractor?.trade && (
                      <p className="text-sm text-gray-600 mt-1 px-2 py-1 bg-gray-200 rounded-full inline-block">{contractor.trade}</p>
                )}
              </div>
                </div>
              </div>
              <div className="group p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 md:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform duration-300">
                    📅
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Submitted</label>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                  {paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : "-"}
                </p>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced PM Notes Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 sm:px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
              </div>
            <div>
                <h3 className="text-xl font-bold text-white">PM Notes & Comments</h3>
                <p className="text-gray-300">Review existing notes and add your comments</p>
              </div>
            </div>
          </div>
          <div className="px-6 sm:px-8 py-8 space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wide">Existing Notes</div>
                  <div className="text-gray-700 text-base leading-relaxed">
                    {paymentApp?.pm_notes?.trim() ? (
                      <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                        {paymentApp.pm_notes}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No existing notes available.</span>
                    )}
              </div>
            </div>
          </div>
        </div>

            <div className="bg-white rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              <label className="block text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Add Your Notes</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Share your observations, concerns, or recommendations for this payment application..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-700 text-base transition-all duration-200"
                rows={4}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  💡 These notes will be included in notifications and permanent records
                </p>
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
                  {approvalNotes.length} characters
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced PDF Preview Section */}
        {document?.url && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
            </div>
                  <h2 className="text-xl font-bold text-white">Supporting Documents</h2>
                </div>
                  <a
                    href={document?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                </div>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <iframe
                  src={document?.url}
                  width="100%"
                  height="700px"
                  className="rounded-lg border border-gray-300 shadow-inner"
                  title="Payment Request PDF Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Enhanced PDF Download Section */}
        <div className="flex justify-end">
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
                period: '',
                dateSubmitted: paymentApp.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '',
                previousDate: '',
                lineItems: lineItemsForTable,
                changeOrders: changeOrders,
                includeChangeOrderPage: includeChangeOrderPageInPdf,
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
            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF Report
          </button>
        </div>

        

        {/* Enhanced Line Items Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
              <div>
                  <h2 className="text-xl font-bold text-white">Line Items Breakdown</h2>
                  <p className="text-indigo-100 mt-1">Detailed work completion and payment analysis</p>
                </div>
              </div>
              {Object.keys(editedPercentages).length > 0 && (
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">
                    {Object.keys(editedPercentages).length} unsaved changes
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-indigo-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Click on PM Verified% values to edit percentages</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Scheduled Value</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Previous%</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">This Period%</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">PM Verified%</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Materials Stored</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Completed</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">% Complete</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Current Payment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {lineItemsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">No line items found</h3>
                          <p className="text-gray-500">This payment application doesn't have any line items.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lineItemsForTable.map((li, i) => (
                    <tr key={li.idx} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 rounded-xl text-sm font-bold shadow-sm">
                          {li.item_no}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-semibold text-gray-900 truncate" title={li.description_of_work}>
                          {li.description_of_work}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                        {li.scheduled_value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                        {li.previous_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-700 bg-blue-100 px-2 py-1 rounded-md font-medium">
                        {li.this_period_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
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
                              className="w-20 px-3 py-1 text-sm text-gray-900 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={savingChanges}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveLineItemPercentage(li.line_item_id)}
                                disabled={savingChanges}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-all"
                                title="Save changes"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEditingLineItem}
                                disabled={savingChanges}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-all"
                                title="Cancel editing"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                            <button
                              onClick={() => startEditingLineItem(li.line_item_id, li.submitted_percent, li.pm_verified_percent)}
                            className="group flex items-center justify-end gap-2 w-full hover:bg-blue-50 rounded-lg p-2 transition-all"
                            title="Click to edit percentage"
                            >
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-lg">
                              {li.pm_verified_percent.toFixed(1)}%
                            </span>
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        <span className="bg-purple-100 px-2 py-1 rounded-md">
                        {li.material_presently_stored.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                        {li.total_completed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-16 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(li.percent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                            {li.percent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                        <span className="bg-orange-100 px-2 py-1 rounded-md">
                        {li.balance_to_finish.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-base font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        {li.current_payment.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lineItemsForTable.length > 0 && (
                <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-lg font-bold text-gray-900">Total Payment Requested:</span>
                      </div>
                    </td>
                    <td className="px-4 py-6 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2 bg-green-100 border-2 border-green-300 rounded-xl px-4 py-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-2xl font-bold text-green-700">
                      {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Enhanced Change Orders Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Change Orders</h2>
                  <p className="text-green-100 mt-1">Manage additional work orders for PDF inclusion</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeOrderModal(true)}
                className="group inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition-all duration-300 font-semibold shadow-lg"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Change Order
              </button>
            </div>
          </div>
          <div className="px-6 py-8">
            {changeOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No change orders yet</h3>
                <p className="text-gray-600 mb-6">Add change orders to include them in the PDF report</p>
                <button
                  onClick={() => setShowChangeOrderModal(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                >
                  Create First Change Order
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {changeOrders.map((changeOrder, index) => (
                  <div key={changeOrder.id} className="group p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-2">{changeOrder.description}</h3>
                          <div className="flex items-center gap-6">
                            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                              <span className="text-sm font-medium text-gray-600">Amount:</span>
                              <span className="ml-2 font-bold text-green-600">
                                {changeOrder.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                              </span>
                            </div>
                            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                              <span className="text-sm font-medium text-gray-600">Percentage:</span>
                              <span className="ml-2 font-bold text-blue-600">{changeOrder.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChangeOrder(changeOrder.id)}
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete change order"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Enhanced Summary Card */}
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-4 text-lg">Change Orders Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-800">Total Value:</span>
                        <span className="font-bold text-blue-900 text-xl">
                          {getChangeOrderTotal().toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-800">Contract %:</span>
                        <span className="font-bold text-blue-900 text-xl">
                          {getChangeOrderPercentage().toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced PDF Inclusion Toggle */}
                <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center h-6 mt-1">
                      <input
                        type="checkbox"
                        id="includeChangeOrderPage"
                        checked={includeChangeOrderPageInPdf}
                        onChange={(e) => setIncludeChangeOrderPageInPdf(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="includeChangeOrderPage" className="font-semibold text-yellow-800 cursor-pointer">
                        Include Change Order Page in PDF Report
                      </label>
                      <p className="text-sm text-yellow-700 mt-2 leading-relaxed">
                        ⚡ When enabled, a dedicated change order page will be added to the PDF with detailed formatting matching the continuation sheet layout.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Application Decision</h3>
            <p className="text-gray-600">Choose your action for this payment request</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            {/* Show different buttons based on status */}
            {paymentApp?.status === 'approved' ? (
              // For approved applications, show recall button
              <button
                onClick={() => setShowConfirmDialog('recall')}
                disabled={actionLoading}
                className="group flex-1 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                  <span>Recall Application</span>
                </div>
              </button>
            ) : paymentApp?.status === 'rejected' ? (
              // For rejected applications, show only approve button (to re-approve)
              <button
                onClick={() => setShowConfirmDialog('approve')}
                disabled={actionLoading}
                className="group flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                  <span>Re-approve Application</span>
                </div>
              </button>
            ) : (
              // For other statuses, show both approve and reject buttons
              <>
                <button
                  onClick={() => setShowConfirmDialog('reject')}
                  disabled={actionLoading}
                  className="group flex-1 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                    <span>Reject Application</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowConfirmDialog('approve')}
                  disabled={actionLoading}
                  className="group flex-1 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                    <span>Approve Application</span>
                  </div>
                </button>
              </>
            )}
          </div>
          
          {actionLoading && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Processing request...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  showConfirmDialog === 'approve' ? 'bg-emerald-100' :
                  showConfirmDialog === 'recall' ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                  {showConfirmDialog === 'approve' ? (
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : showConfirmDialog === 'recall' ? (
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {showConfirmDialog === 'approve' ? 'Approve Payment' : 
                     showConfirmDialog === 'recall' ? 'Recall Payment' : 'Reject Payment'}
                  </h3>
                  <p className="text-slate-600 mt-1 text-base">
                    {showConfirmDialog === 'approve' 
                      ? 'Review details and confirm approval' 
                      : showConfirmDialog === 'recall'
                        ? 'Provide justification for recalling this approved payment'
                        : 'Specify reasons for rejecting this payment request'}
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 mb-6 border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700">Amount:</span>
                    <p className="text-lg font-bold text-slate-900">
                      {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Contractor:</span>
                    <p className="text-lg font-bold text-slate-900">{contractor?.name}</p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-6 mb-8">
                {showConfirmDialog === 'approve' ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Approval Notes (Optional)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any final notes or conditions for this approval..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-gray-700 text-base transition-all"
                      rows={4}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      {showConfirmDialog === 'recall' ? 'Recall Justification (Optional)' : 'Rejection Reasons (Optional)'}
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder={showConfirmDialog === 'recall' 
                        ? "Explain the reasons for recalling this approved payment..." 
                        : "Provide specific details about why this payment is being rejected..."}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-gray-700 text-base transition-all"
                      rows={5}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowConfirmDialog(null);
                    setRejectionNotes('');
                    setApprovalNotes('');
                    setError(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog === 'approve' ? handleApprove : showConfirmDialog === 'recall' ? handleRecall : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 px-6 py-4 text-white rounded-xl disabled:opacity-50 transition-all font-semibold shadow-lg ${
                    showConfirmDialog === 'approve' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800' :
                    showConfirmDialog === 'recall' ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800' : 
                    'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  }`}
                >
                  {actionLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Confirm ${showConfirmDialog === 'approve' ? 'Approval' : showConfirmDialog === 'recall' ? 'Recall' : 'Rejection'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Change Order Modal */}
      {showChangeOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">New Change Order</h3>
                  <p className="text-gray-600 mt-1">Add details for PDF inclusion</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    Description *
                  </label>
                  <textarea
                    value={newChangeOrder.description}
                    onChange={(e) => setNewChangeOrder(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the change order work..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-700 transition-all"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Amount ($) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newChangeOrder.amount || ''}
                      onChange={(e) => setNewChangeOrder(prev => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 transition-all"
                      placeholder="0.00"
                    />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Percentage (%)
                    </label>
                    <div className="relative">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 transition-all"
                      placeholder="0.0"
                    />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowChangeOrderModal(false);
                      setNewChangeOrder({ description: '', amount: 0, percentage: 0 });
                      setError(null);
                    }}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addChangeOrder}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
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