import React, { useState, ChangeEvent, FormEvent, ReactNode, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { Building, UserPlus, FilePlus, AlertCircle, CheckCircle, X } from 'lucide-react';
import LineItemFormModal from '@/components/LineItemFormModal';
import LineItemEditor, { LineItem } from '@/components/LineItemEditor';

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
  defaultValue?: string;
}

// Enhanced notification component
const NotificationManager: React.FC<{
  notifications: NotificationData[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 left-4 right-4 sm:top-6 sm:right-6 sm:left-auto z-50 space-y-2 sm:max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            px-4 py-3 sm:px-6 sm:py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-3 w-full sm:min-w-80
            ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-sm sm:text-base">{notification.message}</span>
          <button
            onClick={() => onRemove(notification.id)}
            className="hover:opacity-70 transition-opacity flex-shrink-0"
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
  initialData?: Record<string, string>;
};

const AddForm: React.FC<AddFormProps> = ({ 
  title, 
  icon, 
  fields, 
  onSubmit, 
  onClose,
  isLoading = false,
  setDirty,
  initialData
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    () => {
      const defaultData = fields.reduce((acc, field) => {
        acc[field.name] = field.defaultValue || '';
        return acc;
      }, {} as Record<string, string>);
      
      // Merge with initialData if provided
      return initialData ? { ...defaultData, ...initialData } : defaultData;
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: string) => {
    const field = fields.find(f => f.name === name);
    if (!field) return '';

    if (field.required && !value.trim()) {
      return 'This field is required';
    }

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
    if (name === 'phone') {
      let newValue = value;
      if (!newValue.startsWith('+1')) {
        newValue = '+1' + newValue.replace(/[^\d]/g, '').replace(/^1*/, '');
      }
      setFormData(prev => ({ ...prev, [name]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    try {
      await onSubmit(formData);
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
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                        disabled={isLoading}
                      >
          <X className="w-6 h-6" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
    contractNickname: "",
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
      const { data, error: contractError } = await supabase
        .from('contracts')
        .insert([{
          project_id: Number(formData.projectId),
          subcontractor_id: Number(formData.subcontractorId),
          contract_amount: Number(formData.contractAmount),
          contract_nickname: formData.contractNickname || null,
          start_date: formData.startDate,
          end_date: formData.endDate || null,
        }])
        .select()
        .single();

      if (contractError) {
        throw new Error(`Failed to create contract: ${contractError.message}`);
      }

      const contractId = data.id;

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
          await supabase.from('contracts').delete().eq('id', contractId);
          throw new Error(`Failed to create line items: ${lineItemsError.message}`);
        }
      }

      setFormData({
        projectId: "",
        subcontractorId: "",
        contractAmount: "",
        contractNickname: "",
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contract Nickname
          </label>
          <input
            type="text"
            value={formData.contractNickname}
            onChange={handleInputChange('contractNickname')}
            className={`
              w-full px-5 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black
              ${errors.contractNickname ? 'border-red-300' : 'border-gray-200'}
            `}
            placeholder="e.g., Plumbing Phase 1, Electrical Rough-In"
            disabled={loading}
          />
          {errors.contractNickname && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.contractNickname}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Line Items</label>
          <div className="border rounded-lg p-4 bg-gray-50 mb-4">
            {showLineItemForm ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item No</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Value</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Previous</label>
                  <input
                    type="number"
                    name="fromPrevious"
                    value={lineItemForm.fromPrevious}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">This Period</label>
                  <input
                    type="number"
                    name="thisPeriod"
                    value={lineItemForm.thisPeriod}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Material Stored</label>
                  <input
                    type="number"
                    name="materialStored"
                    value={lineItemForm.materialStored}
                    onChange={handleLineItemChange}
                    className="w-full px-3 py-2 text-base border rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">% G/C</label>
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
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-gray-700">Item No</th>
                  <th className="border px-2 py-1 text-gray-700">Description</th>
                  <th className="border px-2 py-1 text-gray-700">Scheduled Value</th>
                  <th className="border px-2 py-1 text-gray-700">From Previous</th>
                  <th className="border px-2 py-1 text-gray-700">This Period</th>
                  <th className="border px-2 py-1 text-gray-700">Material Stored</th>
                  <th className="border px-2 py-1 text-gray-700">% G/C</th>
                  <th className="border px-2 py-1 text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-500 py-2">No line items added.</td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1 text-gray-700">{item.itemNo}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.description}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.scheduledValue}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.fromPrevious}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.thisPeriod}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.materialStored}</td>
                      <td className="border px-2 py-1 text-gray-700">{item.percentGC}</td>
                      <td className="border px-2 py-1 text-gray-700 flex gap-2">
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
            <div className="text-right mt-2 text-sm text-gray-700">
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewModal, setViewModal] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [editModal, setEditModal] = useState<'project' | 'vendor' | 'contract' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
      throw error;
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
      throw error;
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
    { name: 'phone', placeholder: 'Phone', type: 'tel', validators: [validators.phone], defaultValue: '+1' },
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
      const matchesFilter = filterStatus === 'all' || (project as any).status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchTerm, filterStatus]);

  const filteredVendors = useMemo(() => {
    return subcontractors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (vendor as any).email?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleViewItem = (item: any, type: 'project' | 'vendor' | 'contract') => {
    setSelectedItem(item);
    setViewModal(type);
  };

  const handleEditItem = (item: any, type: 'project' | 'vendor' | 'contract') => {
    setSelectedItem(item);
    setEditModal(type);
  };

  const handleCloseViewModal = () => {
    setViewModal(null);
    setSelectedItem(null);
  };

  const handleCloseEditModal = () => {
    setEditModal(null);
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <NotificationManager 
          notifications={notifications} 
          onRemove={removeNotification} 
        />

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Construction Management
            </h1>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <div className="text-lg sm:text-xl font-bold text-blue-600">Projects</div>
                <div className="text-xs sm:text-sm text-gray-600">{projects.length}</div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <div className="text-lg sm:text-xl font-bold text-green-600">Vendors</div>
                <div className="text-xs sm:text-sm text-gray-600">{subcontractors.length}</div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <div className="text-lg sm:text-xl font-bold text-purple-600">Contracts</div>
                <div className="text-xs sm:text-sm text-gray-600">{contracts.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sm:hidden mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'projects'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Projects ({filteredProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'vendors'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendors ({filteredVendors.length})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'contracts'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contracts ({filteredContracts.length})
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:block mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('projects')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'projects'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Projects
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {filteredProjects.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'vendors'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Vendors
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {filteredVendors.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contracts'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Contracts
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {filteredContracts.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="mb-6">
          {/* Mobile Controls */}
          <div className="sm:hidden space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
              >
                Filter
              </button>
              {selectedItems.size > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenForm(activeTab === 'projects' ? 'project' : activeTab === 'vendors' ? 'vendor' : 'contract')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              )}
            </div>

            {showMobileFilters && (
              <div className="bg-white text-gray-700 p-4 rounded-lg border border-gray-200">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2  text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>

          {/* Desktop Controls */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              {selectedItems.size > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}

              <button
                onClick={() => handleOpenForm(activeTab === 'projects' ? 'project' : activeTab === 'vendors' ? 'vendor' : 'contract')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add {activeTab === 'projects' ? 'Project' : activeTab === 'vendors' ? 'Vendor' : 'Contract'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'projects' && (
            <div>
              {/* Mobile Cards */}
              <div className="sm:hidden space-y-4">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleViewItem(project, 'project')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start space-x-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(project.id)}
                          onChange={() => handleItemSelect(project.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500">{project.client_name || 'No client'}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {(project as any).status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Phase:</span>
                        <span className="ml-1 text-gray-900">{project.current_phase || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Budget:</span>
                        <span className="ml-1 text-gray-900">${(project.budget || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <span className="ml-1 text-gray-900">{(project as any).start_date || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Spent:</span>
                        <span className="ml-1 text-gray-900">${(project.spent || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {project.budget && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{Math.round(((project.spent || 0) / project.budget) * 100)}%</span>
                        </div>
                        <div className="mt-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(((project.spent || 0) / project.budget) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditItem(project, 'project')}
                        className="px-3 py-1 text-blue-600 hover:text-blue-900 text-sm font-medium border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Building className="w-12 h-12 mx-auto" />
                    </div>
                    <p className="text-gray-500">No projects found</p>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <tr 
                        key={project.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => handleViewItem(project, 'project')}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(project.id)}
                            onChange={() => handleItemSelect(project.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{project.name}</div>
                              <div className="text-sm text-gray-500">Started: {(project as any).start_date || 'Not set'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.client_name || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.current_phase || 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(project.budget || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {(project as any).status || 'Active'}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${project.budget ? Math.min(((project.spent || 0) / project.budget) * 100, 100) : 0}%` }}
                                />
                              </div>
                            </div>
                            <div className="ml-2 text-xs">
                              ${(project.spent || 0).toLocaleString()} / ${(project.budget || 0).toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditItem(project, 'project')}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-500">Click row to view</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="text-gray-400 mb-4">
                            <Building className="w-12 h-12 mx-auto" />
                          </div>
                          <p className="text-gray-500">No projects found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div>
              {/* Mobile Cards */}
              <div className="sm:hidden space-y-4">
                {filteredVendors.map((vendor) => (
                  <div 
                    key={vendor.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleViewItem(vendor, 'vendor')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start space-x-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(vendor.id)}
                          onChange={() => handleItemSelect(vendor.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                          <p className="text-sm text-gray-500">ID: #{vendor.id}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {vendor.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {vendor.trade}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-1 text-gray-900">{vendor.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-1 text-gray-900">{(vendor as any).email || 'Not provided'}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Performance:</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${
                                star <= ((vendor as any).performance_score || 0)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {(vendor as any).performance_score ? `${(vendor as any).performance_score}/5` : 'Not rated'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditItem(vendor, 'vendor')}
                        className="px-3 py-1 text-blue-600 hover:text-blue-900 text-sm font-medium border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}

                {filteredVendors.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <UserPlus className="w-12 h-12 mx-auto" />
                    </div>
                    <p className="text-gray-500">No vendors found</p>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVendors.map((vendor) => (
                      <tr 
                        key={vendor.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => handleViewItem(vendor, 'vendor')}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(vendor.id)}
                            onChange={() => handleItemSelect(vendor.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <UserPlus className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                              <div className="text-sm text-gray-500">ID: #{vendor.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {vendor.trade}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{vendor.phone}</div>
                          <div className="text-gray-500">{(vendor as any).email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 mr-2">
                              {(vendor as any).performance_score ? `${(vendor as any).performance_score}/5` : 'Not rated'}
                            </span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= ((vendor as any).performance_score || 0)
                                      ? 'text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {vendor.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditItem(vendor, 'vendor')}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-500">Click row to view</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredVendors.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="text-gray-400 mb-4">
                            <UserPlus className="w-12 h-12 mx-auto" />
                          </div>
                          <p className="text-gray-500">No vendors found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              {/* Mobile Cards */}
              <div className="sm:hidden space-y-4">
                {filteredContracts.map((contract) => (
                  <div 
                    key={contract.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handleViewItem(contract, 'contract')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start space-x-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(contract.id)}
                          onChange={() => handleItemSelect(contract.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {contract.contract_nickname || contract.project?.name || 'Unknown Project'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {contract.contract_nickname ? `${contract.project?.name || 'Unknown Project'} • ` : ''}Contract #{contract.id}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {contract.status || 'Active'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Vendor:</span>
                        <span className="ml-1 text-gray-900">{contract.subcontractor?.name || 'Unknown Vendor'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="ml-1 text-gray-900">${(contract.contract_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <div className="text-gray-900">{contract.start_date || 'Not set'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <div className="text-gray-900">{contract.end_date || 'Ongoing'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditItem(contract, 'contract')}
                        className="px-3 py-1 text-blue-600 hover:text-blue-900 text-sm font-medium border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}

                {filteredContracts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <FilePlus className="w-12 h-12 mx-auto" />
                    </div>
                    <p className="text-gray-500">No contracts found</p>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                      {/*<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nickname
                      </th>*/}
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
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FilePlus className="h-5 w-5 text-purple-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {contract.contract_nickname || contract.project?.name || 'Unknown Project'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {contract.contract_nickname ? `${contract.project?.name || 'Unknown Project'} • ` : ''}Contract #{contract.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/*<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contract.contract_nickname || (
                            <span className="text-gray-400 italic">No nickname</span>
                          )}
                        </td>*/}
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {contract.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredContracts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="text-gray-400 mb-4">
                            <FilePlus className="w-12 h-12 mx-auto" />
                          </div>
                          <p className="text-gray-500">No contracts found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Forms */}
      {openForm === 'project' && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
        </div>
      )}

      {openForm === 'vendor' && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
        </div>
      )}

      {openForm === 'contract' && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AddContractForm
              onClose={() => setOpenForm(null)}
              onSuccess={() => addNotification('success', 'Contract added successfully!')}
              onError={(message) => addNotification('error', message)}
              setDirty={setFormDirty}
            />
          </div>
        </div>
      )}

      {/* View Modals */}
      {viewModal === 'project' && selectedItem && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Project Details</h3>
              <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div><span className="font-semibold">Name:</span> {selectedItem.name}</div>
              <div><span className="font-semibold">Client:</span> {selectedItem.client_name || 'Not specified'}</div>
              <div><span className="font-semibold">Phase:</span> {selectedItem.current_phase || 'Not set'}</div>
              <div><span className="font-semibold">Budget:</span> ${(selectedItem.budget || 0).toLocaleString()}</div>
              <div><span className="font-semibold">Spent:</span> ${(selectedItem.spent || 0).toLocaleString()}</div>
              <div><span className="font-semibold">Status:</span> {(selectedItem as any).status || 'Active'}</div>
              <div><span className="font-semibold">Start Date:</span> {(selectedItem as any).start_date || 'Not set'}</div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditItem(selectedItem, 'project')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Project
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModal === 'vendor' && selectedItem && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Vendor Details</h3>
              <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div><span className="font-semibold">Name:</span> {selectedItem.name}</div>
              <div><span className="font-semibold">Trade:</span> {selectedItem.trade}</div>
              <div><span className="font-semibold">Phone:</span> {selectedItem.phone || 'Not provided'}</div>
              <div><span className="font-semibold">Email:</span> {(selectedItem as any).email || 'Not provided'}</div>
              <div><span className="font-semibold">Status:</span> {selectedItem.status || 'Active'}</div>
              <div><span className="font-semibold">Performance Score:</span> {(selectedItem as any).performance_score || 'Not rated'}/5</div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditItem(selectedItem, 'vendor')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModal === 'contract' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Contract Details</h3>
              <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div><span className="font-semibold">Project:</span> {selectedItem.project?.name || 'Unknown Project'}</div>
              <div><span className="font-semibold">Vendor:</span> {selectedItem.subcontractor?.name || 'Unknown Vendor'}</div>
              {selectedItem.contract_nickname && (
                <div><span className="font-semibold">Contract Nickname:</span> {selectedItem.contract_nickname}</div>
              )}
              <div><span className="font-semibold">Contract Amount:</span> ${(selectedItem.contract_amount || 0).toLocaleString()}</div>
              <div><span className="font-semibold">Start Date:</span> {selectedItem.start_date || 'Not set'}</div>
              <div><span className="font-semibold">End Date:</span> {selectedItem.end_date || 'Ongoing'}</div>
              <div><span className="font-semibold">Status:</span> {selectedItem.status || 'Active'}</div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => handleEditItem(selectedItem, 'contract')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modals */}
      {editModal === 'project' && selectedItem && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddForm
              title="Edit Project"
              icon={<Building className="w-6 h-6 text-blue-600" />}
              fields={projectFields}
              onSubmit={addProject}
              onClose={handleCloseEditModal}
              isLoading={isLoading.project}
              setDirty={setFormDirty}
              initialData={{
                name: selectedItem.name || '',
                client_name: selectedItem.client_name || '',
                current_phase: selectedItem.current_phase || '',
                budget: selectedItem.budget?.toString() || '',
                spent: selectedItem.spent?.toString() || '',
              }}
            />
          </div>
        </div>
      )}

      {editModal === 'vendor' && selectedItem && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AddForm
              title="Edit Vendor"
              icon={<UserPlus className="w-6 h-6 text-blue-600" />}
              fields={vendorFields}
              onSubmit={addSubcontractor}
              onClose={handleCloseEditModal}
              isLoading={isLoading.vendor}
              setDirty={setFormDirty}
              initialData={{
                name: selectedItem.name || '',
                trade: selectedItem.trade || '',
                phone: selectedItem.phone || '',
                email: (selectedItem as any).email || '',
              }}
            />
          </div>
        </div>
      )}

      {editModal === 'contract' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AddContractForm
              onClose={handleCloseEditModal}
              onSuccess={() => addNotification('success', 'Contract updated successfully!')}
              onError={(message) => addNotification('error', message)}
              setDirty={setFormDirty}
            />
          </div>
        </div>
      )}

      {/* Unsaved Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to switch forms? Your current changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleCancelSwitch} 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSwitch} 
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageView;
