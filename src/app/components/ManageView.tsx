import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X } from 'lucide-react';
import LineItemFormModal from '@/components/LineItemFormModal';
import LineItemEditor, { LineItem } from '@/components/LineItemEditor';
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
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email address',
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
  const { dispatch } = useData();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [openForm, setOpenForm] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [pendingForm, setPendingForm] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

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

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <NotificationManager 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Construction Management</h1>
      
      {/* Action Buttons Bar */}
      <div className="flex flex-wrap gap-4 mb-8 bg-white rounded-lg shadow p-4 sticky top-0 z-10">
        <button
          onClick={() => handleOpenForm('project')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Add Project"
        >
          <Building className="w-5 h-5" />
          Add Project
        </button>
        <button
          onClick={() => handleOpenForm('vendor')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Add Vendor"
        >
          <UserPlus className="w-5 h-5" />
          Add Subcontractor
        </button>
        <button
          onClick={() => handleOpenForm('contract')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Add Contract"
        >
          <FilePlus className="w-5 h-5" />
          Add Contract
        </button>
      </div>

      {/* Inline Forms - only one visible at a time */}
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
        {openForm === null && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
            <Image src="/file.svg" alt="Add Illustration" width={96} height={96} className="mb-4" />
            <span className="text-xl font-semibold">Click the buttons above to add</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageView;
import React from 'react';

const ManageView: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 text-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Management</h3>
      <p className="text-gray-600">Project management tools coming soon...</p>
    </div>
  );
};

export default ManageView;
