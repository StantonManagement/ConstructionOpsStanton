'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { supabase } from '@/lib/supabaseClient';
import { CreatePunchListItemRequest, PunchListSeverity, PunchListCategory } from '@/types/punch-list';

interface PunchListFormModalProps {
  projectId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PunchListFormModal({ projectId, onClose, onSuccess }: PunchListFormModalProps) {
  const { subcontractors, projects } = useData();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<PunchListCategory[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreatePunchListItemRequest>>({
    project_id: projectId,
    description: '',
    location: '',
    unit_number: '',
    trade_category: '',
    severity: 'medium',
    assigned_to: undefined,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        const response = await fetch('/api/punch-list/categories', {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Auto-set due date based on severity
  useEffect(() => {
    if (!formData.due_date && formData.severity) {
      const days = 
        formData.severity === 'critical' ? 1 : 
        formData.severity === 'high' ? 3 : 
        formData.severity === 'medium' ? 7 : 14;
      
      const date = new Date();
      date.setDate(date.getDate() + days);
      setFormData(prev => ({ ...prev, due_date: date.toISOString().split('T')[0] }));
    }
  }, [formData.severity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.description || !formData.severity) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('No session');

      const response = await fetch('/api/punch-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating punch list item:', error);
      alert('Failed to create punch list item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Punch List Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Selection (if not provided) */}
            {!projectId && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  value={formData.project_id || ''}
                  onChange={(e) => setFormData({ ...formData, project_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                rows={3}
                required
                placeholder="Describe the issue..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                placeholder="e.g., Kitchen, Master Bath"
              />
            </div>

            {/* Unit Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
              <input
                type="text"
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                placeholder="Optional"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trade Category</label>
              <select
                value={formData.trade_category}
                onChange={(e) => setFormData({ ...formData, trade_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as PunchListSeverity })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Contractor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Contractor</label>
              <select
                value={formData.assigned_to || ''}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
              >
                <option value="">Unassigned</option>
                {subcontractors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



