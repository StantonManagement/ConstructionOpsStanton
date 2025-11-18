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
    async function fetchData(retryAttempt: number = 0) {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Validate paymentAppId
        if (!paymentAppId) {
          throw new Error('Payment application ID is missing. Please check the URL and try again.');
        }
        
        // Convert string ID to number if needed
        const paymentIdString = Array.isArray(paymentAppId) ? paymentAppId[0] : paymentAppId;
        const appId = typeof paymentIdString === 'string' ? parseInt(paymentIdString, 10) : paymentIdString;
        if (isNaN(appId) || appId <= 0) {
          throw new Error(`Invalid payment application ID: ${paymentAppId}. Please check the URL and try again.`);
        }
        
        console.log('[PaymentVerificationPage] Fetching payment application:', appId);
        
        // 2. Create timeout wrapper for queries (reduced timeout to 20s)
        const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 20000): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout: The server took too long to respond. Please try again.')), timeoutMs)
            )
          ]);
        };
        
        // 3. Try relationship query first with timeout
        let app: any = null;
        let useFallback = false;
        
        try {
          const queryPromise = supabase
            .from("payment_applications")
            .select("*, project:projects(*), contractor:contractors(*), line_item_progress:payment_line_item_progress(*, line_item:project_line_items(*))")
            .eq("id", appId)
            .single() as any as Promise<any>;
          
          const result = await withTimeout(queryPromise, 30000);
          const { data: appData, error: appError } = result;
          
          if (appError) {
            const isRelationshipError = appError.message?.includes('relationship') || 
                                       appError.message?.includes('Could not find a relationship') ||
                                       appError.message?.includes('JSON object requested, multiple (or no) rows returned');
            
            if (isRelationshipError) {
              console.warn('[PaymentVerificationPage] Relationship query failed, using fallback:', appError.message);
              useFallback = true;
            } else {
              // If it's a not found error, throw it directly
              if (appError.code === 'PGRST116' || appError.message?.includes('No rows returned')) {
                throw new Error(`Payment application with ID ${appId} not found. Please verify the ID and try again.`);
              }
              throw new Error(appError.message || 'Failed to fetch payment application');
            }
          } else {
            app = appData;
          }
        } catch (queryErr) {
          if (queryErr instanceof Error && queryErr.message.includes('timeout')) {
            throw queryErr;
          }
          if (queryErr instanceof Error && !queryErr.message.includes('relationship')) {
            throw queryErr;
          }
          console.warn('[PaymentVerificationPage] Query failed, using fallback:', queryErr);
          useFallback = true;
        }
        
        // 4. Fallback: Fetch data separately if relationship query failed
        if (useFallback || !app) {
          console.log('[PaymentVerificationPage] Using fallback query pattern');
          
          // Fetch payment application directly
          const { data: appData, error: appError } = await withTimeout(
            supabase
              .from("payment_applications")
              .select("*")
              .eq("id", appId)
              .single() as any as Promise<any>,
            30000
          );
          
          if (appError) {
            if (appError.code === 'PGRST116' || appError.message?.includes('No rows returned')) {
              throw new Error(`Payment application with ID ${appId} not found. Please verify the ID and try again.`);
            }
            throw new Error(appError.message || 'Failed to fetch payment application');
          }
          
          if (!appData) {
            throw new Error(`Payment application with ID ${appId} not found.`);
          }
          
          app = appData;
          
          // Fetch project separately
          if (app.project_id) {
            const { data: projectData, error: projectError } = await withTimeout(
              supabase
                .from("projects")
                .select("*")
                .eq("id", app.project_id)
                .single() as any as Promise<any>,
              30000
            );
            
            if (!projectError && projectData) {
              app.project = projectData;
            } else {
              console.warn('[PaymentVerificationPage] Could not fetch project:', projectError?.message);
              app.project = { id: app.project_id, name: 'Unknown Project' };
            }
          }
          
          // Fetch contractor separately
          if (app.contractor_id) {
            const { data: contractorData, error: contractorError } = await withTimeout(
              supabase
                .from("contractors")
                .select("*")
                .eq("id", app.contractor_id)
                .single() as any as Promise<any>,
              30000
            );
            
            if (!contractorError && contractorData) {
              app.contractor = contractorData;
            } else {
              console.warn('[PaymentVerificationPage] Could not fetch contractor:', contractorError?.message);
              app.contractor = { id: app.contractor_id, name: 'Unknown Contractor' };
            }
          }
          
          // Fetch line item progress separately
          if (app.id) {
            const { data: lineItemProgressData, error: lineItemError } = await withTimeout(
              supabase
                .from("payment_line_item_progress")
                .select("*, line_item:project_line_items(*)")
                .eq("payment_app_id", app.id) as any as Promise<any>,
              30000
            );
            
            if (!lineItemError && lineItemProgressData) {
              app.line_item_progress = lineItemProgressData;
            } else {
              console.warn('[PaymentVerificationPage] Could not fetch line item progress:', lineItemError?.message);
              app.line_item_progress = [];
            }
          } else {
            app.line_item_progress = [];
          }
        }
        
        // 5. Set state with fetched data
        if (!app) {
          throw new Error(`Payment application with ID ${appId} not found.`);
        }
        
        setPaymentApp(app as PaymentApp);
        setProject((app.project || { id: app.project_id, name: 'Unknown Project' }) as Project);
        setContractor((app.contractor || { id: app.contractor_id, name: 'Unknown Contractor' }) as Contractor);
        setLineItems((app.line_item_progress || []) as LineItem[]);
        
        // 6. Fetch document
        try {
          const { data: docs, error: docError } = await withTimeout(
            supabase
              .from("payment_documents")
              .select("*")
              .eq("payment_app_id", appId) as any as Promise<any>,
            30000
          );
          
          if (docError) {
            console.warn('[PaymentVerificationPage] Could not fetch documents:', docError.message);
            setDocument(null);
          } else {
            setDocument(docs && docs.length > 0 ? (docs[0] as Document) : null);
          }
        } catch (docErr) {
          console.warn('[PaymentVerificationPage] Error fetching documents:', docErr);
          setDocument(null);
        }
        
        console.log('[PaymentVerificationPage] Successfully loaded payment application:', appId);
        setLoading(false);
        
      } catch (err) {
        console.error(`[PaymentVerificationPage] Error loading payment application (attempt ${retryAttempt + 1}):`, err);
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to load payment application. Please try again or contact support if the problem persists.';
        
        // Retry logic: up to 2 retries for timeout or network errors
        const shouldRetry = retryAttempt < 2 && (
          errorMessage.includes('timeout') || 
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')
        );
        
        if (shouldRetry) {
          console.log(`[PaymentVerificationPage] Retrying... (${retryAttempt + 1}/2)`);
          const retryDelay = 1000 * Math.pow(2, retryAttempt); // Exponential backoff: 1s, 2s
          setTimeout(() => {
            fetchData(retryAttempt + 1);
          }, retryDelay);
        } else {
          setError(errorMessage);
          setLoading(false);
        }
      }
    }
    
    if (paymentAppId) {
      fetchData(0);
    } else {
      setLoading(false);
      setError('Payment application ID is missing. Please check the URL and try again.');
    }
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
      
      // Redirect to payment applications list with approved filter
      const returnTo = searchParams.get('returnTo') || '/?tab=payment-applications';
      router.push(`${returnTo.includes('?') ? returnTo + '&' : returnTo + '?'}statusFilter=approved`);
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
      
      // Show success message and redirect to payment applications list with rejected filter
      alert('Payment application rejected successfully!');
      const returnTo = searchParams.get('returnTo') || '/?tab=payment-applications';
      router.push(`${returnTo.includes('?') ? returnTo + '&' : returnTo + '?'}statusFilter=rejected`);
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
        return 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] border-[var(--status-critical-border)] shadow-sm';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
      case 'submitted':
        return 'bg-primary/10 text-primary border-primary/20 shadow-sm';
      case 'needs_review':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)] shadow-sm';
      default:
        return 'bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)] shadow-sm';
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
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="bg-card rounded-xl shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Payment Application</h2>
            <p className="text-muted-foreground mb-2">Please wait while we fetch the payment details...</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50">
        <div className="text-center bg-card p-8 rounded-xl shadow-xl mx-4 max-w-md border border-destructive/20">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">Error Loading Data</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                // Trigger re-fetch by updating a dependency or manually calling fetch
                window.location.reload();
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Retry
            </button>
            <button
              onClick={handleBackNavigation}
              className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Sticky Header with Glass Effect */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl shadow-lg border-b border-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:py-6 gap-4">
            <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackNavigation}
                className="group flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-card/80 rounded-xl transition-all duration-200 border border-border hover:border-border hover:shadow-md"
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
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    Payment Verification
                    <span className="text-sm text-muted-foreground font-normal">#{paymentAppId}</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">Review and process payment request</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusColor(paymentApp?.status || '')}`}>
                  <span className="mr-2">{getStatusIcon(paymentApp?.status || '')}</span>
                {paymentApp?.status?.toUpperCase() || 'PENDING'}
              </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* Compact Payment Application Summary Card */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Payment Application #{paymentAppId}</h1>
                <p className="text-primary/80 text-sm">Review and verification process</p>
              </div>
              <div className="text-right">
                <p className="text-primary/60 text-xs font-semibold uppercase tracking-wide mb-1">Total Amount</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-lg">
                  🏗️
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Project</p>
                  <p className="text-sm font-bold text-foreground">{project?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-lg">
                  👷
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Contractor</p>
                  <p className="text-sm font-bold text-foreground">{contractor?.name}</p>
                  {contractor?.trade && (
                    <p className="text-xs text-muted-foreground">{contractor.trade}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-lg">
                  📅
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted</p>
                  <p className="text-sm font-bold text-foreground">
                    {paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact PM Notes Section */}
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">PM Notes & Comments</h3>
                <p className="text-muted-foreground text-sm">Review existing notes and add your comments</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Existing Notes</div>
                  <div className="text-muted-foreground text-sm">
                    {paymentApp?.pm_notes?.trim() ? (
                      <div className="bg-card/60 rounded-lg p-3 border border-primary/20">
                        {paymentApp.pm_notes}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No existing notes available.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 border-2 border-dashed border-border hover:border-border transition-colors">
              <label className="block text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Add Your Notes</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Share your observations, concerns, or recommendations..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none text-muted-foreground text-sm transition-all"
                rows={3}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  💡 These notes will be included in notifications and records
                </p>
                <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-full">
                  {approvalNotes.length} chars
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact PDF Preview Section */}
        {document?.url && (
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-card/20 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Supporting Documents</h2>
                </div>
                <a
                  href={document?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/20 backdrop-blur text-card-foreground rounded-lg hover:bg-card/30 transition-all text-sm font-medium"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </a>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-muted rounded-lg p-3 border border-border">
                <iframe
                  src={document?.url}
                  width="100%"
                  height="400px"
                  className="rounded-lg border border-border shadow-inner"
                  title="Payment Request PDF Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Compact PDF Download Section */}
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
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>

        

        {/* Compact Line Items Table */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Line Items Breakdown</h2>
                  <p className="text-primary/80 text-sm">Detailed work completion and payment analysis</p>
                </div>
              </div>
              {Object.keys(editedPercentages).length > 0 && (
                <div className="flex items-center gap-2 bg-card/20 backdrop-blur rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">
                    {Object.keys(editedPercentages).length} unsaved changes
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-primary/80">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Click on PM Verified% values to edit percentages</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Item</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Scheduled</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Prev%</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">This%</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">PM%</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Materials</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">% Complete</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Balance</th>
                  <th className="px-3 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {lineItemsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">No line items found</h3>
                          <p className="text-muted-foreground text-sm">This payment application doesn&apos;t have any line items.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lineItemsForTable.map((li, i) => (
                    <tr key={li.idx} className={`${i % 2 === 0 ? 'bg-card' : 'bg-muted/50'} hover:bg-primary/5 transition-colors`}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-lg text-xs font-bold shadow-sm">
                          {li.item_no}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-xs">
                          <div className="text-xs font-semibold text-foreground truncate" title={li.description_of_work}>
                          {li.description_of_work}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-bold text-foreground">
                        {li.scheduled_value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {li.previous_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="text-xs text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                        {li.this_period_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        {editingLineItem === li.line_item_id ? (
                          <div className="flex items-center justify-end gap-1">
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
                              className="w-16 px-2 py-1 text-xs text-foreground border border-primary/30 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                              disabled={savingChanges}
                            />
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => saveLineItemPercentage(li.line_item_id)}
                                disabled={savingChanges}
                                className="p-1 text-[var(--status-success-text)] hover:text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] rounded disabled:opacity-50 transition-all"
                                title="Save changes"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEditingLineItem}
                                disabled={savingChanges}
                                className="p-1 text-[var(--status-critical-text)] hover:text-[var(--status-critical-text)] hover:bg-[var(--status-critical-bg)] rounded disabled:opacity-50 transition-all"
                                title="Cancel editing"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                            <button
                              onClick={() => startEditingLineItem(li.line_item_id, li.submitted_percent, li.pm_verified_percent)}
                            className="group flex items-center justify-end gap-1 w-full hover:bg-primary/5 rounded p-1 transition-all"
                            title="Click to edit percentage"
                            >
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {li.pm_verified_percent.toFixed(1)}%
                            </span>
                            <svg className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs text-muted-foreground">
                        <span className="bg-primary/10 px-1.5 py-0.5 rounded">
                        {li.material_presently_stored.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-bold text-foreground">
                        {li.total_completed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(li.percent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground min-w-[2.5rem]">
                            {li.percent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs text-muted-foreground">
                        <span className="bg-[var(--status-warning-bg)] px-1.5 py-0.5 rounded">
                        {li.balance_to_finish.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-[var(--status-success-text)] bg-[var(--status-success-bg)] px-2 py-1 rounded border border-[var(--status-success-border)]">
                        {li.current_payment.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {lineItemsForTable.length > 0 && (
                <tfoot className="bg-gradient-to-r from-[var(--status-success-bg)] to-[var(--status-success-bg)] border-t-2 border-[var(--status-success-border)]">
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-base font-bold text-foreground">Total Payment Requested:</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2 bg-[var(--status-success-bg)] border-2 border-[var(--status-success-border)] rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 text-[var(--status-success-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-xl font-bold text-[var(--status-success-text)]">
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

        {/* Compact Change Orders Section */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-card/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Change Orders</h2>
                  <p className="text-[var(--status-success-text)] text-sm">Manage additional work orders for PDF inclusion</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeOrderModal(true)}
                className="group inline-flex items-center gap-2 px-4 py-2 bg-card/20 backdrop-blur text-white rounded-lg hover:bg-card/30 transition-all text-sm font-semibold shadow-lg"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            {changeOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">No change orders yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Add change orders to include them in the PDF report</p>
                <button
                  onClick={() => setShowChangeOrderModal(true)}
                  className="px-4 py-2 bg-[var(--status-success-text)] text-[var(--status-success-bg)] rounded-lg hover:bg-[var(--status-success-text)]/90 transition-colors text-sm font-medium"
                >
                  Create First Change Order
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {changeOrders.map((changeOrder, index) => (
                  <div key={changeOrder.id} className="group p-4 bg-gradient-to-r from-muted to-muted rounded-lg border border-border hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 bg-[var(--status-success-bg)] text-[var(--status-success-text)] rounded-lg flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-base mb-2">{changeOrder.description}</h3>
                          <div className="flex items-center gap-4">
                            <div className="bg-card rounded-lg px-2 py-1 border border-border">
                              <span className="text-xs font-medium text-muted-foreground">Amount:</span>
                              <span className="ml-1 font-bold text-[var(--status-success-text)] text-sm">
                                {changeOrder.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                              </span>
                            </div>
                            <div className="bg-card rounded-lg px-2 py-1 border border-border">
                              <span className="text-xs font-medium text-muted-foreground">Percentage:</span>
                              <span className="ml-1 font-bold text-primary text-sm">{changeOrder.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChangeOrder(changeOrder.id)}
                        className="p-2 text-[var(--status-critical-text)] hover:text-[var(--status-critical-text)] hover:bg-[var(--status-critical-bg)] rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete change order"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Compact Summary Card */}
                <div className="mt-6 bg-gradient-to-r from-primary/10 to-primary/10 rounded-lg p-4 border-2 border-primary/20">
                  <h4 className="font-bold text-primary mb-3 text-base">Change Orders Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-card rounded-lg p-3 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary text-sm">Total Value:</span>
                        <span className="font-bold text-primary text-lg">
                          {getChangeOrderTotal().toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary text-sm">Contract %:</span>
                        <span className="font-bold text-primary text-lg">
                          {getChangeOrderPercentage().toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Compact PDF Inclusion Toggle */}
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        id="includeChangeOrderPage"
                        checked={includeChangeOrderPageInPdf}
                        onChange={(e) => setIncludeChangeOrderPageInPdf(e.target.checked)}
                        className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="includeChangeOrderPage" className="font-semibold text-yellow-800 cursor-pointer text-sm">
                        Include Change Order Page in PDF Report
                      </label>
                      <p className="text-xs text-yellow-700 mt-1 leading-relaxed">
                        ⚡ When enabled, a dedicated change order page will be added to the PDF with detailed formatting matching the continuation sheet layout.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-foreground mb-2">Payment Application Decision</h3>
            <p className="text-muted-foreground text-sm">Choose your action for this payment request</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-2xl mx-auto">
            {/* Show different buttons based on status */}
            {paymentApp?.status === 'approved' ? (
              // For approved applications, show recall button
              <button
                onClick={() => setShowConfirmDialog('recall')}
                disabled={actionLoading}
                className="group flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="group flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="group flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                    <span>Reject Application</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowConfirmDialog('approve')}
                  disabled={actionLoading}
                  className="group flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                    <span>Approve Application</span>
                  </div>
                </button>
              </>
            )}
          </div>
          
          {actionLoading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium text-sm">Processing request...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0  backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  showConfirmDialog === 'approve' ? 'bg-emerald-100' :
                  showConfirmDialog === 'recall' ? 'bg-[var(--status-warning-bg)]' : 'bg-[var(--status-critical-bg)]'
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
                    <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {showConfirmDialog === 'approve' ? 'Approve Payment' : 
                     showConfirmDialog === 'recall' ? 'Recall Payment' : 'Reject Payment'}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-base">
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
                    <span className="font-semibold text-muted-foreground">Amount:</span>
                    <p className="text-lg font-bold text-foreground">
                      {grandTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Contractor:</span>
                    <p className="text-lg font-bold text-foreground">{contractor?.name}</p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-6 mb-8">
                {showConfirmDialog === 'approve' ? (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                      Approval Notes (Optional)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any final notes or conditions for this approval..."
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary resize-none text-foreground text-base transition-all"
                      rows={4}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                      {showConfirmDialog === 'recall' ? 'Recall Justification (Optional)' : 'Rejection Reasons (Optional)'}
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder={showConfirmDialog === 'recall' 
                        ? "Explain the reasons for recalling this approved payment..." 
                        : "Provide specific details about why this payment is being rejected..."}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-destructive focus:border-destructive resize-none text-foreground text-base transition-all"
                      rows={5}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-[var(--status-critical-bg)] border-2 border-[var(--status-critical-border)] text-[var(--status-critical-text)] rounded-xl">
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
                  className="flex-1 px-6 py-4 border-2 border-border text-muted-foreground rounded-xl hover:bg-muted disabled:opacity-50 transition-all font-semibold"
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
        <div className="fixed inset-0  backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[var(--status-success-bg)] rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--status-success-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">New Change Order</h3>
                  <p className="text-muted-foreground mt-1">Add details for PDF inclusion</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                    Description *
                  </label>
                  <textarea
                    value={newChangeOrder.description}
                    onChange={(e) => setNewChangeOrder(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the change order work..."
                    className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary resize-none text-foreground transition-all"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
                      Amount ($) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-muted-foreground">$</span>
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
                        className="w-full pl-8 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-foreground transition-all"
                      placeholder="0.00"
                    />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide">
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
                        className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-foreground transition-all"
                      placeholder="0.0"
                    />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-[var(--status-critical-bg)] border-2 border-[var(--status-critical-border)] text-[var(--status-critical-text)] rounded-xl">
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
                    className="flex-1 px-6 py-4 border-2 border-border text-muted-foreground rounded-xl hover:bg-muted transition-all font-semibold"
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