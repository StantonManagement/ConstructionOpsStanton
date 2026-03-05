'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

interface Project {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface QuickAddActionItemProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 - Drop Everything', color: 'text-red-600 dark:text-red-400' },
  { value: 2, label: 'P2 - Today/This Week', color: 'text-orange-600 dark:text-orange-400' },
  { value: 3, label: 'P3 - Needs Push', color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 4, label: 'P4 - On Radar', color: 'text-gray-600 dark:text-gray-400' },
  { value: 5, label: 'P5 - Parked', color: 'text-slate-600 dark:text-slate-400' }
];

const TYPE_OPTIONS = [
  'general',
  'emergency',
  'blocker',
  'waiting_on_external',
  'follow_up'
];

const STATUS_OPTIONS = [
  'open',
  'in_progress',
  'waiting',
  'deferred'
];

export default function QuickAddActionItem({ isOpen, onClose, onSuccess }: QuickAddActionItemProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 3,
    type: 'general',
    status: 'open',
    waiting_on: '',
    follow_up_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const response = await authFetch('/api/projects');
      const data: { projects: Project[] } = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setError('Failed to load projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.project_id) {
      setError('Project is required');
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        project_id: parseInt(formData.project_id),
        priority: formData.priority,
        type: formData.type,
        status: formData.status,
        waiting_on: formData.waiting_on.trim() || null,
        follow_up_date: formData.follow_up_date || null
      };

      await authFetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        project_id: '',
        priority: 3,
        type: 'general',
        status: 'open',
        waiting_on: '',
        follow_up_date: ''
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create action item:', error);
      setError(error instanceof Error ? error.message : 'Failed to create action item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plus className="w-6 h-6 text-primary" />
            Quick Add Action Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter action item title..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="project" className="block text-sm font-semibold text-foreground mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            {isLoadingProjects ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                id="project"
                value={formData.project_id}
                onChange={(e) => handleChange('project_id', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                <option value="">Select a project...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Priority and Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-semibold text-foreground mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-foreground mb-2">
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                {TYPE_OPTIONS.map(type => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-foreground mb-2">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Waiting On and Follow-up Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="waiting_on" className="block text-sm font-semibold text-foreground mb-2">
                Waiting On
              </label>
              <input
                id="waiting_on"
                type="text"
                value={formData.waiting_on}
                onChange={(e) => handleChange('waiting_on', e.target.value)}
                placeholder="Person or dependency..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="follow_up_date" className="block text-sm font-semibold text-foreground mb-2">
                Follow-up Date
              </label>
              <input
                id="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => handleChange('follow_up_date', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Action Item
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
