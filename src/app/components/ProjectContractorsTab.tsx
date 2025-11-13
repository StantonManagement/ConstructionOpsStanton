'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Phone, Mail, DollarSign, FileText, Send, Eye, Edit, Loader2, Users, GripVertical } from 'lucide-react';
import { Project } from '../context/DataContext';
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
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  display_order: number;
  start_date?: string;
  end_date?: string;
  contract_status?: string;
}

interface ContractWithContractor extends Contract {
  subcontractor_id: number;
  contractors: Contractor;
  line_items?: any[];
}

interface ContractorCardProps {
  contract: ContractWithContractor;
  onRequestPayment: (contractorId: number, contractId: number) => void;
  onEditContract: (contract: ContractWithContractor) => void;
  onViewLineItems: (contract: ContractWithContractor) => void;
  onViewDetails: (contract: ContractWithContractor) => void;
  isRequesting: boolean;
  isDragging?: boolean;
}

// Sortable Contractor Card Component
function SortableContractorCard({ contract, onRequestPayment, onEditContract, onViewLineItems, onViewDetails, isRequesting }: ContractorCardProps) {
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
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ContractorCard
        contract={contract}
        onRequestPayment={onRequestPayment}
        onEditContract={onEditContract}
        onViewLineItems={onViewLineItems}
        onViewDetails={onViewDetails}
        isRequesting={isRequesting}
        isDragging={isDragging}
      />
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-4 left-4 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

// Contractor Card Component
function ContractorCard({ contract, onRequestPayment, onEditContract, onViewLineItems, onViewDetails, isRequesting, isDragging }: ContractorCardProps) {
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
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer relative"
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
            onRequestPayment(contract.subcontractor_id, contract.id);
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
            <span className="text-sm">Edit Contract</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewLineItems(contract);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">View Details</span>
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
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [newContract, setNewContract] = useState({
    contract_amount: 0,
    start_date: '',
    end_date: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_amount,
          original_contract_amount,
          paid_to_date,
          display_order,
          start_date,
          end_date,
          contract_status,
          subcontractor_id,
          contractors (
            id,
            name,
            trade,
            phone,
            email
          )
        `)
        .eq('project_id', project.id)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase error fetching contractors:', error);
        throw error;
      }

      console.log('Fetched contracts data:', data);

      // Fix the data structure (contractors might be an array)
      const fixedData = (data || []).map((contract) => ({
        ...contract,
        contractors: Array.isArray(contract.contractors) 
          ? contract.contractors[0] 
          : contract.contractors,
      })) as ContractWithContractor[];

      console.log('Fixed contracts data:', fixedData);
      setContracts(fixedData);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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
          .from('contracts')
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

  const fetchAvailableContractors = async () => {
    setLoadingContractors(true);
    try {
      // Get all contractors
      const { data: allContractors, error } = await supabase
        .from('contractors')
        .select('id, name, trade, phone, email')
        .order('name');
      
      if (error) throw error;
      
      // Filter out contractors already on this project
      const existingContractorIds = contracts.map(c => c.subcontractor_id);
      const available = (allContractors || []).filter(
        c => !existingContractorIds.includes(c.id)
      );
      
      setAvailableContractors(available);
    } catch (error) {
      console.error('Error fetching available contractors:', error);
      alert('Failed to load contractors. Please try again.');
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
        .from('contracts')
        .insert({
          project_id: project.id,
          subcontractor_id: selectedContractorId,
          contract_amount: newContract.contract_amount,
          original_contract_amount: newContract.contract_amount,
          paid_to_date: 0,
          display_order: maxOrder + 1,
          contract_status: 'active',
          start_date: newContract.start_date || null,
          end_date: newContract.end_date || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Refresh contractors list
      await fetchContractors();
      
      // Reset form and close modal
      setSelectedContractorId(null);
      setNewContract({ contract_amount: 0, start_date: '', end_date: '' });
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
          {contracts.length} contractor{contracts.length !== 1 ? 's' : ''} on this project • Drag to reorder
        </p>
        </div>
        <button 
          onClick={openAddContractorModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contractor</span>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={contracts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {contracts.map((contract) => (
              <SortableContractorCard
                key={contract.id}
                contract={contract}
                onRequestPayment={handleRequestPayment}
                onEditContract={onEditContract}
                onViewLineItems={onViewLineItems}
                onViewDetails={handleViewDetails}
                isRequesting={requestingPayment === contract.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
            ) : availableContractors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No available contractors to add.</p>
                <p className="text-sm text-gray-500">All contractors have already been added to this project, or you need to create new contractors first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Contractor *</label>
                  <select
                    value={selectedContractorId || ''}
                    onChange={(e) => setSelectedContractorId(parseInt(e.target.value))}
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
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newContract.start_date}
                      onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newContract.end_date}
                      onChange={(e) => setNewContract({ ...newContract, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddContractorModal(false);
                  setSelectedContractorId(null);
                  setNewContract({ contract_amount: 0, start_date: '', end_date: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {!loadingContractors && availableContractors.length > 0 && (
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
    </div>
  );
};

export default ProjectContractorsTab;

