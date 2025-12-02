'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CreatePunchListItemRequest, PunchListSeverity } from '@/types/punch-list';

interface PunchListFormModalProps {
  projectId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: number;
  name: string;
}

interface Contractor {
  id: number;
  name: string;
}

export default function PunchListFormModal({ projectId, onClose, onSuccess }: PunchListFormModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreatePunchListItemRequest>({
    project_id: projectId || 0,
    description: '',
    location: '',
    unit_number: '',
    trade_category: '',
    severity: 'medium',
    contractor_id: undefined,
    assigned_to: undefined,
    due_date: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch projects and contractors
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        // Fetch projects
        const projectsResponse = await fetch('/api/projects/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({}),
        });
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData.projects || []);
        }

        // Fetch contractors
        const { data: contractorsData } = await supabase
          .from('contractors')
          .select('id, name')
          .order('name');
        setContractors(contractorsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-calculate due date based on severity
  useEffect(() => {
    if (!formData.due_date) {
      const today = new Date();
      let daysToAdd = 7; // default

      switch (formData.severity) {
        case 'critical':
          daysToAdd = 3;
          break;
        case 'high':
          daysToAdd = 3;
          break;
        case 'medium':
          daysToAdd = 7;
          break;
        case 'low':
          daysToAdd = 14;
          break;
      }

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.severity]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }
    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (!formData.severity) {
      newErrors.severity = 'Severity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/punch-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create punch list item');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating punch list item:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create item' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Add Punch List Item</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.project_id ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={!!projectId}
                >
                  <option value={0}>Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                {errors.project_id && <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Location and Unit Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Kitchen, Bathroom 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number
                  </label>
                  <input
                    type="text"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    placeholder="e.g., Unit 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Trade Category and Severity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trade Category
                  </label>
                  <select
                    value={formData.trade_category}
                    onChange={(e) => setFormData({ ...formData, trade_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    <option value="Electrical">⚡ Electrical</option>
                    <option value="Plumbing">💧 Plumbing</option>
                    <option value="HVAC">❄️ HVAC</option>
                    <option value="Drywall">🧱 Drywall</option>
                    <option value="Paint">🎨 Paint</option>
                    <option value="Flooring">📐 Flooring</option>
                    <option value="Carpentry">🔨 Carpentry</option>
                    <option value="Exterior">🏠 Exterior</option>
                    <option value="Landscaping">🌳 Landscaping</option>
                    <option value="General">🔧 General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as PunchListSeverity })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.severity ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="critical">🔴 Critical (3 days)</option>
                    <option value="high">🟠 High (3 days)</option>
                    <option value="medium">🟡 Medium (7 days)</option>
                    <option value="low">⚪ Low (14 days)</option>
                  </select>
                  {errors.severity && <p className="mt-1 text-sm text-red-600">{errors.severity}</p>}
                </div>
              </div>

              {/* Contractor Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Contractor
                </label>
                <select
                  value={formData.assigned_to || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {contractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Auto-calculated based on severity</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create & Notify'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

