'use client';

/**
 * Add Contractor Modal Component
 * Following Single Responsibility - handles only the UI and validation for adding contractors
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Contractor, BudgetLineItem } from '@/lib/contractors/service';
import { formatCurrency } from '@/lib/contractors/utils';

interface AddContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contractorId: number, contractAmount: number, budgetItemId?: number) => Promise<void>;
  availableContractors: Contractor[];
  budgetItems: BudgetLineItem[];
  loading: boolean;
}

export function AddContractorModal({
  isOpen,
  onClose,
  onAdd,
  availableContractors,
  budgetItems,
  loading,
}: AddContractorModalProps) {
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [contractAmount, setContractAmount] = useState(0);
  const [budgetItemId, setBudgetItemId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedContractorId || contractAmount <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(
        selectedContractorId,
        contractAmount,
        budgetItemId ? parseInt(budgetItemId) : undefined
      );
      // Reset form
      setSelectedContractorId(null);
      setContractAmount(0);
      setBudgetItemId('');
      onClose();
    } catch (error) {
      console.error('Error adding contractor:', error);
      alert(error instanceof Error ? error.message : 'Failed to add contractor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedContractorId(null);
    setContractAmount(0);
    setBudgetItemId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Contractor to Project
          </h3>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading contractors...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contractor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contractor *
                </label>
                <select
                  value={selectedContractorId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedContractorId(value ? parseInt(value) : null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary"
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
                  <p className="text-xs text-orange-600 mt-1">
                    No new contractors available. Create one first.
                  </p>
                )}
              </div>

              {/* Contract Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Amount *
                </label>
                <input
                  type="number"
                  value={contractAmount}
                  onChange={(e) =>
                    setContractAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Budget Item Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Line Item (Optional)
                </label>
                <select
                  value={budgetItemId}
                  onChange={(e) => setBudgetItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary"
                >
                  <option value="">-- Unassigned --</option>
                  {budgetItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.category_name} ({formatCurrency(item.original_amount)})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Link this contract to a budget category for automatic tracking.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              submitting ||
              !selectedContractorId ||
              contractAmount <= 0
            }
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add to Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
