import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { LineItem } from './LineItemEditor';

interface SingleLineItemModalProps {
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

const SingleLineItemModalInner: React.FC<Omit<SingleLineItemModalProps, 'open'>> = ({ onClose, onSave, initialValues }) => {
  const initialForm = useMemo(() => initialValues || defaultValues, [initialValues]);
  const [form, setForm] = useState<LineItem>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.itemNo) newErrors.itemNo = 'Item number is required';
    if (!form.description) newErrors.description = 'Description is required';
    if (isNaN(Number(form.scheduledValue)) || Number(form.scheduledValue) < 0) newErrors.scheduledValue = 'Must be a positive number';
    return newErrors;
  };

  const handleChange = (field: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNumberChange = (field: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">{initialValues ? 'Edit' : 'Add'} Line Item</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Item No <span className="text-[var(--status-critical-text)]">*</span></label>
            <input
              type="text"
              value={form.itemNo}
              onChange={handleChange('itemNo')}
              className={`w-full px-3 py-2 border rounded-lg bg-secondary text-foreground ${errors.itemNo ? 'border-[var(--status-critical-border)]' : 'border-border'}`}
              placeholder="Item number"
            />
            {errors.itemNo && <p className="text-[var(--status-critical-text)] text-xs mt-1">{errors.itemNo}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description <span className="text-[var(--status-critical-text)]">*</span></label>
            <input
              type="text"
              value={form.description}
              onChange={handleChange('description')}
              className={`w-full px-3 py-2 border rounded-lg bg-secondary text-foreground ${errors.description ? 'border-[var(--status-critical-border)]' : 'border-border'}`}
              placeholder="Description of work"
            />
            {errors.description && <p className="text-[var(--status-critical-text)] text-xs mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Scheduled Value <span className="text-[var(--status-critical-text)]">*</span></label>
            <input
              type="number"
              value={form.scheduledValue}
              onChange={handleNumberChange('scheduledValue')}
              className={`w-full px-3 py-2 border rounded-lg bg-secondary text-foreground ${errors.scheduledValue ? 'border-[var(--status-critical-border)]' : 'border-border'}`}
              placeholder="0.00"
              min={0}
            />
            {errors.scheduledValue && <p className="text-[var(--status-critical-text)] text-xs mt-1">{errors.scheduledValue}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">From Previous Application</label>
            <input
              type="number"
              value={form.fromPrevious}
              onChange={handleNumberChange('fromPrevious')}
              className="w-full px-3 py-2 border rounded-lg bg-secondary border-border text-foreground"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">This Period</label>
            <input
              type="number"
              value={form.thisPeriod}
              onChange={handleNumberChange('thisPeriod')}
              className="w-full px-3 py-2 border rounded-lg bg-secondary border-border text-foreground"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Material Presently Stored</label>
            <input
              type="number"
              value={form.materialStored}
              onChange={handleNumberChange('materialStored')}
              className="w-full px-3 py-2 border rounded-lg bg-secondary border-border text-foreground"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">% G/C</label>
            <input
              type="number"
              value={form.percentGC}
              onChange={handleNumberChange('percentGC')}
              className="w-full px-3 py-2 border rounded-lg bg-secondary border-border text-foreground"
              placeholder="0"
              min={0}
              max={100}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SingleLineItemModal: React.FC<SingleLineItemModalProps> = ({ open, onClose, onSave, initialValues }) => {
  if (!open) return null;

  return (
    <SingleLineItemModalInner
      key={initialValues ? `edit-${initialValues.itemNo}` : 'new'}
      onClose={onClose}
      onSave={onSave}
      initialValues={initialValues}
    />
  );
};

export default SingleLineItemModal;