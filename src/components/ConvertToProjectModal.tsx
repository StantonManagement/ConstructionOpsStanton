import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProperties } from '@/hooks/queries/useProperties';

interface ConvertToProjectModalProps {
  backlogItem: {
    id: string;
    title: string;
    description?: string;
    estimated_cost?: number;
    scope_level: 'portfolio' | 'property';
    portfolio_id?: string;
    property_id?: string;
  };
  onClose: () => void;
  onConvert: (data: {
    name: string;
    property_id: string;
    budget?: number;
    start_date?: string;
    target_completion_date?: string;
    description?: string;
  }) => Promise<void>;
}

export default function ConvertToProjectModal({
  backlogItem,
  onClose,
  onConvert,
}: ConvertToProjectModalProps) {
  const { data: allProperties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: backlogItem.property_id || '',
    name: backlogItem.title,
    budget: backlogItem.estimated_cost || 0,
    start_date: '',
    target_completion_date: '',
    description: backlogItem.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProperties = backlogItem.scope_level === 'portfolio'
    ? (allProperties || []).filter(p => p.portfolio_id === backlogItem.portfolio_id)
    : (allProperties || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.property_id) {
      setError('Please select a property');
      return;
    }

    if (formData.budget && formData.budget <= 0) {
      setError('Budget must be greater than 0');
      return;
    }

    if (formData.start_date && formData.target_completion_date) {
      if (new Date(formData.target_completion_date) <= new Date(formData.start_date)) {
        setError('End date must be after start date');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConvert(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to convert to project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Convert to Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property (Building) *
            </label>
            <select
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={backlogItem.scope_level === 'property' && !!backlogItem.property_id}
            >
              <option value="">Select a property</option>
              {filteredProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} {property.address && `- ${property.address}`}
                </option>
              ))}
            </select>
            {backlogItem.scope_level === 'portfolio' && (
              <p className="text-xs text-gray-500 mt-1">
                Only properties in the same portfolio are shown
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., Gut Rehab, Roof Replacement"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the scope of work (project) for the selected property
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget
            </label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Completion
              </label>
              <input
                type="date"
                value={formData.target_completion_date}
                onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
