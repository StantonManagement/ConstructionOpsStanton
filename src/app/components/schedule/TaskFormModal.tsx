'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ScheduleTask, CreateTaskRequest, TaskStatus } from '@/types/schedule';
import { DollarSign, Move, X, Calendar, CheckSquare, Square, AlertCircle } from 'lucide-react';

interface BudgetCategory {
  id: number;
  category_name: string;
  revised_amount: number;
}

interface TaskFormModalProps {
  scheduleId: string;
  projectId?: number;
  existingTask?: ScheduleTask;
  initialBudgetCategoryId?: number | null;
  allTasks: ScheduleTask[];
  budgetCategories?: BudgetCategory[]; // Added prop
  onClose: () => void;
  onSuccess: () => void;
}

interface Contractor {
  id: number;
  name: string;
}

export default function TaskFormModal({ 
  scheduleId,
  projectId, 
  existingTask, 
  initialBudgetCategoryId,
  allTasks, 
  budgetCategories: propBudgetCategories,
  onClose, 
  onSuccess 
}: TaskFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(propBudgetCategories || []);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Resizable state
  const [size, setSize] = useState({ width: 900, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [formData, setFormData] = useState<Partial<CreateTaskRequest> & { duration_days?: number, is_milestone?: boolean }>({
    task_name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: 'not_started',
    progress: 0,
    contractor_id: undefined,
    budget_category_id: initialBudgetCategoryId || null,
    predecessors: [],
    duration_days: 1,
    is_milestone: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Center modal on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: Math.max(0, window.innerWidth / 2 - 450),
        y: 100
      });
    }
  }, []);

  // Update local state if prop changes (e.g. if data loads after modal opens)
  useEffect(() => {
    if (propBudgetCategories) {
      setBudgetCategories(propBudgetCategories);
    }
  }, [propBudgetCategories]);

  useEffect(() => {
    if (existingTask) {
      let duration = existingTask.duration_days;
      if (!duration && existingTask.start_date && existingTask.end_date) {
        const start = new Date(existingTask.start_date);
        const end = new Date(existingTask.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      setFormData({
        task_name: existingTask.task_name,
        description: existingTask.description || '',
        start_date: existingTask.start_date,
        end_date: existingTask.end_date,
        status: existingTask.status,
        progress: existingTask.progress,
        contractor_id: existingTask.contractor_id,
        budget_category_id: existingTask.budget_category_id || null,
        predecessors: existingTask.dependencies || [],
        duration_days: duration || 1,
        is_milestone: existingTask.is_milestone || false
      });
    }
  }, [existingTask]);

  // Fetch contractors and budget categories (if not provided)
  useEffect(() => {
    const fetchData = async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      // Fetch Contractors
      const { data: contractorsData } = await supabase
        .from('contractors')
        .select('id, name')
        .order('name');
      if (contractorsData) setContractors(contractorsData);

      // Fetch Budget Categories ONLY if not provided via props
      if (!propBudgetCategories && projectId && token) {
        try {
          const res = await fetch(`/api/budgets?project_id=${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const result = await res.json();
            setBudgetCategories(result.budgets || []);
          }
        } catch (e) {
          console.error('Error fetching budget categories', e);
        }
      }
    };
    fetchData();
  }, [projectId, propBudgetCategories]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
        });
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(600, resizeStartRef.current.width + deltaX),
          height: Math.max(400, resizeStartRef.current.height + deltaY)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  // Resize Handler
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
  };

  const handleDurationChange = (days: number) => {
    if (days < 1 && !formData.is_milestone) return;
    
    setFormData(prev => {
      let newEndDate = prev.end_date;
      if (prev.start_date) {
        const start = new Date(prev.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + (days > 0 ? days - 1 : 0));
        newEndDate = end.toISOString().split('T')[0];
      }
      return { 
        ...prev, 
        duration_days: days,
        end_date: newEndDate
      };
    });
  };

  const handleStartDateChange = (date: string) => {
    setFormData(prev => {
      const updates: any = { start_date: date };
      // Keep duration constant if possible
      if (prev.duration_days && date) {
        const start = new Date(date);
        const end = new Date(start);
        end.setDate(start.getDate() + prev.duration_days - 1);
        updates.end_date = end.toISOString().split('T')[0];
      }
      return { ...prev, ...updates };
    });
  };

  const handleEndDateChange = (date: string) => {
    setFormData(prev => {
      const updates: any = { end_date: date };
      // Recalculate duration
      if (prev.start_date && date) {
        const start = new Date(prev.start_date);
        const end = new Date(date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updates.duration_days = diffDays;
      }
      return { ...prev, ...updates };
    });
  };

  const validateField = (name: string, value: any) => {
    if (name === 'task_name' && (!value || !value.toString().trim())) {
      return 'Task name is required';
    }
    if (name === 'start_date' && !value) {
      return 'Start date is required';
    }
    if (name === 'end_date' && !value) {
      return 'End date is required';
    }
    if (name === 'end_date' && value && formData.start_date && value < formData.start_date) {
      return 'End date cannot be before start date';
    }
    return '';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['task_name', 'start_date', 'end_date'];
    let hasErrors = false;

    fieldsToValidate.forEach(field => {
      const value = formData[field as keyof typeof formData];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      setTouched(fieldsToValidate.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
      return;
    }

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
        throw new Error(error.error || error.details || 'Failed to save task');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(`Failed to save task: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePredecessor = (taskId: string) => {
    const current = formData.predecessors || [];
    const exists = current.includes(taskId);
    const newPredecessors = exists
      ? current.filter(id => id !== taskId)
      : [...current, taskId];
    setFormData({ ...formData, predecessors: newPredecessors });
  };

  const availablePredecessors = allTasks.filter(t => t.id !== existingTask?.id);

  return (
    <div 
      ref={modalRef}
      style={{ 
        left: position.x, 
        top: position.y,
        width: size.width,
        height: size.height,
        transform: 'none'
      }}
      className="fixed bg-white rounded-lg shadow-2xl border border-border z-[2000] flex flex-col"
    >
      {/* Draggable Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center p-4 border-b bg-muted/30 rounded-t-lg cursor-move select-none"
      >
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Move className="w-4 h-4" />
          <h3>{existingTask ? `Edit Task: ${existingTask.task_name}` : 'New Task'}</h3>
        </div>
        <button 
          type="button"
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
          </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT COLUMN: Identity & Assignment */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-4">Task Details</h4>
            
          {projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Budget Category
                </div>
              </label>
              <select
                value={formData.budget_category_id || ''}
                onChange={e => setFormData({...formData, budget_category_id: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
              >
                <option value="">(None)</option>
                {budgetCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.category_name} (${c.revised_amount?.toLocaleString()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Links this task to a budget category for cash flow projections</p>
            </div>
          )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
              <input
                type="text"
                name="task_name"
                required
                value={formData.task_name}
                onChange={e => {
                  setFormData({...formData, task_name: e.target.value});
                  if (errors.task_name) setErrors({...errors, task_name: ''});
                }}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded focus:ring-2 transition-colors ${
                  errors.task_name && touched.task_name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary focus:ring-primary'
                }`}
                placeholder="e.g., Foundation Pour"
              />
              {errors.task_name && touched.task_name && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.task_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Add details about this task..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
              <select
                value={formData.contractor_id || ''}
                onChange={e => setFormData({...formData, contractor_id: e.target.value ? parseInt(e.target.value) : undefined})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_milestone"
                checked={formData.is_milestone}
                onChange={e => {
                  const isMilestone = e.target.checked;
                  setFormData({
                    ...formData,
                    is_milestone: isMilestone,
                    duration_days: isMilestone ? 0 : (formData.duration_days || 1)
                  });
                }}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
              />
              <label htmlFor="is_milestone" className="text-sm text-gray-700">
                This is a milestone (0 duration)
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: Scheduling & Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-4">Scheduling</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    name="start_date"
                    required
                    value={formData.start_date}
                    onChange={e => {
                      handleStartDateChange(e.target.value);
                      if (errors.start_date) setErrors({...errors, start_date: ''});
                    }}
                    onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 transition-colors ${
                      errors.start_date && touched.start_date
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {errors.start_date && touched.start_date && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.start_date}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration_days}
                  disabled={formData.is_milestone}
                  onChange={e => handleDurationChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={e => {
                    handleEndDateChange(e.target.value);
                    if (errors.end_date) setErrors({...errors, end_date: ''});
                  }}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 border rounded focus:ring-2 transition-colors bg-gray-50 ${
                    errors.end_date && touched.end_date
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary focus:ring-primary'
                  }`}
                />
                {errors.end_date && touched.end_date && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.end_date}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary"
              />
              </div>
            </div>
            </div>
          </div>

        {/* Bottom Section: Predecessors */}
        <div className="mt-8 pt-4 border-t">
          <h4 className="text-sm font-bold text-gray-900 mb-2">Predecessors (Dependencies)</h4>
          <div className="border rounded max-h-48 overflow-y-auto bg-gray-50">
            {availablePredecessors.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">No other tasks available</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {availablePredecessors.map(t => {
                  const isSelected = formData.predecessors?.includes(t.id);
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => togglePredecessor(t.id)}
                      className={`p-3 flex items-center gap-3 hover:bg-white cursor-pointer transition-colors ${isSelected ? 'bg-secondary hover:bg-secondary' : ''}`}
                    >
                      <div className={`flex-shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-gray-900'}`}>
                            {t.task_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {t.start_date} — {t.end_date}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Status: {t.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Select tasks that must be completed before this one starts.</p>
          </div>
      </form>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t rounded-b-lg relative">
            <button
              type="button"
              onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Task'}
            </button>
        
        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, var(--primary) 50%)',
            borderBottomRightRadius: '0.5rem'
          }}
          title="Drag to resize"
        />
      </div>
    </div>
  );
}
