'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ScheduleTask, CreateTaskRequest, TaskStatus } from '@/types/schedule';

interface TaskFormModalProps {
  scheduleId: string;
  existingTask?: ScheduleTask;
  allTasks: ScheduleTask[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Contractor {
  id: number;
  name: string;
}

export default function TaskFormModal({ 
  scheduleId, 
  existingTask, 
  allTasks, 
  onClose, 
  onSuccess 
}: TaskFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreateTaskRequest>>({
    task_name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: 'not_started',
    progress: 0,
    contractor_id: undefined,
    predecessors: []
  });

  useEffect(() => {
    if (existingTask) {
      setFormData({
        task_name: existingTask.task_name,
        description: existingTask.description || '',
        start_date: existingTask.start_date,
        end_date: existingTask.end_date,
        status: existingTask.status,
        progress: existingTask.progress,
        contractor_id: existingTask.contractor_id,
        predecessors: existingTask.dependencies || []
      });
    }
  }, [existingTask]);

  // Fetch contractors
  useEffect(() => {
    const fetchContractors = async () => {
      const { data } = await supabase
        .from('contractors')
        .select('id, name')
        .order('name');
      if (data) setContractors(data);
    };
    fetchContractors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const url = existingTask 
        ? `/api/schedules/${scheduleId}/tasks/${existingTask.id}`
        : `/api/schedules/${scheduleId}/tasks`;

      const method = existingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          schedule_id: scheduleId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save task');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter out self and circular dependencies (basic check: exclude self)
  const availablePredecessors = allTasks.filter(t => t.id !== existingTask?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">
            {existingTask ? 'Edit Task' : 'New Task'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
            <input
              type="text"
              required
              value={formData.task_name}
              onChange={e => setFormData({...formData, task_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                min={formData.start_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
            <select
              value={formData.contractor_id || ''}
              onChange={e => setFormData({...formData, contractor_id: e.target.value ? parseInt(e.target.value) : undefined})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={e => setFormData({...formData, progress: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Predecessors (Simple Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Predecessors (Depends on)</label>
            <select
              multiple
              value={formData.predecessors}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({...formData, predecessors: selected});
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
            >
              {availablePredecessors.map(t => (
                <option key={t.id} value={t.id}>
                  {t.task_name} ({t.start_date})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

