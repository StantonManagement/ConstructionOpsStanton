'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, AlertCircle, Send, Plus, FileSpreadsheet, GripVertical, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ManualPaymentEntryModal from './ManualPaymentEntryModal';
import PaymentApplicationList from './shared/PaymentApplicationList';
import type { PaymentApplication } from './shared/PaymentApplicationRow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone?: string;
  email?: string;
}

interface Contract {
  id: number;
  project_id: number;
  subcontractor_id: number;
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  start_date?: string;
  end_date?: string;
  contract_status?: string;
}

interface LineItem {
  id: number;
  contract_id: number;
  item_no?: string;
  description_of_work: string;
  scheduled_value: number;
  change_order_amount: number;
  display_order: number;
  from_previous_application?: number;
  this_period?: number;
  percent_completed?: number;
}

interface ContractorDetailViewProps {
  contract: Contract;
  contractor: Contractor;
  onBack: () => void;
}

// Sortable Line Item Row Component
function SortableLineItemRow({ 
  item, 
  index, 
  formatCurrency,
  isDragging 
}: { 
  item: LineItem; 
  index: number; 
  formatCurrency: (amount: number) => string;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingThis,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDraggingThis ? 0.5 : 1,
  };

  const originalAmount = item.scheduled_value || 0;
  const coAmount = item.change_order_amount || 0;
  const currentAmount = originalAmount + coAmount;
  const prevPercent = item.from_previous_application || 0;
  const currPercent = item.percent_completed || 0;
  const thisPeriodPercent = Math.max(0, currPercent - prevPercent);
  const paidAmount = (currentAmount * currPercent) / 100;

  const isNewItem = originalAmount === 0 && coAmount > 0;
  const hasChangeOrder = coAmount !== 0;

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`border-b border-gray-200 hover:bg-gray-50 ${
        hasChangeOrder ? 'bg-orange-50' : ''
      } ${isNewItem ? 'bg-yellow-50' : ''}`}
    >
      <td className="px-4 py-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
      <td className="px-4 py-3 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          {item.description_of_work}
          {isNewItem && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800">
              NEW
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-900">
        {formatCurrency(originalAmount)}
      </td>
      <td className={`px-4 py-3 text-sm text-right font-semibold ${
        coAmount > 0 ? 'text-orange-600' : coAmount < 0 ? 'text-red-600' : 'text-gray-900'
      }`}>
        {coAmount > 0 && '+'}{formatCurrency(coAmount)}
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
        {formatCurrency(currentAmount)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-600">
        {prevPercent.toFixed(2)}%
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-600">
        {currPercent.toFixed(2)}%
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
        {formatCurrency(paidAmount)}
      </td>
    </tr>
  );
}

const ContractorDetailView: React.FC<ContractorDetailViewProps> = ({ contract, contractor, onBack }) => {
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
  const [showChangeOrderModal, setShowChangeOrderModal] = useState(false);
  const [exportingToExcel, setExportingToExcel] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [paymentApplications, setPaymentApplications] = useState<PaymentApplication[]>([]);
  const [loadingPaymentApps, setLoadingPaymentApps] = useState(false);
  const [newLineItem, setNewLineItem] = useState({
    description_of_work: '',
    scheduled_value: 0,
    item_no: '',
  });
  const [newChangeOrder, setNewChangeOrder] = useState({
    description: '',
    amount: 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchLineItems = useCallback(async () => {
    setLoading(true);
    try {
      // Get the contractor ID - handle both contractor_id and subcontractor_id fields
      const contractorId = (contract as any).contractor_id || (contract as any).subcontractor_id || contractor?.id;
      
      if (!contractorId || !contract.project_id) {
        console.error('Missing contractor ID or project ID', { contractorId, project_id: contract.project_id });
        setLineItems([]);
        setLoading(false);
        return;
      }

      // First, try to find the contracts record that matches this project + contractor
      // Note: contracts table uses 'subcontractor_id', project_contractors uses 'contractor_id'
      const { data: contractRecord, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('project_id', contract.project_id)
        .eq('subcontractor_id', contractorId)
        .single();

      if (contractError) {
        console.log('No contract record found in contracts table, trying project_line_items directly');
        // If no contract found, query project_line_items by project_id + contractor_id directly
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('project_line_items')
          .select('*')
          .eq('project_id', contract.project_id)
          .eq('contractor_id', contractorId)
          .order('display_order', { ascending: true });
        
        if (fallbackError) {
          console.error('Error with fallback query:', fallbackError);
          setLineItems([]);
        } else {
          setLineItems(fallbackData || []);
        }
        return;
      }

      // Now fetch line items using the contracts.id
      const { data, error } = await supabase
        .from('project_line_items')
        .select('*')
        .eq('contract_id', contractRecord.id)
        .order('display_order', { ascending: true});

      if (error) {
        console.error('Error fetching line items:', error);
        throw error;
      }

      setLineItems(data || []);
    } catch (error) {
      console.error('Error fetching line items:', error);
      setLineItems([]);
    } finally {
      setLoading(false);
    }
  }, [contract.id, contract.project_id, (contract as any).contractor_id, (contract as any).subcontractor_id, contractor?.id]);

  useEffect(() => {
    fetchLineItems();
  }, [fetchLineItems]);

  // Fetch payment applications for this contractor on this project
  const fetchPaymentApplications = useCallback(async () => {
    setLoadingPaymentApps(true);
    try {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', contract.project_id)
        .eq('contractor_id', contractor.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPaymentApplications(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
      setPaymentApplications([]);
    } finally {
      setLoadingPaymentApps(false);
    }
  }, [contract.project_id, contractor.id]);

  useEffect(() => {
    fetchPaymentApplications();
  }, [fetchPaymentApplications]);

  useEffect(() => {
    const fetchProjectName = async () => {
      if (contract.project_id) {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('id', contract.project_id)
          .single();
        
        if (data) {
          setProjectName(data.name);
        }
      }
    };
    
    fetchProjectName();
  }, [contract.project_id]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = lineItems.findIndex((item) => item.id === active.id);
    const newIndex = lineItems.findIndex((item) => item.id === over.id);

    // Optimistic update
    const reorderedItems = arrayMove(lineItems, oldIndex, newIndex);
    setLineItems(reorderedItems);

    // Update display_order in database
    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('project_line_items')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating display order:', error);
          // Rollback on error
          fetchLineItems();
          return;
        }
      }
    } catch (error) {
      console.error('Error reordering line items:', error);
      // Rollback on error
      fetchLineItems();
    }
  };

  // Handler functions for action buttons
  const handleExportToExcel = async () => {
    setExportingToExcel(true);
    try {
      // Simple CSV export (can be enhanced with xlsx library later)
      const headers = ['#', 'Description', 'Original', 'COs', 'Current', 'Prev %', 'Curr %', 'Paid'];
      const rows = lineItems.map((item, index) => {
        const originalAmount = item.scheduled_value || 0;
        const coAmount = item.change_order_amount || 0;
        const currentAmount = originalAmount + coAmount;
        const prevPercent = item.from_previous_application || 0;
        const currPercent = item.percent_completed || 0;
        const paidAmount = (currentAmount * currPercent) / 100;
        
        return [
          index + 1,
          `"${item.description_of_work.replace(/"/g, '""')}"`,
          originalAmount,
          coAmount,
          currentAmount,
          prevPercent.toFixed(2) + '%',
          currPercent.toFixed(2) + '%',
          paidAmount.toFixed(2),
        ].join(',');
      });
      
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contractor.name}_LineItems_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Line items exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export line items. Please try again.');
    } finally {
      setExportingToExcel(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!newLineItem.description_of_work.trim()) {
      alert('Please enter a description');
      return;
    }
    
    try {
      // First, find or create the contracts record
      let contractRecordId = null;
      
      // Get the contractor ID - handle both contractor_id and subcontractor_id fields
      const contractorId = (contract as any).contractor_id || (contract as any).subcontractor_id || contractor?.id;
      
      const { data: existingContract, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('project_id', contract.project_id)
        .eq('subcontractor_id', contractorId)
        .single();
      
      if (contractError && contractError.code === 'PGRST116') {
        // No contract found, create one
        const { data: newContract, error: createError } = await supabase
          .from('contracts')
          .insert({
            project_id: contract.project_id,
            subcontractor_id: contractorId,
            contract_amount: contract.contract_amount || 0,
            original_contract_amount: contract.original_contract_amount || contract.contract_amount || 0,
            start_date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating contract record:', createError);
          throw createError;
        }
        contractRecordId = newContract.id;
      } else if (existingContract) {
        contractRecordId = existingContract.id;
      } else {
        throw new Error('Failed to get or create contract record');
      }
      
      // Get the next display order
      const maxOrder = lineItems.length > 0 
        ? Math.max(...lineItems.map(item => item.display_order || 0))
        : 0;
      
      const { data, error } = await supabase
        .from('project_line_items')
        .insert({
          contract_id: contractRecordId,
          project_id: contract.project_id,
          contractor_id: contractorId,
          description_of_work: newLineItem.description_of_work,
          scheduled_value: newLineItem.scheduled_value,
          item_no: newLineItem.item_no || null,
          change_order_amount: 0,
          display_order: maxOrder + 1,
          from_previous_application: 0,
          percent_completed: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh line items
      await fetchLineItems();
      
      // Reset form and close modal
      setNewLineItem({ description_of_work: '', scheduled_value: 0, item_no: '' });
      setShowAddLineItemModal(false);
      alert('Line item added successfully!');
    } catch (error) {
      console.error('Error adding line item:', error);
      alert('Failed to add line item. Please try again.');
    }
  };

  const handleRequestPayment = async () => {
    setRequestingPayment(true);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: contract.project_id,
          contractorIds: [contractor.id],
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to send payment request.');
      } else {
        alert('Payment request sent successfully!\n\nThe contractor will receive an SMS notification.');
        // Optionally navigate to payment applications view
        // window.location.href = '/?tab=payment-applications';
      }
    } catch (error) {
      console.error('Error requesting payment:', error);
      alert('Network error. Please try again.');
    } finally {
      setRequestingPayment(false);
    }
  };

  const handleAddChangeOrder = async () => {
    if (!newChangeOrder.description.trim()) {
      alert('Please enter a change order description');
      return;
    }
    
    if (newChangeOrder.amount === 0) {
      alert('Please enter a change order amount');
      return;
    }
    
    try {
      // Update contract amount
      const newContractAmount = (contract.contract_amount || 0) + newChangeOrder.amount;
      
      const { error } = await supabase
        .from('contracts')
        .update({ contract_amount: newContractAmount })
        .eq('id', contract.id);
      
      if (error) throw error;
      
      // Note: In a full implementation, you would also create a change_orders record
      // to track the history of all change orders
      
      // Refresh the view by going back and reopening
      alert(`Change order added successfully!\n\nAmount: ${formatCurrency(newChangeOrder.amount)}\nNew Contract Total: ${formatCurrency(newContractAmount)}`);
      
      // Reset form and close modal
      setNewChangeOrder({ description: '', amount: 0 });
      setShowChangeOrderModal(false);
      
      // Refresh the page or notify parent to refresh
      window.location.reload();
    } catch (error) {
      console.error('Error adding change order:', error);
      alert('Failed to add change order. Please try again.');
    }
  };

  // Calculate totals
  const originalContractTotal = contract.original_contract_amount || 0;
  const changeOrdersTotal = (contract.contract_amount || 0) - originalContractTotal;
  const currentContractTotal = contract.contract_amount || 0;
  const paidToDate = contract.paid_to_date || 0;
  const remaining = currentContractTotal - paidToDate;

  // Calculate line item totals
  const lineItemTotals = lineItems.reduce(
    (acc, item) => {
      const originalAmount = item.scheduled_value || 0;
      const coAmount = item.change_order_amount || 0;
      const currentAmount = originalAmount + coAmount;
      const currPercent = item.percent_completed || 0;
      const paidAmount = (currentAmount * currPercent) / 100;

      return {
        original: acc.original + originalAmount,
        changeOrders: acc.changeOrders + coAmount,
        current: acc.current + currentAmount,
        paid: acc.paid + paidAmount,
      };
    },
    { original: 0, changeOrders: 0, current: 0, paid: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Contractors</span>
      </button>

      {/* Contractor Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{contractor.name}</h1>
            <p className="text-gray-600">{contractor.trade}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {contract.contract_status || 'Active'}
          </span>
        </div>

        {/* Contact Info */}
        {(contractor.phone || contractor.email) && (
          <div className="flex gap-6 text-sm text-gray-600">
            {contractor.phone && <div>Phone: {contractor.phone}</div>}
            {contractor.email && <div>Email: {contractor.email}</div>}
          </div>
        )}
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-500">Original Contract</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(originalContractTotal)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-medium text-gray-500">Change Orders</h3>
          </div>
          <p className={`text-2xl font-bold ${
            changeOrdersTotal > 0 ? 'text-orange-600' : changeOrdersTotal < 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {changeOrdersTotal > 0 && '+'}{formatCurrency(changeOrdersTotal)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-500">Current Total</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentContractTotal)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-medium text-gray-500">Paid to Date</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paidToDate)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-medium text-gray-500">Remaining</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(remaining)}</p>
        </div>
      </div>

      {/* Payment Applications Section */}
      <PaymentApplicationList
        applications={paymentApplications}
        loading={loadingPaymentApps}
        onReview={(id) => router.push(`/payments/${id}/verify`)}
        onRefresh={fetchPaymentApplications}
        showSummary={true}
        emptyMessage="No payment applications yet. Create one using the button above."
      />

      {/* Line Items Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <p className="text-sm text-gray-600 mt-1">
              {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} • Drag to reorder
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportToExcel}
              disabled={exportingToExcel || lineItems.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingToExcel ? 'Exporting...' : 'Export to Excel'}</span>
            </button>
            <button 
              onClick={() => setShowAddLineItemModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Line Item</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : lineItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No line items yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lineItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ≡
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Original
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        COs
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prev %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Curr %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lineItems.map((item, index) => (
                      <SortableLineItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-4 py-3" colSpan={3}>
                        <span className="text-sm text-gray-900">TOTALS</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(lineItemTotals.original)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${
                        lineItemTotals.changeOrders > 0 ? 'text-orange-600' : 
                        lineItemTotals.changeOrders < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {lineItemTotals.changeOrders > 0 && '+'}{formatCurrency(lineItemTotals.changeOrders)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-600">
                        {formatCurrency(lineItemTotals.current)}
                      </td>
                      <td className="px-4 py-3" colSpan={2}></td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {formatCurrency(lineItemTotals.paid)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={handleRequestPayment}
          disabled={requestingPayment}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          <span>{requestingPayment ? 'Sending...' : 'Request Payment'}</span>
        </button>
        <button 
          onClick={() => setShowManualEntryModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Edit className="w-5 h-5" />
          <span>Create Payment App</span>
        </button>
        <button 
          onClick={() => setShowChangeOrderModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Change Order</span>
        </button>
      </div>

      {/* Add Line Item Modal */}
      {showAddLineItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Line Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Number (Optional)</label>
                <input
                  type="text"
                  value={newLineItem.item_no}
                  onChange={(e) => setNewLineItem({ ...newLineItem, item_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newLineItem.description_of_work}
                  onChange={(e) => setNewLineItem({ ...newLineItem, description_of_work: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the work"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Value *</label>
                <input
                  type="number"
                  value={newLineItem.scheduled_value}
                  onChange={(e) => setNewLineItem({ ...newLineItem, scheduled_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddLineItemModal(false);
                  setNewLineItem({ description_of_work: '', scheduled_value: 0, item_no: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLineItem}
                disabled={!newLineItem.description_of_work.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Line Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Change Order Modal */}
      {showChangeOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Change Order</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newChangeOrder.description}
                  onChange={(e) => setNewChangeOrder({ ...newChangeOrder, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the change order"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={newChangeOrder.amount}
                  onChange={(e) => setNewChangeOrder({ ...newChangeOrder, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use negative values for deductions. Current contract: {formatCurrency(contract.contract_amount || 0)}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  New Contract Total: {formatCurrency((contract.contract_amount || 0) + newChangeOrder.amount)}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowChangeOrderModal(false);
                  setNewChangeOrder({ description: '', amount: 0 });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChangeOrder}
                disabled={!newChangeOrder.description.trim() || newChangeOrder.amount === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Change Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Entry Modal */}
      {showManualEntryModal && (
        <ManualPaymentEntryModal
          projectId={contract.project_id}
          projectName={projectName || 'Project'}
          contractorId={contractor.id}
          contractorName={contractor.name}
          onClose={() => setShowManualEntryModal(false)}
          onSuccess={(paymentAppId) => {
            fetchPaymentApplications(); // Refresh the list to show new payment app
          }}
        />
      )}
    </div>
  );
};

export default ContractorDetailView;

