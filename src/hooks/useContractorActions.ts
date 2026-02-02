/**
 * Custom Hook for Contractor Actions
 * Following Single Responsibility - manages contractor CRUD operations
 */

import { useState, useCallback } from 'react';
import { ContractorService, type Contractor, type BudgetLineItem, type ContractWithContractor } from '@/lib/contractors/service';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

interface UseContractorActionsParams {
  projectId: number;
  existingContractorIds: number[];
  maxDisplayOrder: number;
  onRefresh: () => Promise<void>;
  onLocalUpdate: (updater: (prev: ContractWithContractor[]) => ContractWithContractor[]) => void;
}

export function useContractorActions({
  projectId,
  existingContractorIds,
  maxDisplayOrder,
  onRefresh,
  onLocalUpdate,
}: UseContractorActionsParams) {
  const [availableContractors, setAvailableContractors] = useState<Contractor[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  /**
   * Fetch available contractors and budget items
   */
  const fetchAvailableData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [contractors, budgets] = await Promise.all([
        ContractorService.fetchAvailableContractors(projectId, existingContractorIds),
        ContractorService.fetchBudgetItems(projectId),
      ]);
      setAvailableContractors(contractors);
      setBudgetItems(budgets);
    } catch (err) {
      console.error('Error fetching data:', err);
      throw err;
    } finally {
      setLoadingData(false);
    }
  }, [projectId, existingContractorIds]);

  /**
   * Add contractor to project
   */
  const addContractor = useCallback(
    async (contractorId: number, contractAmount: number, budgetItemId?: number | null) => {
      if (!contractorId) {
        throw new Error('Please select a contractor');
      }
      if (contractAmount <= 0) {
        throw new Error('Please enter a contract amount');
      }

      await ContractorService.addContractorToProject({
        projectId,
        contractorId,
        contractAmount,
        budgetItemId,
        displayOrder: maxDisplayOrder + 1,
      });

      await onRefresh();
    },
    [projectId, maxDisplayOrder, onRefresh]
  );

  /**
   * Remove contractor from project
   */
  const removeContractor = useCallback(
    async (contractId: number, contractorId: number) => {
      await ContractorService.removeContractorFromProject(contractId, projectId, contractorId);
      await onRefresh();
    },
    [projectId, onRefresh]
  );

  /**
   * Handle drag end event for reordering
   */
  const handleReorder = useCallback(
    async (event: DragEndEvent, contracts: Array<{ id: number; display_order: number }>) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = contracts.findIndex((c) => c.id === active.id);
      const newIndex = contracts.findIndex((c) => c.id === over.id);

      // Optimistic update
      const reordered = arrayMove(contracts, oldIndex, newIndex);
      onLocalUpdate(() => reordered as unknown[]);

      // Update database
      try {
        const updates = reordered.map((contract, index) => ({
          id: contract.id,
          display_order: index + 1,
        }));

        await ContractorService.updateDisplayOrders(updates);
      } catch (err) {
        console.error('Error reordering contractors:', err);
        // Rollback on error
        await onRefresh();
      }
    },
    [onRefresh, onLocalUpdate]
  );

  return {
    availableContractors,
    budgetItems,
    loadingData,
    fetchAvailableData,
    addContractor,
    removeContractor,
    handleReorder,
  };
}
