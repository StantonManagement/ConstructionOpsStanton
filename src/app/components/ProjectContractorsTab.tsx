'use client';

/**
 * Project Contractors Tab - Refactored following SOLID principles
 *
 * SOLID Compliance:
 * - Single Responsibility: Component only handles layout and orchestration
 * - Open/Closed: Extensible through props and composition
 * - Dependency Inversion: Depends on abstractions (hooks, services)
 */

import React, { useState, useMemo } from 'react';
import { Plus, Loader2, Users, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Project } from '@/context/DataContext';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import type { ContractWithContractor } from '@/lib/contractors/service';
import { useContractors } from '@/hooks/useContractors';
import { useContractorActions } from '@/hooks/useContractorActions';
import { formatCurrency, getTradeIcon, sortContracts } from '@/lib/contractors/utils';
import { AddContractorModal } from './contractors/AddContractorModal';
import { DeleteContractorModal } from './contractors/DeleteContractorModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ContractorCard from './ContractorCard';
import { Phone, Mail, Tag, Send, Edit, Eye, Trash2 } from 'lucide-react';

// Sortable Contractor Card Wrapper
function SortableContractorCard({
  contract,
  onRequestPayment,
  onEditContract,
  onViewLineItems,
  onViewDetails,
  onDelete,
  isRequesting,
}: {
  contract: ContractWithContractor;
  onRequestPayment: (contractorId: number, contractId: number) => void;
  onEditContract: (contract: ContractWithContractor) => void;
  onViewLineItems: (contract: ContractWithContractor) => void;
  onViewDetails: (contract: ContractWithContractor) => void;
  onDelete: (contract: ContractWithContractor) => void;
  isRequesting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contract.id,
  });

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
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

// Main Component Props
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
  onViewContractorDetail,
}) => {
  // Data fetching using custom hooks
  const { contractors, loading, refreshContractors, updateLocalContractors } = useContractors(project.id);

  // Contractor actions hook
  const {
    availableContractors,
    budgetItems,
    loadingData,
    fetchAvailableData,
    addContractor,
    removeContractor,
    handleReorder,
  } = useContractorActions({
    projectId: project.id,
    existingContractorIds: contractors.map((c) => c.contractor_id),
    maxDisplayOrder: contractors.length > 0 ? Math.max(...contractors.map((c) => c.display_order || 0)) : 0,
    onRefresh: refreshContractors,
    onLocalUpdate: updateLocalContractors,
  });

  // UI State
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [sortColumn, setSortColumn] = useState<string>('display_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [requestingPayment, setRequestingPayment] = useState<number | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractWithContractor | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sorted contractors (memoized for performance)
  const sortedContracts = useMemo(() => {
    if (viewMode === 'card') {
      // In card view, always sort by display_order
      return [...contractors].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
    // In table view, use selected sorting
    return sortContracts(contractors, sortColumn, sortDirection);
  }, [contractors, sortColumn, sortDirection, viewMode]);

  // Event Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRequestPayment = async (contractorId: number, contractId: number) => {
    setRequestingPayment(contractId);
    try {
      await onRequestPayment(contractorId, contractId);
    } finally {
      setRequestingPayment(null);
    }
  };

  const handleViewDetails = (contract: ContractWithContractor) => {
    if (onViewContractorDetail) {
      onViewContractorDetail(contract);
    }
  };

  const handleDeleteClick = (contract: ContractWithContractor) => {
    setContractToDelete(contract);
    setShowDeleteModal(true);
  };

  const handleOpenAddModal = async () => {
    await fetchAvailableData();
    setShowAddModal(true);
  };

  const handleAddContractor = async (contractorId: number, contractAmount: number, budgetItemId?: number) => {
    await addContractor(contractorId, contractAmount, budgetItemId);
    setShowAddModal(false);
  };

  const handleDeleteContractor = async (contractId: number, contractorId: number) => {
    await removeContractor(contractId, contractorId);
    setShowDeleteModal(false);
    setContractToDelete(null);
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty State
  if (contractors.length === 0) {
    return (
      <div>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contractors Yet</h3>
          <p className="text-gray-600 mb-6">
            Add contractors to this project to start managing contracts and payments.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contractor</span>
          </button>
        </div>

        <AddContractorModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContractor}
          availableContractors={availableContractors}
          budgetItems={budgetItems}
          loading={loadingData}
        />
      </div>
    );
  }

  // Main View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project Contractors</h2>
          <p className="text-sm text-gray-600 mt-1">
            {contractors.length} contractor{contractors.length !== 1 ? 's' : ''} on this project
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
                  ? 'bg-white text-primary shadow-sm'
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
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Table</span>
            </button>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
          onDragEnd={(e) => handleReorder(e, sortedContracts)}
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

      {/* Table View */}
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
                    {sortColumn === 'name' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                    {sortColumn !== 'name' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                      {getTradeIcon(row.contractors?.trade || '')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{row.contractors?.name}</div>
                      <div className="text-xs text-gray-500">{row.contractors?.trade}</div>
                    </div>
                  </div>
                ),
              },
              {
                header: 'Budget Link',
                accessor: (row: ContractWithContractor) =>
                  row.property_budgets ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      <Tag className="w-3 h-3" />
                      {row.property_budgets.category_name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unlinked</span>
                  ),
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
                ),
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('contract_amount')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Contract Amount</span>
                    {sortColumn === 'contract_amount' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
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
                        <div
                          className={`text-xs ${
                            changeOrders > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}
                        >
                          {changeOrders > 0 && '+'}
                          {formatCurrency(changeOrders)} CO
                        </div>
                      )}
                    </div>
                  );
                },
                align: 'right' as const,
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('paid_to_date')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Paid to Date</span>
                    {sortColumn === 'paid_to_date' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                    {sortColumn !== 'paid_to_date' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <div className="font-medium text-green-600">
                    {formatCurrency(row.paid_to_date || 0)}
                  </div>
                ),
                align: 'right' as const,
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('remaining')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Remaining</span>
                    {sortColumn === 'remaining' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                    {sortColumn !== 'remaining' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => {
                  const remaining = (row.contract_amount || 0) - (row.paid_to_date || 0);
                  return <div className="font-medium text-orange-600">{formatCurrency(remaining)}</div>;
                },
                align: 'right' as const,
              },
              {
                header: (
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    <span>Status</span>
                    {sortColumn === 'status' &&
                      (sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                    {sortColumn !== 'status' && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                ),
                accessor: (row: ContractWithContractor) => (
                  <SignalBadge status={row.contract_status === 'active' ? 'success' : 'neutral'}>
                    {row.contract_status || 'N/A'}
                  </SignalBadge>
                ),
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
                      className="px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
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
                align: 'right' as const,
              },
            ]}
            emptyMessage="No contractors assigned to this project"
            onRowClick={handleViewDetails}
          />
        </div>
      )}

      {/* Modals */}
      <AddContractorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddContractor}
        availableContractors={availableContractors}
        budgetItems={budgetItems}
        loading={loadingData}
      />

      <DeleteContractorModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setContractToDelete(null);
        }}
        onConfirm={handleDeleteContractor}
        contract={contractToDelete}
      />
    </div>
  );
};

export default ProjectContractorsTab;
