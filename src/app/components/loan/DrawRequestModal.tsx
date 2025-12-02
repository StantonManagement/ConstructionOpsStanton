import React, { useState } from 'react';
import { LoanBudgetItem } from '@/types/loan';
import { formatCurrency } from '@/lib/theme';
import { X, Plus, Trash2 } from 'lucide-react';

interface DrawRequestModalProps {
  budgetItems: LoanBudgetItem[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const DrawRequestModal: React.FC<DrawRequestModalProps> = ({ budgetItems, onClose, onSubmit }) => {
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<{ budget_item_id: number; amount: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const availableItems = budgetItems.filter(item => item.remaining_amount > 0);

  const handleAddAllocation = () => {
    if (availableItems.length > 0) {
      setAllocations([...allocations, { budget_item_id: availableItems[0].id, amount: 0 }]);
    }
  };

  const updateAllocation = (index: number, field: string, value: any) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [field]: value };
    setAllocations(newAllocations);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const totalRequested = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRequested <= 0) return;
    
    setLoading(true);
    try {
      await onSubmit({
        request_date: requestDate,
        amount_requested: totalRequested,
        notes,
        allocations
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">Request Draw</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
              <input 
                type="date" 
                required
                value={requestDate}
                onChange={e => setRequestDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Requested</label>
              <div className="text-2xl font-bold text-gray-900 py-1">
                {formatCurrency(totalRequested)}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Allocations</label>
              <button 
                type="button"
                onClick={handleAddAllocation}
                className="text-sm text-primary flex items-center gap-1 hover:text-primary/80"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {allocations.length === 0 && (
                <p className="text-sm text-gray-500 text-center">No items added yet.</p>
              )}
              {allocations.map((alloc, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <select
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    value={alloc.budget_item_id}
                    onChange={e => updateAllocation(index, 'budget_item_id', Number(e.target.value))}
                  >
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.category_name} (Rem: {formatCurrency(item.remaining_amount)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-32 border rounded px-3 py-2 text-sm text-right"
                    placeholder="Amount"
                    value={alloc.amount}
                    onChange={e => updateAllocation(index, 'amount', Number(e.target.value))}
                  />
                  <button 
                    type="button"
                    onClick={() => removeAllocation(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || totalRequested === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


