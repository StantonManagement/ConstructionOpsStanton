import React, { useState, useEffect } from 'react';
import { ConstructionLoan } from '@/types/loan';
import { X, Loader2, Calendar, DollarSign, Hash, Building, Percent } from 'lucide-react';

interface EditLoanModalProps {
  loan: ConstructionLoan;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLoan: Partial<ConstructionLoan>) => Promise<void>;
}

export default function EditLoanModal({ loan, isOpen, onClose, onSave }: EditLoanModalProps) {
  const [formData, setFormData] = useState<Partial<ConstructionLoan>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loan) {
      setFormData({
        lender_name: loan.lender_name,
        loan_number: loan.loan_number,
        total_amount: loan.total_amount,
        interest_rate: loan.interest_rate,
        close_date: loan.close_date,
        maturity_date: loan.maturity_date,
        status: loan.status
      });
    }
  }, [loan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to update loan information. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof ConstructionLoan, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Edit Loan Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {/* Lender Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lender Name
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.lender_name || ''}
                onChange={(e) => handleChange('lender_name', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter lender name"
              />
            </div>
          </div>

          {/* Loan Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.loan_number || ''}
                onChange={(e) => handleChange('loan_number', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter loan number"
              />
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Loan Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.total_amount || ''}
                onChange={(e) => handleChange('total_amount', parseFloat(e.target.value))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.interest_rate || ''}
                onChange={(e) => handleChange('interest_rate', parseFloat(e.target.value))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Close Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Close Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.close_date || ''}
                  onChange={(e) => handleChange('close_date', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Maturity Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maturity Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.maturity_date || ''}
                  onChange={(e) => handleChange('maturity_date', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


