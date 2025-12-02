'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useData } from '@/app/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { CreateWarrantyRequest, WarrantyType } from '@/types/warranties';

interface WarrantyFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function WarrantyFormModal({ onClose, onSuccess }: WarrantyFormModalProps) {
  const { projects, subcontractors } = useData();
  const [loading, setLoading] = useState(false);
  const [warrantyTypes, setWarrantyTypes] = useState<WarrantyType[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreateWarrantyRequest>>({
    project_id: undefined,
    contractor_id: undefined,
    warranty_type: '',
    coverage_description: '',
    start_date: new Date().toISOString().split('T')[0],
    duration_months: 12,
    notes: ''
  });

  // Fetch warranty types
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;
        const response = await fetch('/api/warranties/types', {
          headers: { 'Authorization': `Bearer ${session.session.access_token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setWarrantyTypes(result.data || []);
        }
      } catch (e) {
        console.error('Error fetching warranty types', e);
      }
    };
    fetchTypes();
  }, []);

  // Calculate end date when start date or duration changes
  useEffect(() => {
    if (formData.start_date && formData.duration_months) {
      const start = new Date(formData.start_date);
      const end = new Date(start);
      end.setMonth(end.getMonth() + formData.duration_months);
      setFormData(prev => ({ ...prev, end_date: end.toISOString().split('T')[0] }));
    }
  }, [formData.start_date, formData.duration_months]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.coverage_description || !formData.start_date) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('No session');

      const response = await fetch('/api/warranties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create warranty');

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating warranty:', error);
      alert('Failed to create warranty');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Log New Warranty</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Project */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select
                value={formData.project_id || ''}
                onChange={(e) => setFormData({ ...formData, project_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Contractor */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
              <select
                value={formData.contractor_id || ''}
                onChange={(e) => setFormData({ ...formData, contractor_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Contractor</option>
                {subcontractors.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type</label>
              <select
                value={formData.warranty_type}
                onChange={(e) => setFormData({ ...formData, warranty_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Custom / Other</option>
                {warrantyTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
              <input
                type="number"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Description *</label>
              <textarea
                value={formData.coverage_description}
                onChange={(e) => setFormData({ ...formData, coverage_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                required
                placeholder="What is covered under this warranty?"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Exclusions</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              {loading ? 'Saving...' : 'Save Warranty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



