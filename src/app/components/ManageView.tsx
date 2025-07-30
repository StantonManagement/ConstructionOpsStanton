import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X } from 'lucide-react';
import LineItemFormModal from '@/components/LineItemFormModal';
import LineItemEditor, { LineItem } from '@/components/LineItemEditor';
import MetricsView from './MetricsView';
import Image from 'next/image';

// Enhanced notification system
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationData {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Form validation utilities
const validators = {
  required: (value: string) => value.trim() !== '' || 'This field is required',
  email: (value: string) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address',
  phone: (value: string) => 
    /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/.test(value) || 'Please enter a valid phone number',
  number: (value: string) => 
    !isNaN(Number(value)) && Number(value) >= 0 || 'Please enter a valid positive number',
  date: (value: string) => 
    !isNaN(Date.parse(value)) || 'Please enter a valid date'
};

interface FieldConfig {
  name: string;
  placeholder: string;
  type?: string;
  validators?: ((value: string) => string | true)[];
  required?: boolean;
  defaultValue?: string; // <-- Add this line
}

// Enhanced notification component
const NotificationManager: React.FC<{
  notifications: NotificationData[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            px-6 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-3 min-w-80
            ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span className="flex-1">{notification.message}</span>
          <button
            onClick={() => onRemove(notification.id)}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// Enhanced form component with validation
type AddFormProps = {
  title: string;
  icon: ReactNode;
  fields: FieldConfig[];
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  setDirty: (dirty: boolean) => void;
};

const AddForm: React.FC<AddFormProps> = ({ 
  title, 
  icon, 
  fields, 
  onSubmit, 
  onClose,
  isLoading = false,
  setDirty
}) => {
  // Set initial formData using defaultValue if provided
  const [formData, setFormData] = useState<Record<string, string>>(
    () => fields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue || '';
      return acc;
    }, {} as Record<string, string>)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';

    // Check required validation
    if (field.required && !value.trim()) {
      return 'This field is required';
    }

    // Run custom validators
    if (field.validators) {
      for (const validator of field.validators) {
        const result = validator(value);
        if (result !== true) {
          return result;
        }
      }
    }

    return '';
  }, [fields]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Prevent deleting '+1' for phone field
    if (name === 'phone') {
      // Always enforce '+1' at the start
      let newValue = value;
      if (!newValue.startsWith('+1')) {
        // Remove all non-digit characters and re-add '+1'
        newValue = '+1' + newValue.replace(/[^\d]/g, '').replace(/^1*/, '');
      }
      setFormData(prev => ({ ...prev, [name]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setDirty(true);
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    setDirty(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(field => {
      newTouched[field.name] = true;
      const error = validateField(field.name, formData[field.name] || '');
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    // Don't submit if there are errors
    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({});
      setErrors({});
      setTouched({});
      setDirty(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const labelize = (str: string) => 
    str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-white rounded-xl p-6 w-full shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <button 
          onClick={onClose} 
          className="text-black-500 hover:text-black-700 p-1 rounded-full hover:bg-gray-100"
          disabled={isLoading}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-black mb-1.5">
              {labelize(field.name)}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type || 'text'}
              name={field.name}
              value={formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue || '')}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`
                w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-gray-50 text-black placeholder-gray-400
                ${errors[field.name] && touched[field.name] 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-200 focus:border-blue-500'
                }
              `}
              placeholder={field.placeholder}
              disabled={isLoading}
            />
            {errors[field.name] && touched[field.name] && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors[field.name]}
              </p>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Enhanced contract form with better error handling
const AddContractForm: React.FC<{ 
  onClose: () => void; 
  onSuccess?: () => void;
  onError?: (message: string) => void;
  setDirty: (dirty: boolean) => void;
}> = ({ onClose, onSuccess, onError, setDirty }) => {
  const { projects, subcontractors } = useData();
  const [formData, setFormData] = useState({
    projectId: "",
    subcontractorId: "",
    contractAmount: "",
    startDate: "",
    endDate: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineItemForm, setLineItemForm] = useState({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
  const [editingLineItemIndex, setEditingLineItemIndex] = useState<number | null>(null);
  const [showLineItemForm, setShowLineItemForm] = useState(false);

  const totalScheduledValue = lineItems.reduce((sum, item) => sum + (typeof item.scheduledValue === 'number' ? item.scheduledValue : Number(item.scheduledValue) || 0), 0);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) newErrors.projectId = 'Project is required';
    if (!formData.subcontractorId) newErrors.subcontractorId = 'Vendor is required';
    if (!formData.contractAmount) newErrors.contractAmount = 'Contract amount is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.contractAmount && (isNaN(Number(formData.contractAmount)) || Number(formData.contractAmount) <= 0)) {
      newErrors.contractAmount = 'Contract amount must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Insert contract with transaction-like approach
      const { data, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          project_id: Number(formData.projectId),
          subcontractor_id: Number(formData.subcontractorId),
          contract_amount: Number(formData.contractAmount),
          start_date: formData.startDate,
          end_date: formData.endDate || null,
        }])
        .select()
        .single();

      if (contractError) {
        throw new Error(`Failed to create contract: ${contractError.message}`);
      }

      const contractId = data.id;

      // 2. Insert line items if any exist
      if (lineItems.length > 0) {
        const itemsToInsert = lineItems.map(item => ({
          contract_id: contractId,
          project_id: Number(formData.projectId),
          contractor_id: Number(formData.subcontractorId),
          item_no: item.itemNo,
          description_of_work: item.description,
          scheduled_value: Number(item.scheduledValue) || 0,
          from_previous_application: Number(item.fromPrevious) || 0,
          this_period: Number(item.thisPeriod) || 0,
          material_presently_stored: Number(item.materialStored) || 0,
          percent_gc: Number(item.percentGC) || 0,
          status: 'active',
        }));

        const { error: lineItemsError } = await supabase
          .from('project_line_items')
          .insert(itemsToInsert);

        if (lineItemsError) {
          // Consider rolling back the contract if line items fail
          await supabase.from('contracts').delete().eq('id', contractId);
          throw new Error(`Failed to create line items: ${lineItemsError.message}`);
        }
      }

      // Success - reset form and notify
      setFormData({
        projectId: "",
        subcontractorId: "",
        contractAmount: "",
        startDate: "",
        endDate: "",
      });
      setLineItems([]);

      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (onError) onError(message);
    } finally {
      setLoading(false);
    }
    setDirty(false);
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setDirty(true);
  };

  const handleLineItemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLineItemForm(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleLineItemSubmit = () => {
    if (editingLineItemIndex === null) {
      setLineItems(prev => [...prev, lineItemForm]);
    } else {
      setLineItems(prev => prev.map((item, idx) => idx === editingLineItemIndex ? lineItemForm : item));
    }
    setLineItemForm({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
    setEditingLineItemIndex(null);
    setShowLineItemForm(false);
    setDirty(true);
  };

  const handleLineItemEdit = (idx: number) => {
    setLineItemForm(lineItems[idx]);
    setEditingLineItemIndex(idx);
    setShowLineItemForm(true);
    setDirty(true);
  };

  const handleLineItemRemove = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleLineItemCancel = () => {
    setLineItemForm({ itemNo: '', description: '', scheduledValue: '', fromPrevious: '', thisPeriod: '', materialStored: '', percentGC: '' });
    setEditingLineItemIndex(null);
    setShowLineItemForm(false);
    setDirty(true);
  };

  return (
    <div className="bg-white rounded-xl p-6 w-full shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-blue-600" />
          Add Contract
        </h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          disabled={loading}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-black mb-1.5">
            Project <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.projectId}
            onChange={handleInputChange('projectId')}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.projectId ? 'border-red-300' : 'border-gray-200'}
            `}
            disabled={loading}
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.projectId && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.projectId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1.5">
            Vendor <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.subcontractorId}
            onChange={handleInputChange('subcontractorId')}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.subcontractorId ? 'border-red-300' : 'border-gray-200'}
            `}
            disabled={loading}
          >
            <option value="">Select a vendor</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.subcontractorId && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.subcontractorId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1.5">
            Contract Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.contractAmount}
            onChange={handleInputChange('contractAmount')}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.contractAmount ? 'border-red-300' : 'border-gray-200'}
            `}
            placeholder="0.00"
            disabled={loading}
          />
          {errors.contractAmount && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.contractAmount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1.5">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={handleInputChange('startDate')}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.startDate ? 'border-red-300' : 'border-gray-200'}
            `}
            disabled={loading}
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.startDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1.5">End Date</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={handleInputChange('endDate')}
            min={formData.startDate}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.endDate ? 'border-red-300' : 'border-gray-200'}
            `}
            disabled={loading}
          />
          {errors.endDate && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.endDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1.5">Line Items</label>
          <div className="border rounded-lg p-4 bg-gray-50 mb-4">
            {/* Inline Line Item Sub-Form */}
            {showLineItemForm ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Item No</label>
                  <input
                    type="text"
                    name="itemNo"
                    value={lineItemForm.itemNo}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-black mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={lineItemForm.description}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Scheduled Value</label>
                  <input
                    type="number"
                    name="scheduledValue"
                    value={lineItemForm.scheduledValue}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">From Previous</label>
                  <input
                    type="number"
                    name="fromPrevious"
                    value={lineItemForm.fromPrevious}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">This Period</label>
                  <input
                    type="number"
                    name="thisPeriod"
                    value={lineItemForm.thisPeriod}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Material Stored</label>
                  <input
                    type="number"
                    name="materialStored"
                    value={lineItemForm.materialStored}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">% G/C</label>
                  <input
                    type="number"
                    name="percentGC"
                    value={lineItemForm.percentGC}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleLineItemSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingLineItemIndex === null ? 'Add' : 'Update'}
                  </button>
                  {editingLineItemIndex !== null && (
                    <button
                      type="button"
                      onClick={handleLineItemCancel}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowLineItemForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Line Item
                </button>
              </div>
            )}
            {/* Line Items Table */}
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-black">Item No</th>
                  <th className="border px-2 py-1 text-black">Description</th>
                  <th className="border px-2 py-1 text-black">Scheduled Value</th>
                  <th className="border px-2 py-1 text-black">From Previous</th>
                  <th className="border px-2 py-1 text-black">This Period</th>
                  <th className="border px-2 py-1 text-black">Material Stored</th>
                  <th className="border px-2 py-1 text-black">% G/C</th>
                  <th className="border px-2 py-1 text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-black py-2">No line items added.</td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1 text-black">{item.itemNo}</td>
                      <td className="border px-2 py-1 text-black">{item.description}</td>
                      <td className="border px-2 py-1 text-black">{item.scheduledValue}</td>
                      <td className="border px-2 py-1 text-black">{item.fromPrevious}</td>
                      <td className="border px-2 py-1 text-black">{item.thisPeriod}</td>
                      <td className="border px-2 py-1 text-black">{item.materialStored}</td>
                      <td className="border px-2 py-1 text-black">{item.percentGC}</td>
                      <td className="border px-2 py-1 text-black flex gap-2">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline"
                          onClick={() => handleLineItemEdit(idx)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => handleLineItemRemove(idx)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="text-right mt-2 text-sm text-black">
              Total Scheduled Value: <span className="font-semibold">${totalScheduledValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-400 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Add Contract'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Enhanced main component with notification system

const ManageView: React.FC = () => {
  const { dispatch, projects, subcontractors, contracts = [] } = useData();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [openForm, setOpenForm] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [pendingForm, setPendingForm] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'vendors' | 'contracts'>('projects');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const addNotification = useCallback((
    type: NotificationType, 
    message: string, 
    duration: number = 5000
  ) => {
    const id = Date.now().toString();
    const notification: NotificationData = { id, type, message, duration };
    setNotifications(prev => [...prev, notification]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addProject = async (formData: Record<string, string>) => {
    setIsLoading(prev => ({ ...prev, project: true }));

    try {
      const { name, client_name, current_phase, budget, start_date, target_completion_date } = formData;
      const { data, error } = await supabase.from('projects').insert([{
        name,
        client_name,
        current_phase,
        budget: budget ? Number(budget) : null,
        start_date,
        target_completion_date,
      }]).select().single();

      if (error) throw error;

      dispatch({ type: 'ADD_PROJECT', payload: data });
      addNotification('success', 'Project added successfully!');
      setOpenForm(null);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add project';
      addNotification('error', message);
      throw error; // Re-throw to prevent form from closing
    } finally {
      setIsLoading(prev => ({ ...prev, project: false }));
    }
  };

  const addSubcontractor = async (formData: Record<string, string>) => {
    setIsLoading(prev => ({ ...prev, vendor: true }));

    try {
      const { name, trade, phone, email } = formData;
      const { data, error } = await supabase.from('contractors').insert([{
        name,
        trade,
        phone,
        email,
      }]).select().single();

      if (error) throw error;

      dispatch({ type: 'ADD_SUBCONTRACTOR', payload: data });
      addNotification('success', 'Vendor added successfully!');
      setOpenForm(null);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add vendor';
      addNotification('error', message);
      throw error; // Re-throw to prevent form from closing
    } finally {
      setIsLoading(prev => ({ ...prev, vendor: false }));
    }
  };

  // Enhanced field configurations with validation
  const projectFields: FieldConfig[] = [
    { name: 'name', placeholder: 'Project Name', required: true, validators: [validators.required] },
    { name: 'client_name', placeholder: 'Client Name', required: true, validators: [validators.required] },
    { name: 'current_phase', placeholder: 'Current Phase' },
    { name: 'budget', placeholder: 'Budget (USD)', type: 'number', validators: [validators.number] },
    { name: 'start_date', placeholder: 'Start Date', type: 'date', validators: [validators.date] },
    { name: 'target_completion_date', placeholder: 'Target Completion Date', type: 'date', validators: [validators.date] },
  ];

  const vendorFields: FieldConfig[] = [
    { name: 'name', placeholder: 'Vendor Name', required: true, validators: [validators.required] },
    { name: 'trade', placeholder: 'Trade', required: true, validators: [validators.required] },
    { name: 'phone', placeholder: 'Phone', type: 'tel', validators: [validators.phone], defaultValue: '+1' }, // <-- Add defaultValue
    { name: 'email', placeholder: 'Email', type: 'email', validators: [validators.email] },
  ];

  const handleOpenForm = (form: 'project' | 'vendor' | 'contract') => {
    if (formDirty && openForm !== form) {
      setPendingForm(form);
      setShowUnsavedWarning(true);
    } else {
      setOpenForm(form);
      setFormDirty(false);
    }
  };

  const handleConfirmSwitch = () => {
    setOpenForm(pendingForm);
    setPendingForm(null);
    setFormDirty(false);
    setShowUnsavedWarning(false);
  };

  const handleCancelSwitch = () => {
    setPendingForm(null);
    setShowUnsavedWarning(false);
  };

  // Search and filter functions
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.current_phase?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchTerm, filterStatus]);

  const filteredVendors = useMemo(() => {
    return subcontractors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || vendor.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [subcontractors, searchTerm, filterStatus]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = contract.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contract.subcontractor?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || contract.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [contracts, searchTerm, filterStatus]);

  // Bulk operations
  const handleSelectAll = () => {
    const currentData = activeTab === 'projects' ? filteredProjects :
                       activeTab === 'vendors' ? filteredVendors : filteredContracts;
    if (selectedItems.size === currentData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentData.map(item => item.id)));
    }
  };

  const handleItemSelect = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`);
    if (!confirmed) return;

    try {
      const tableName = activeTab === 'projects' ? 'projects' :
                       activeTab === 'vendors' ? 'contractors' : 'contracts';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', Array.from(selectedItems));

      if (error) throw error;

      // Update local state
      if (activeTab === 'projects') {
        selectedItems.forEach(id => {
          dispatch({ type: 'DELETE_PROJECT', payload: id });
        });
      } else if (activeTab === 'vendors') {
        selectedItems.forEach(id => {
          dispatch({ type: 'DELETE_SUBCONTRACTOR', payload: id });
        });
      }

      addNotification('success', `Successfully deleted ${selectedItems.size} item(s)`);
      setSelectedItems(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete items';
      addNotification('error', message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <NotificationManager 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      <MetricsView />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🏗️ Construction Management</h1>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <span className="text-sm text-gray-600">Total Projects: </span>
            <span className="font-bold text-blue-600">{projects.length}</span>
            <span className="text-sm text-gray-600 ml-4">Total Vendors: </span>
            <span className="font-bold text-green-600">{subcontractors.length}</span>
            <span className="text-sm text-gray-600 ml-4">Total Contracts: </span>
            <span className="font-bold text-purple-600">{contracts.length}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'projects', label: 'Projects', icon: '🏗️', count: filteredProjects.length },
              { key: 'vendors', label: 'Vendors', icon: '👷', count: filteredVendors.length },
              { key: 'contracts', label: 'Contracts', icon: '📋', count: filteredContracts.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setSelectedItems(new Set());
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                <span className="bg-gray-100 text-gray-900 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}

              <button
                onClick={() => handleOpenForm(activeTab === 'projects' ? 'project' : activeTab === 'vendors' ? 'vendor' : 'contract')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add {activeTab === 'projects' ? 'Project' : activeTab === 'vendors' ? 'Vendor' : 'Contract'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {activeTab === 'projects' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredProjects.length && filteredProjects.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(project.id)}
                        onChange={() => handleItemSelect(project.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">Started: {project.start_date || 'Not set'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.client_name || 'Not specified'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.current_phase || 'Not set'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(project.budget || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${project.budget ? ((project.spent || 0) / project.budget) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ${(project.spent || 0).toLocaleString()} / ${(project.budget || 0).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Building className="w-12 h-12 text-gray-300 mb-4" />
                        <span>No projects found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'vendors' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredVendors.length && filteredVendors.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(vendor.id)}
                        onChange={() => handleItemSelect(vendor.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">ID: #{vendor.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {vendor.trade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{vendor.phone}</div>
                      <div className="text-gray-500">{vendor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {vendor.performance_score ? `${vendor.performance_score}/5` : 'Not rated'}
                        </div>
                        <div className="ml-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${
                                i < (vendor.performance_score || 0) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <UserPlus className="w-12 h-12 text-gray-300 mb-4" />
                        <span>No vendors found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'contracts' && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredContracts.length && filteredContracts.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(contract.id)}
                        onChange={() => handleItemSelect(contract.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {contract.project?.name || 'Unknown Project'}
                          </div>
                          <div className="text-sm text-gray-500">Contract #{contract.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract.subcontractor?.name || 'Unknown Vendor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(contract.contract_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{contract.start_date}</div>
                      <div className="text-gray-500">{contract.end_date || 'Ongoing'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contract.status === 'active' ? 'bg-green-100 text-green-800' :
                        contract.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contract.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FilePlus className="w-12 h-12 text-gray-300 mb-4" />
                        <span>No contracts found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inline Forms - only one visible at a time */}
      {openForm && (
        <div className="mb-8">
          {openForm === 'project' && (
            <div className="bg-white rounded-lg shadow p-6 mb-4 w-full">
              <AddForm
                title="Add New Project"
                icon={<Building className="w-6 h-6 text-blue-600" />}
                fields={projectFields}
                onSubmit={addProject}
                onClose={() => setOpenForm(null)}
                isLoading={isLoading.project}
                setDirty={setFormDirty}
              />
            </div>
          )}
          {openForm === 'vendor' && (
            <div className="bg-white rounded-lg shadow p-6 mb-4 w-full">
              <AddForm
                title="Add New Vendor"
                icon={<UserPlus className="w-6 h-6 text-blue-600" />}
                fields={vendorFields}
                onSubmit={addSubcontractor}
                onClose={() => setOpenForm(null)}
                isLoading={isLoading.vendor}
                setDirty={setFormDirty}
              />
            </div>
          )}
          {openForm === 'contract' && (
            <div className="bg-white rounded-lg shadow p-6 mb-4 w-full">
              <AddContractForm
                onClose={() => setOpenForm(null)}
                onSuccess={() => addNotification('success', 'Contract added successfully!')}
                onError={(message) => addNotification('error', message)}
                setDirty={setFormDirty}
              />
            </div>
          )}
          {showUnsavedWarning && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-4 w-full flex items-center justify-between">
              <span>You have unsaved changes. Are you sure you want to switch forms?</span>
              <div className="flex gap-2">
                <button onClick={handleConfirmSwitch} className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500">Switch</button>
                <button onClick={handleCancelSwitch} className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageView;