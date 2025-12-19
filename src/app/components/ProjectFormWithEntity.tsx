'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building, X, AlertCircle } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OwnerEntity {
  id: number;
  name: string;
  entity_type: string;
}

interface ProjectFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  initialData?: Record<string, any>;
}

const labelize = (str: string) => 
  str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ProjectFormWithEntity: React.FC<ProjectFormProps> = ({ 
  onSubmit, 
  onClose,
  isLoading = false,
  initialData = {}
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: initialData.name || '',
    address: initialData.address || '',
    client_name: initialData.client_name || '',
    budget: initialData.budget || '',
    starting_balance: initialData.starting_balance || '',
    start_date: initialData.start_date || '',
    target_completion_date: initialData.target_completion_date || '',
    status: initialData.status || 'active',
    current_phase: initialData.current_phase || 'Planning',
    owner_entity_id: initialData.owner_entity_id || '',
    portfolio_name: initialData.portfolio_name || '',
    total_units: initialData.total_units || '1'
  });

  const [entities, setEntities] = useState<OwnerEntity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Fetch entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await authFetch('/api/entities?active_only=true');

        if (response.ok) {
          const data = await response.json();
          setEntities(data.entities || []);
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, []);

  const validateField = (name: string, value: any) => {
    // Required fields
    if (['name', 'address', 'client_name'].includes(name) && !value?.toString().trim()) {
      return 'This field is required';
    }

    // Number validation for budget and starting_balance
    if (['budget', 'starting_balance'].includes(name) && value && isNaN(Number(value))) {
      return 'Please enter a valid number';
    }

    // Number validation for total_units
    if (name === 'total_units' && value && (isNaN(Number(value)) || Number(value) < 1)) {
      return 'Must be at least 1';
    }

    return '';
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (name: string, value: any) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    ['name', 'address', 'client_name'].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(Object.keys(newErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      budget: formData.budget ? Number(formData.budget) : null,
      starting_balance: formData.starting_balance ? Number(formData.starting_balance) : 0,
      owner_entity_id: formData.owner_entity_id ? Number(formData.owner_entity_id) : null,
      total_units: formData.total_units ? Number(formData.total_units) : 1,
      target_completion_date: formData.target_completion_date || null,
      portfolio_name: formData.portfolio_name || null
    };

    await onSubmit(submitData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            {initialData.id ? 'Edit Project' : 'New Project'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Project Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Project Name <span className="text-[var(--status-critical-text)]">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={(e) => handleBlur('name', e.target.value)}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
                  errors.name && touched.name 
                    ? 'border-[var(--status-critical-border)]' 
                    : 'border-border'
                }`}
                placeholder="Enter project name"
                disabled={isLoading}
              />
              {errors.name && touched.name && (
                <p className="mt-1 text-sm text-[var(--status-critical-text)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Address <span className="text-[var(--status-critical-text)]">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={(e) => handleBlur('address', e.target.value)}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
                  errors.address && touched.address 
                    ? 'border-[var(--status-critical-border)]' 
                    : 'border-border'
                }`}
                placeholder="Enter project address"
                disabled={isLoading}
              />
              {errors.address && touched.address && (
                <p className="mt-1 text-sm text-[var(--status-critical-text)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.address}
                </p>
              )}
            </div>

            {/* Client Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Client Name <span className="text-[var(--status-critical-text)]">*</span>
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                onBlur={(e) => handleBlur('client_name', e.target.value)}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
                  errors.client_name && touched.client_name 
                    ? 'border-[var(--status-critical-border)]' 
                    : 'border-border'
                }`}
                placeholder="Enter client name"
                disabled={isLoading}
              />
              {errors.client_name && touched.client_name && (
                <p className="mt-1 text-sm text-[var(--status-critical-text)] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.client_name}
                </p>
              )}
            </div>

            {/* Owner Entity */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Owner Entity
              </label>
              <Select 
                value={formData.owner_entity_id?.toString() || 'none'} 
                onValueChange={(value) => handleSelectChange('owner_entity_id', value === 'none' ? '' : value)}
                disabled={isLoading || loadingEntities}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingEntities ? "Loading entities..." : "Select owner entity (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Entity)</SelectItem>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id.toString()}>
                      {entity.name} ({entity.entity_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign this property to an LLC/entity for tracking purposes
              </p>
            </div>

            {/* Portfolio Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Portfolio Name
              </label>
              <input
                type="text"
                name="portfolio_name"
                value={formData.portfolio_name}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400"
                placeholder="e.g., South End, 90 Park"
                disabled={isLoading}
              />
            </div>

            {/* Total Units */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Total Units
              </label>
              <input
                type="number"
                name="total_units"
                value={formData.total_units}
                onChange={handleChange}
                onBlur={(e) => handleBlur('total_units', e.target.value)}
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400 ${
                  errors.total_units && touched.total_units 
                    ? 'border-[var(--status-critical-border)]' 
                    : 'border-border'
                }`}
                placeholder="1"
                min="1"
                disabled={isLoading}
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Budget
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                onBlur={(e) => handleBlur('budget', e.target.value)}
                className="w-full px-4 py-3 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400"
                placeholder="Enter project budget"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>

            {/* Starting Balance */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Starting Balance
              </label>
              <input
                type="number"
                name="starting_balance"
                value={formData.starting_balance}
                onChange={handleChange}
                onBlur={(e) => handleBlur('starting_balance', e.target.value)}
                className="w-full px-4 py-3 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground placeholder-gray-400"
                placeholder="Initial cash on hand"
                step="0.01"
                disabled={isLoading}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Status
              </label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleSelectChange('status', value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground"
                disabled={isLoading}
              />
            </div>

            {/* Target Completion Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Target Completion Date
              </label>
              <input
                type="date"
                name="target_completion_date"
                value={formData.target_completion_date}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border border-border rounded-lg focus:ring-2 focus:ring-primary transition-all duration-200 bg-secondary text-foreground"
                disabled={isLoading}
              />
            </div>

            {/* Current Phase */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Current Phase
              </label>
              <Select 
                value={formData.current_phase || 'Pre-Construction'} 
                onValueChange={(value) => handleSelectChange('current_phase', value)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select current phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-Construction">Pre-Construction</SelectItem>
                  <SelectItem value="Permitting">Permitting</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Close-Out">Close-Out</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Select the current construction phase for this project
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:bg-primary/50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectFormWithEntity;

