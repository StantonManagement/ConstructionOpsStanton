'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface RemoveFromProjectModalProps {
  contractorName: string;
  projectName: string;
  contractAmount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const RemoveFromProjectModal: React.FC<RemoveFromProjectModalProps> = ({
  contractorName,
  projectName,
  contractAmount,
  onConfirm,
  onCancel,
  isLoading
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
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
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">Remove from Project</h3>
            <p className="text-sm text-gray-600 mt-1">This will remove the contractor from this project only</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Message */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-orange-700 text-sm font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-orange-800 font-medium mb-2">
                Remove <span className="font-bold">{contractorName}</span> from <span className="font-bold">{projectName}</span>?
              </p>
              <ul className="text-orange-700 text-sm space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Contract amount: <span className="font-semibold">{formatCurrency(contractAmount)}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>This will remove the contract and all associated line items from this project</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span className="font-semibold text-green-700">The contractor will remain in your system for other projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>This action cannot be reversed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button 
            onClick={onCancel} 
            className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                Remove from Project
              </>
            )}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 <span className="font-medium">Note:</span> To permanently delete this contractor from your entire system, use the contractor management page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RemoveFromProjectModal;


