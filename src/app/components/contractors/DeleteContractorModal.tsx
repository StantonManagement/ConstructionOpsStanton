'use client';

/**
 * Delete Contractor Confirmation Modal
 * Following Single Responsibility - handles only the deletion confirmation UI
 */

import React, { useState } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import type { ContractWithContractor } from '@/lib/contractors/service';
import { formatCurrency } from '@/lib/contractors/utils';

interface DeleteContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contractId: number, contractorId: number) => Promise<void>;
  contract: ContractWithContractor | null;
}

export function DeleteContractorModal({
  isOpen,
  onClose,
  onConfirm,
  contract,
}: DeleteContractorModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!contract) return;

    setDeleting(true);
    try {
      await onConfirm(contract.id, contract.contractor_id);
      onClose();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete contract');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !contract) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
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
            <h3 className="text-xl font-bold text-gray-900">
              Remove from Project
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              This will remove the contractor from this project only
            </p>
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
                Remove {contract.contractors.name} from this project?
              </p>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• Contract amount: {formatCurrency(contract.contract_amount)}</li>
                <li>
                  • This will remove the contract and all associated line items from
                  this project
                </li>
                <li>
                  •{' '}
                  <span className="font-semibold text-green-700">
                    The contractor will remain in your system for other projects
                  </span>
                </li>
                <li>• This action cannot be reversed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-lg"
            disabled={deleting}
          >
            {deleting ? (
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
  );
}
