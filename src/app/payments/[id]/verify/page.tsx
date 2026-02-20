"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Check, X, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/theme';
import { generateG703Pdf } from '@/lib/g703Pdf';

// Define types
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
  submitted_percent?: number;
  pm_verified_percent?: number;
  [key: string]: any;
}
interface PaymentApp {
  id: number;
  created_at?: string;
  status?: string;
  [key: string]: any;
}

function PaymentVerificationContent() {
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
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [projectLineItems, setProjectLineItems] = useState<any[]>([]);

  // Editing state
  const [editingLineItem, setEditingLineItem] = useState<number | null>(null);
  const [editedPercentages, setEditedPercentages] = useState<Record<number, { pm_verified_percent: number }>>({});

  const handleBackNavigation = () => {
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push('/payments');
    }
  };

  const startEditingLineItem = (lineItemId: number, currentVerified: number) => {
    setEditingLineItem(lineItemId);
    setEditedPercentages(prev => ({
      ...prev,
      [lineItemId]: { pm_verified_percent: currentVerified }
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

    try {
      const response = await fetch(`/api/payments/${paymentAppId}/update-percentage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItemId,
          pm_verified_percent: editedPercentages[lineItemId].pm_verified_percent,
        }),
      });

      if (!response.ok) throw new Error('Failed to update percentage');

      setLineItems(prev => prev.map(li =>
        li.line_item_id === lineItemId
          ? { ...li, pm_verified_percent: editedPercentages[lineItemId].pm_verified_percent }
          : li
      ));

      setEditingLineItem(null);
      setEditedPercentages(prev => {
        const { [lineItemId]: removed, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Error saving percentage:', error);
      setError('Failed to save percentage');
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!paymentAppId) return;

      setLoading(true);
      try {
        const appId = Array.isArray(paymentAppId) ? paymentAppId[0] : paymentAppId;

        const { data: appData, error: appError } = await supabase
          .from("payment_applications")
          .select("*")
          .eq("id", appId)
          .single();

        if (appError) throw appError;

        const [projectResult, contractorResult, lineItemsResult] = await Promise.all([
          supabase.from("projects").select("*").eq("id", appData.project_id).single(),
          supabase.from("contractors").select("*").eq("id", appData.contractor_id).single(),
          supabase.from("payment_line_item_progress").select("*, line_item:project_line_items(*)").eq("payment_app_id", appId)
        ]);

        setPaymentApp(appData);
        setProject(projectResult.data || { id: appData.project_id, name: 'Unknown' });
        setContractor(contractorResult.data || { id: appData.contractor_id, name: 'Unknown' });
        setLineItems(lineItemsResult.data || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setLoading(false);
      }
    }

    fetchData();
  }, [paymentAppId]);

  useEffect(() => {
    async function fetchProjectLineItems() {
      if (!lineItems.length) return;
      const ids = lineItems.map(li => li.line_item_id).filter(Boolean);
      const { data } = await supabase.from('project_line_items').select('*').in('id', ids);
      if (data) setProjectLineItems(data);
    }
    fetchProjectLineItems();
  }, [lineItems]);

  const pliMap: Record<number, any> = {};
  projectLineItems.forEach(pli => { pliMap[pli.id] = pli; });

  const lineItemsForTable = lineItems.map((li, idx) => {
    const pli = pliMap[li.line_item_id] || {};
    const scheduled_value = Number(pli.scheduled_value) || 0;
    const description_of_work = pli.description_of_work || '';

    const pmVerifiedPercent = editedPercentages[li.line_item_id]?.pm_verified_percent ?? Number(li.pm_verified_percent || li.submitted_percent || 0);
    const previousPercent = Number(pli.from_previous_application) || 0;
    const thisPeriodPercent = Math.max(0, pmVerifiedPercent - previousPercent);

    const this_period = (thisPeriodPercent / 100) * scheduled_value;

    return {
      idx: idx + 1,
      line_item_id: li.line_item_id,
      description_of_work,
      scheduled_value,
      previous_percent: previousPercent,
      this_period_percent: thisPeriodPercent,
      pm_verified_percent: pmVerifiedPercent,
      current_payment: this_period,
    };
  });

  const grandTotal = lineItemsForTable.reduce((sum, li) => sum + li.current_payment, 0);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Authentication required');

      const response = await fetch(`/api/payments/${paymentAppId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ approvalNotes: notes.trim() || null }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      router.push(searchParams.get('returnTo') || '/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Authentication required');

      const response = await fetch(`/api/payments/${paymentAppId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rejectionNotes: notes.trim() || null }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      router.push(searchParams.get('returnTo') || '/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(false);
      setShowConfirmDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !paymentApp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={handleBackNavigation} className="text-primary hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBackNavigation} className="p-2 hover:bg-muted rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Payment #{paymentAppId}</h1>
                <p className="text-sm text-muted-foreground">{project?.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
              <p className="text-xs text-muted-foreground uppercase">{paymentApp?.status}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Project Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Project</p>
            <p className="font-medium">{project?.name}</p>
          </div>
          <div className="p-3 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Contractor</p>
            <p className="font-medium">{contractor?.name}</p>
            {contractor?.trade && <p className="text-xs text-muted-foreground">{contractor.trade}</p>}
          </div>
          <div className="p-3 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Submitted</p>
            <p className="font-medium">
              {paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '-'}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="text-xs">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Scheduled</th>
                  <th className="text-right p-3">Prev %</th>
                  <th className="text-right p-3">This %</th>
                  <th className="text-right p-3">Verified %</th>
                  <th className="text-right p-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {lineItemsForTable.map((li, i) => (
                  <tr key={li.idx} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                    <td className="p-3 text-sm">{li.idx}</td>
                    <td className="p-3 text-sm">{li.description_of_work}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(li.scheduled_value)}</td>
                    <td className="p-3 text-sm text-right text-muted-foreground">{li.previous_percent.toFixed(1)}%</td>
                    <td className="p-3 text-sm text-right text-muted-foreground">{li.this_period_percent.toFixed(1)}%</td>
                    <td className="p-3 text-sm text-right">
                      {editingLineItem === li.line_item_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editedPercentages[li.line_item_id]?.pm_verified_percent || ''}
                            onChange={(e) => setEditedPercentages(prev => ({
                              ...prev,
                              [li.line_item_id]: { pm_verified_percent: parseFloat(e.target.value) || 0 }
                            }))}
                            className="w-16 px-2 py-1 text-sm border border-border rounded"
                          />
                          <button onClick={() => saveLineItemPercentage(li.line_item_id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEditingLineItem} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingLineItem(li.line_item_id, li.pm_verified_percent)}
                          className="text-primary hover:underline"
                        >
                          {li.pm_verified_percent.toFixed(1)}%
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-sm text-right font-semibold">{formatCurrency(li.current_payment)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted border-t border-border">
                <tr>
                  <td colSpan={6} className="p-3 text-right font-semibold">Total:</td>
                  <td className="p-3 text-right font-bold text-lg">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {paymentApp?.pm_notes && (
          <div className="border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Contractor Notes</p>
            <p className="text-sm">{paymentApp.pm_notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={async () => {
              const { pdfBytes, filename } = await generateG703Pdf({
                project: { name: project?.name || '', address: '' },
                contractor: { name: contractor?.name || '', trade: contractor?.trade || '' },
                ownerName: '',
                clientName: '',
                contractorContact: '',
                contractorAddress: {},
                applicationNumber: Number(paymentAppId),
                invoiceDate: paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '',
                period: '',
                dateSubmitted: paymentApp?.created_at ? new Date(paymentApp.created_at).toLocaleDateString() : '',
                previousDate: '',
                lineItems: lineItemsForTable,
                changeOrders: [],
                includeChangeOrderPage: false,
              });
              const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>

          {paymentApp?.status !== 'approved' && (
            <>
              <button
                onClick={() => setShowConfirmDialog('reject')}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={() => setShowConfirmDialog('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-md w-full border border-border">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {showConfirmDialog === 'approve' ? 'Approve Payment?' : 'Reject Payment?'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Amount: {formatCurrency(grandTotal)}</p>
                <p className="text-sm text-muted-foreground">Contractor: {contractor?.name}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg resize-none"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>

              {error && <p className="text-sm text-destructive mb-4">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(null);
                    setNotes('');
                    setError(null);
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={showConfirmDialog === 'approve' ? handleApprove : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg ${
                    showConfirmDialog === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${showConfirmDialog === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentVerificationContent />
    </Suspense>
  );
}
