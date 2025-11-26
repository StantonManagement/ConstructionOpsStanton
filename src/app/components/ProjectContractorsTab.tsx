'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Phone, Mail, DollarSign, FileText, Send, Eye, Edit, Loader2, Users, GripVertical, Tag, Trash2, AlertCircle, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Project } from '../context/DataContext';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency } from '@/lib/theme';
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

interface BudgetLineItem {
  id: number;
  category_name: string;
  original_amount: number;
}

interface Contract {
  id: number;
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  display_order: number;
  contract_status?: string;
  budget_item_id?: number | null;
}

interface ContractWithContractor extends Contract {
  contractor_id: number;
  contractors: Contractor;
  line_items?: any[];
  property_budgets?: BudgetLineItem;
}

interface ContractorCardProps {
  contract: ContractWithContractor;
  onRequestPayment: (contractorId: number, contractId: number) => void;
  onEditContract: (contract: ContractWithContractor) => void;
  onViewLineItems: (contract: ContractWithContractor) => void;
  onViewDetails: (contract: ContractWithContractor) => void;
  onDelete: (contract: ContractWithContractor) => void;
  isRequesting: boolean;
  isDragging?: boolean;
}

// Sortable Contractor Card Component
function SortableContractorCard({ contract, onRequestPayment, onEditContract, onViewLineItems, onViewDetails, onDelete, isRequesting }: ContractorCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contract.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ContractorCard
        contract={contract}
        onRequestPayment={onRequestPayment}
        onEditContract={onEditContract}
        onViewLineItems={onViewLineItems}
        onViewDetails={onViewDetails}
        onDelete={onDelete}
        isRequesting={isRequesting}
        isDragging={isDragging}
      />
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-4 left-4 cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded touch-none"
        style={{ touchAction: 'none' }} // Important for mobile drag
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

// Contractor Card Component
function ContractorCard({ contract, onRequestPayment, onEditContract, onViewLineItems, onViewDetails, onDelete, isRequesting, isDragging }: ContractorCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTradeIcon = (trade: string) => {
    const icons: { [key: string]: string } = {
      'electrical': '⚡',
      'plumbing': '🚰',
      'hvac': '❄️',
      'carpentry': '🔨',
      'concrete': '🧱',
      'painting': '🎨',
      'roofing': '🏠',
      'landscaping': '🌳',
      'flooring': '📐',
    };
    return icons[trade.toLowerCase()] || '🔧';
  };

  const originalAmount = contract.original_contract_amount || 0;
  const currentAmount = contract.contract_amount || 0;
  const changeOrders = currentAmount - originalAmount;
  const paidToDate = contract.paid_to_date || 0;
  const remaining = currentAmount - paidToDate;
  const percentComplete = currentAmount > 0 
    ? Math.round((paidToDate / currentAmount) * 100) 
    : 0;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer relative pl-12"
      onClick={() => onViewDetails(contract)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
            {getTradeIcon(contract.contractors.trade)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {contract.contractors.name}
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {contract.contractors.trade}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Link Badge */}
      <div className="mb-4">
        {contract.property_budgets ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <Tag className="w-3 h-3" />
            Budget: {contract.property_budgets.category_name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100 italic">
            <Tag className="w-3 h-3" />
            No Budget Item Linked
          </span>
        )}
      </div>

      {/* Contact Info */}
      {(contract.contractors.phone || contract.contractors.email) && (
        <div className="mb-4 space-y-1">
          {contract.contractors.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{contract.contractors.phone}</span>
            </div>
          )}
          {contract.contractors.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{contract.contractors.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Contract Summary - Three Money Columns */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Original</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(originalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change Orders</p>
            <p className={`text-sm font-semibold ${changeOrders > 0 ? 'text-orange-600' : changeOrders < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {changeOrders > 0 && '+'}{formatCurrency(changeOrders)}
            </p>
            {changeOrders !== 0 && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${
                changeOrders > 0 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
              }`}>
                CO
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Total</p>
            <p className="text-sm font-semibold text-blue-600">
              {formatCurrency(currentAmount)}
            </p>
          </div>
        </div>
        
        {/* Payment Status */}
        <div className="grid grid-cols-2 gap-3 mb-3 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Paid to Date</p>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(paidToDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Remaining</p>
            <p className="text-sm font-semibold text-orange-600">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Line Items Preview */}
      {contract.line_items && contract.line_items.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Recent Line Items</p>
          <div className="space-y-1">
            {contract.line_items.slice(0, 3).map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate">{item.description || `Item ${index + 1}`}</span>
                <span className="text-gray-900 font-medium ml-2">
                  {formatCurrency(item.amount || 0)}
                </span>
              </div>
            ))}
            {contract.line_items.length > 3 && (
              <p className="text-xs text-gray-500 italic">
                +{contract.line_items.length - 3} more items
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPayment(contract.contractor_id, contract.id);
          }}
          disabled={isRequesting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Request Payment</span>
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditContract(contract);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm">Edit</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewLineItems(contract);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">Details</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contract);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Remove from Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Main ProjectContractorsTab Component
interface ProjectContractorsTabProps {
  project: Project;
  onRequestPayment: (contractorId: number, contractId: number) => void;
  onEditContract: (contract: ContractWithContractor) => void;
  onViewLineItems: (contract: ContractWithContractor) => void;
  onViewContractorDetail?: (contract: ContractWithContractor) => void;
}

const ProjectContractorsTab: React.FC<ProjectContractorsTabProps> = ({
  project,
  onRequestPayment,
  onEditContract,
  onViewLineItems,
  onViewContractorDetail
}) => {
  const [contracts, setContracts] = useState<ContractWithContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayment, setRequestingPayment] = useState<number | null>(null);
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [availableContractors, setAvailableContractors] = useState<Contractor[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [newContract, setNewContract] = useState({
    contract_amount: 0,
    budget_item_id: ''
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractWithContractor | null>(null);
  
  // View mode and sorting state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [sortColumn, setSortColumn] = useState<string>('display_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_contractors')
        .select(`
          id,
          project_id,
          contract_amount,
          original_contract_amount,
          paid_to_date,
          display_order,
          contract_status,
          contractor_id,
          budget_item_id,
          contractors (
            id,
            name,
            trade,
            phone,
            email
          ),
          property_budgets (
            id,
            category_name,
            original_amount
          )
        `)
        .eq('project_id', project.id)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase error fetching contractors:', error);
        throw error;
      }

      // Fix the data structure (contractors might be an array)
      const fixedData = (data || []).map((contract) => ({
        ...contract,
        contractors: Array.isArray(contract.contractors) 
          ? contract.contractors[0] 
          : contract.contractors,
        property_budgets: Array.isArray(contract.property_budgets)
          ? contract.property_budgets[0]
          : contract.property_budgets
      })) as ContractWithContractor[];

      setContracts(fixedData);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const handleRequestPayment = async (contractorId: number, contractId: number) => {
    setRequestingPayment(contractId);
    try {
      await onRequestPayment(contractorId, contractId);
    } finally {
      setRequestingPayment(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = contracts.findIndex((c) => c.id === active.id);
    const newIndex = contracts.findIndex((c) => c.id === over.id);

    // Optimistic update
    const reorderedContracts = arrayMove(contracts, oldIndex, newIndex);
    setContracts(reorderedContracts);

    // Update display_order in database
    try {
      const updates = reorderedContracts.map((contract, index) => ({
        id: contract.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('project_contractors')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating display order:', error);
          // Rollback on error
          fetchContractors();
          return;
        }
      }
    } catch (error) {
      console.error('Error reordering contractors:', error);
      // Rollback on error
      fetchContractors();
    }
  };

  const handleViewDetails = (contract: ContractWithContractor) => {
    if (onViewContractorDetail) {
      onViewContractorDetail(contract);
    }
  };

  const handleDeleteClick = (contract: ContractWithContractor) => {
    setContractToDelete(contract);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!contractToDelete) return;

    setDeleteLoading(true);
    try {
      // Check for dependent payment applications
      const { data: paymentApps, error: checkError } = await supabase
        .from('payment_applications')
        .select('id, status')
        .eq('project_id', project.id)
        .eq('contractor_id', contractToDelete.contractor_id);

      if (checkError) throw checkError;

      // Check if there are any approved or pending payment applications
      const hasActivePayments = paymentApps && paymentApps.some(
        app => app.status === 'approved' || app.status === 'submitted' || app.status === 'pending'
      );

      if (hasActivePayments) {
        alert('Cannot delete contract with active or approved payment applications. Please archive or reject them first.');
        setDeleteLoading(false);
        return;
      }

      // Delete the contract
      const { error } = await supabase
        .from('project_contractors')
        .delete()
        .eq('id', contractToDelete.id);

      if (error) throw error;

      // Refresh the list
      await fetchContractors();
      setShowDeleteConfirmation(false);
      setContractToDelete(null);
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete contract');
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchAvailableContractors = async () => {
    setLoadingContractors(true);
    try {
      // Get all contractors
      const { data: allContractors, error: contractorsError } = await supabase
        .from('contractors')
        .select('id, name, trade, phone, email')
        .order('name');
      
      if (contractorsError) throw contractorsError;
      
      // Filter out contractors already on this project
      const existingContractorIds = contracts.map(c => c.contractor_id);
      const available = (allContractors || []).filter(
        c => !existingContractorIds.includes(c.id)
      );
      
      setAvailableContractors(available);

      // Get budget line items for this project
      const { data: budgetData, error: budgetError } = await supabase
        .from('property_budgets')
        .select('id, category_name, original_amount')
        .eq('project_id', project.id)
        .eq('is_active', true)
        .order('category_name');

      if (budgetError) throw budgetError;
      setBudgetItems(budgetData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoadingContractors(false);
    }
  };

  const handleAddContractor = async () => {
    if (!selectedContractorId) {
      alert('Please select a contractor');
      return;
    }
    
    if (newContract.contract_amount <= 0) {
      alert('Please enter a contract amount');
      return;
    }
    
    try {
      // Get the next display order
      const maxOrder = contracts.length > 0
        ? Math.max(...contracts.map(c => c.display_order || 0))
        : 0;
      
      const { data, error } = await supabase
        .from('project_contractors')
        .insert({
          project_id: project.id,
          contractor_id: selectedContractorId,
          contract_amount: newContract.contract_amount,
          original_contract_amount: newContract.contract_amount,
          paid_to_date: 0,
          display_order: maxOrder + 1,
          contract_status: 'active',
          budget_item_id: newContract.budget_item_id ? parseInt(newContract.budget_item_id) : null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh contractors list
      await fetchContractors();
      
      // Reset form and close modal
      setSelectedContractorId(null);
      setNewContract({ contract_amount: 0, budget_item_id: '' });
      setShowAddContractorModal(false);
      alert('Contractor added to project successfully!');
    } catch (error) {
      console.error('Error adding contractor:', error);
      alert('Failed to add contractor. Please try again.');
    }
  };

  const openAddContractorModal = () => {
    fetchAvailableContractors();
    setShowAddContractorModal(true);
  };

  // Sorting logic for table view
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort contracts based on current sort state
  const sortedContracts = React.useMemo(() => {
    const sorted = [...contracts];
    
    if (viewMode === 'card') {
      // In card view, always sort by display_order
      return sorted.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
    
    // In table view, sort by selected column
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortColumn) {
        case 'name':
          aValue = a.contractors?.name?.toLowerCase() || '';
          bValue = b.contractors?.name?.toLowerCase() || '';
          break;
        case 'trade':
          aValue = a.contractors?.trade?.toLowerCase() || '';
          bValue = b.contractors?.trade?.toLowerCase() || '';
          break;
        case 'contract_amount':
          aValue = a.contract_amount || 0;
          bValue = b.contract_amount || 0;
          break;
        case 'paid_to_date':
          aValue = a.paid_to_date || 0;
          bValue = b.paid_to_date || 0;
          break;
        case 'remaining':
          aValue = (a.contract_amount || 0) - (a.paid_to_date || 0);
          bValue = (b.contract_amount || 0) - (b.paid_to_date || 0);
          break;
        case 'status':
          aValue = a.contract_status || '';
          bValue = b.contract_status || '';
          break;
        default:
          aValue = a.display_order || 0;
          bValue = b.display_order || 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [contracts, sortColumn, sortDirection, viewMode]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contractors Yet</h3>
        <p className="text-gray-600 mb-6">
          Add contractors to this project to start managing contracts and payments.
        </p>
        <button 
          onClick={openAddContractorModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contractor</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project Contractors</h2>
          <p className="text-sm text-gray-600 mt-1">
          {contracts.length} contractor{contracts.length !== 1 ? 's' : ''} on this project
          {viewMode === 'card' && ' • Drag to reorder'}
        </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Table</span>
            </button>
          </div>
          <button 
            onClick={openAddContractorModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contractor</span>
          </button>
        </div>
      </div>

      {/* Card View with Drag and Drop */}
      {viewMode === 'card' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedContracts.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedContracts.map((contract) => (
                <SortableContractorCard
                  key={contract.id}
                  contract={contract}
                  onRequestPayment={handleRequestPayment}
                  onEditContract={onEditContract}
                  onViewLineItems={onViewLineItems}
                  onViewDetails={handleViewDetails}
                  onDelete={handleDeleteClick}
                  isRequesting={requestingPayment === contract.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Table View with Sorting */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <DataTable
            data={sortedContracts}
            columns={[
              {
                header: (
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Contractor</span>
                    {sortColumn === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                    {sortColumn !== 'name' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                      {row.contractors?.trade ? 
                        (row.contractors.trade.toLowerCase() === 'electrical' ? '⚡' :
                         row.contractors.trade.toLowerCase() === 'plumbing' ? '🚰' :
                         row.contractors.trade.toLowerCase() === 'hvac' ? '❄️' :
                         row.contractors.trade.toLowerCase() === 'carpentry' ? '🔨' :
                         row.contractors.trade.toLowerCase() === 'concrete' ? '🧱' :
                         row.contractors.trade.toLowerCase() === 'painting' ? '🎨' :
                         row.contractors.trade.toLowerCase() === 'roofing' ? '🏠' :
                         row.contractors.trade.toLowerCase() === 'landscaping' ? '🌳' :
                         row.contractors.trade.toLowerCase() === 'flooring' ? '📐' : '🔧')
                        : '🔧'
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{row.contractors?.name}</div>
                      <div className="text-xs text-gray-500">{row.contractors?.trade}</div>
                    </div>
                  </div>
                )
              },
              {
                header: 'Budget Link',
                accessor: (row: ContractWithContractor) => (
                  row.property_budgets ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      <Tag className="w-3 h-3" />
                      {row.property_budgets.category_name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unlinked</span>
                  )
                )
              },
              {
                header: 'Contact',
                accessor: (row: ContractWithContractor) => (
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {row.contractors?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {row.contractors.phone}
                      </div>
                    )}
                    {row.contractors?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {row.contractors.email}
                      </div>
                    )}
                    {!row.contractors?.phone && !row.contractors?.email && (
                      <span className="text-gray-400 italic">No contact</span>
                    )}
                  </div>
                )
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('contract_amount')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Contract Amount</span>
                    {sortColumn === 'contract_amount' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                    {sortColumn !== 'contract_amount' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => {
                  const original = row.original_contract_amount || 0;
                  const current = row.contract_amount || 0;
                  const changeOrders = current - original;
                  return (
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{formatCurrency(current)}</div>
                      {changeOrders !== 0 && (
                        <div className={`text-xs ${changeOrders > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {changeOrders > 0 && '+'}{formatCurrency(changeOrders)} CO
                        </div>
                      )}
                    </div>
                  );
                },
                align: 'right' as const
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('paid_to_date')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Paid to Date</span>
                    {sortColumn === 'paid_to_date' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                    {sortColumn !== 'paid_to_date' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <div className="font-medium text-green-600">
                    {formatCurrency(row.paid_to_date || 0)}
                  </div>
                ),
                align: 'right' as const
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('remaining')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Remaining</span>
                    {sortColumn === 'remaining' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                    {sortColumn !== 'remaining' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => {
                  const remaining = (row.contract_amount || 0) - (row.paid_to_date || 0);
                  return (
                    <div className="font-medium text-orange-600">
                      {formatCurrency(remaining)}
                    </div>
                  );
                },
                align: 'right' as const
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Status</span>
                    {sortColumn === 'status' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                    {sortColumn !== 'status' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <SignalBadge status={row.contract_status === 'active' ? 'success' : 'neutral'}>
                    {row.contract_status || 'N/A'}
                  </SignalBadge>
                )
              },
              {
                header: 'Actions',
                accessor: (row: ContractWithContractor) => (
                  <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestPayment(row.contractor_id, row.id);
                      }}
                      disabled={requestingPayment === row.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
                      title="Request Payment"
                    >
                      {requestingPayment === row.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditContract(row);
                      }}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      title="Edit Contract"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewLineItems(row);
                      }}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(row);
                      }}
                      className="p-1.5 text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded transition-colors"
                      title="Remove from Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
                align: 'right' as const
              }
            ]}
            emptyMessage="No contractors assigned to this project"
            onRowClick={handleViewDetails}
          />
        </div>
      )}

      {/* Add Contractor Modal */}
      {showAddContractorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Contractor to Project</h3>
            
            {loadingContractors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading contractors...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Contractor *</label>
                  <select
                    value={selectedContractorId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedContractorId(value ? parseInt(value) : null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select a contractor --</option>
                    {availableContractors.map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.name} - {contractor.trade}
                      </option>
                    ))}
                  </select>
                  {availableContractors.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">No new contractors available. Create one first.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contract Amount *</label>
                  <input
                    type="number"
                    value={newContract.contract_amount}
                    onChange={(e) => setNewContract({ ...newContract, contract_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Line Item</label>
                  <select
                    value={newContract.budget_item_id}
                    onChange={(e) => setNewContract({ ...newContract, budget_item_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {budgetItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.category_name} ({formatCurrency(item.original_amount)})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Link this contract to a budget category for automatic tracking.</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddContractorModal(false);
                  setSelectedContractorId(null);
                  setNewContract({ contract_amount: 0, budget_item_id: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {!loadingContractors && (
                <button
                  onClick={handleAddContractor}
                  disabled={!selectedContractorId || newContract.contract_amount <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Project
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove from Project Confirmation Modal */}
      {showDeleteConfirmation && contractToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirmation(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Warning Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Remove from Project</h3>
                <p className="text-sm text-gray-600 mt-1">This will remove the contractor from this project only</p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-orange-700 text-sm font-bold">!</span>
                </div>
                <div>
                  <p className="text-orange-800 font-medium mb-2">
                    Remove {contractToDelete.contractors.name} from this project?
                  </p>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• Contract amount: {formatCurrency(contractToDelete.contract_amount)}</li>
                    <li>• This will remove the contract and all associated line items from this project</li>
                    <li>• <span className="font-semibold text-green-700">The contractor will remain in your system for other projects</span></li>
                    <li>• This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setContractToDelete(null);
                }} 
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-lg"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Remove from Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectContractorsTab;
