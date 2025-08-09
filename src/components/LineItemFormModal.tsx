import React, { useState, useEffect } from 'react';
import { LineItem } from './LineItemEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: LineItem) => void;
  initialValues?: LineItem;
}

const defaultValues: LineItem = {
  itemNo: '',
  description: '',
  scheduledValue: '',
  fromPrevious: '',
  thisPeriod: '',
  materialStored: '',
  percentGC: '',
};

const LineItemFormModal: React.FC<Props> = ({ open, onClose, onSave, initialValues }) => {
  const [form, setForm] = useState<LineItem>(initialValues || defaultValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues || defaultValues);
    }
  }, [open, initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">{initialValues ? 'Edit' : 'Add'} Line Item</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item No</label>
            <input
              type="text"
              name="itemNo"
              value={form.itemNo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description of Work</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Value</label>
            <input
              type="text"
              name="scheduledValue"
              value={form.scheduledValue}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Previous Application</label>
            <input
              type="text"
              name="fromPrevious"
              value={form.fromPrevious}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">This Period</label>
            <input
              type="text"
              name="thisPeriod"
              value={form.thisPeriod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Presently Stored</label>
            <input
              type="text"
              name="materialStored"
              value={form.materialStored}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">%G/C</label>
            <input
              type="text"
              name="percentGC"
              value={form.percentGC}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
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

export default LineItemFormModal; 