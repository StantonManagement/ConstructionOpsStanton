import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LineItem } from './LineItemEditorModal';

interface SingleLineItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: LineItem) => void;
  initialValues?: LineItem;
}

const defaultValues: LineItem = {
  itemNo: '',
  description: '',
  scheduledValue: 0,
  fromPrevious: 0,
  thisPeriod: 0,
  materialStored: 0,
  percentGC: 0,
};

const SingleLineItemModal: React.FC<SingleLineItemModalProps> = ({ open, onClose, onSave, initialValues }) => {
  const [form, setForm] = useState<LineItem>(initialValues || defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialValues || defaultValues);
      setErrors({});
      setIsMounted(true);
    } else {
      setIsMounted(false);
    }
  }, [open, initialValues]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.itemNo) newErrors.itemNo = 'Item number is required';
    if (!form.description) newErrors.description = 'Description is required';
    if (isNaN(form.scheduledValue) || form.scheduledValue < 0) newErrors.scheduledValue = 'Must be a positive number';
    return newErrors;
  };

  const handleChange = (field: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNumberChange = (field: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: Number(e.target.value) }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave(form);
    onClose();
  };

  if (!open || !isMounted) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">{initialValues ? 'Edit' : 'Add'} Line Item</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Item No <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.itemNo}
              onChange={handleChange('itemNo')}
              className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-black ${errors.itemNo ? 'border-red-300' : 'border-gray-200'}`}
              placeholder="Item number"
            />
            {errors.itemNo && <p className="text-red-500 text-xs mt-1">{errors.itemNo}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Description <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange('description')}
              className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-black ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
              placeholder="Description of work"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Scheduled Value <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.scheduledValue}
              onChange={handleNumberChange('scheduledValue')}
              className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-black ${errors.scheduledValue ? 'border-red-300' : 'border-gray-200'}`}
              placeholder="0.00"
              min={0}
            />
            {errors.scheduledValue && <p className="text-red-500 text-xs mt-1">{errors.scheduledValue}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">From Previous Application</label>
            <input
              type="number"
              value={form.fromPrevious}
              onChange={handleNumberChange('fromPrevious')}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 border-gray-200 text-black"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">This Period</label>
            <input
              type="number"
              value={form.thisPeriod}
              onChange={handleNumberChange('thisPeriod')}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 border-gray-200 text-black"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Material Presently Stored</label>
            <input
              type="number"
              value={form.materialStored}
              onChange={handleNumberChange('materialStored')}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 border-gray-200 text-black"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">% G/C</label>
            <input
              type="number"
              value={form.percentGC}
              onChange={handleNumberChange('percentGC')}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 border-gray-200 text-black"
              placeholder="0"
              min={0}
              max={100}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SingleLineItemModal; 