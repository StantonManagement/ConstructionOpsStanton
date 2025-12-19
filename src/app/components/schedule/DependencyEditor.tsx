'use client';

import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import type { ScheduleTask, DependencyType } from '@/types/schedule';

interface Dependency {
  id: string;
  source_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  predecessor?: {
    id: string;
    task_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
}

interface DependencyEditorProps {
  taskId: string;
  scheduleId: string;
  currentDependencies: Dependency[];
  availableTasks: ScheduleTask[];
  onAddDependency: (predecessorId: string, type: DependencyType, lagDays: number) => Promise<void>;
  onRemoveDependency: (dependencyId: string) => Promise<void>;
  onUpdateDependency: (dependencyId: string, type: DependencyType, lagDays: number) => Promise<void>;
  disabled?: boolean;
}

const DEPENDENCY_TYPES: { value: DependencyType; label: string; description: string }[] = [
  { value: 'finish_to_start', label: 'FS', description: 'Finish to Start - Task starts when predecessor finishes' },
  { value: 'start_to_start', label: 'SS', description: 'Start to Start - Task starts when predecessor starts' },
  { value: 'finish_to_finish', label: 'FF', description: 'Finish to Finish - Task finishes when predecessor finishes' },
  { value: 'start_to_finish', label: 'SF', description: 'Start to Finish - Task finishes when predecessor starts' },
];

export default function DependencyEditor({
  taskId,
  scheduleId,
  currentDependencies,
  availableTasks,
  onAddDependency,
  onRemoveDependency,
  onUpdateDependency,
  disabled = false,
}: DependencyEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPredecessorId, setNewPredecessorId] = useState('');
  const [newType, setNewType] = useState<DependencyType>('finish_to_start');
  const [newLagDays, setNewLagDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter out tasks that are already predecessors or the current task itself
  const existingPredecessorIds = new Set(currentDependencies.map(d => d.source_task_id));
  const selectableTasks = availableTasks.filter(
    t => t.id !== taskId && !existingPredecessorIds.has(t.id)
  );

  const handleAdd = async () => {
    if (!newPredecessorId) {
      setError('Please select a predecessor task');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAddDependency(newPredecessorId, newType, newLagDays);
      // Reset form
      setNewPredecessorId('');
      setNewType('finish_to_start');
      setNewLagDays(0);
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (dependencyId: string) => {
    setLoading(true);
    setError(null);

    try {
      await onRemoveDependency(dependencyId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (dependencyId: string, newDependencyType: DependencyType, currentLag: number) => {
    setLoading(true);
    setError(null);

    try {
      await onUpdateDependency(dependencyId, newDependencyType, currentLag);
    } catch (err: any) {
      setError(err.message || 'Failed to update dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleLagChange = async (dependencyId: string, currentType: DependencyType, newLag: number) => {
    setLoading(true);
    setError(null);

    try {
      await onUpdateDependency(dependencyId, currentType, newLag);
    } catch (err: any) {
      setError(err.message || 'Failed to update dependency');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: DependencyType) => {
    return DEPENDENCY_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Dependencies (Predecessors)</h4>
        {!isAdding && selectableTasks.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled || loading}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Dependencies List */}
      {currentDependencies.length > 0 ? (
        <div className="border rounded-lg divide-y bg-white">
          {currentDependencies.map(dep => (
            <div key={dep.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {dep.predecessor?.task_name || 'Unknown Task'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500">This Task</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {dep.predecessor?.start_date} — {dep.predecessor?.end_date}
                </div>
              </div>

              {/* Type Selector */}
              <select
                value={dep.dependency_type}
                onChange={(e) => handleTypeChange(dep.id, e.target.value as DependencyType, dep.lag_days)}
                disabled={disabled || loading}
                className="text-xs border rounded px-2 py-1 bg-gray-50 disabled:opacity-50"
                title="Dependency Type"
              >
                {DEPENDENCY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {/* Lag Days Input */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dep.lag_days}
                  onChange={(e) => handleLagChange(dep.id, dep.dependency_type, parseInt(e.target.value) || 0)}
                  disabled={disabled || loading}
                  className="w-14 text-xs border rounded px-2 py-1 text-center disabled:opacity-50"
                  title="Lag Days (positive = delay, negative = overlap)"
                />
                <span className="text-xs text-gray-500">days</span>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemove(dep.id)}
                disabled={disabled || loading}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                title="Remove dependency"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed">
          No dependencies. This task can start anytime.
        </div>
      )}

      {/* Add New Dependency Form */}
      {isAdding && (
        <div className="border rounded-lg p-3 bg-blue-50 space-y-3">
          <div className="text-sm font-medium text-gray-700">Add Predecessor</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Task Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Predecessor Task</label>
              <select
                value={newPredecessorId}
                onChange={(e) => setNewPredecessorId(e.target.value)}
                disabled={loading}
                className="w-full text-sm border rounded px-3 py-2 bg-white disabled:opacity-50"
              >
                <option value="">Select a task...</option>
                {selectableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.task_name} ({task.start_date} — {task.end_date})
                  </option>
                ))}
              </select>
            </div>

            {/* Type Selector */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as DependencyType)}
                disabled={loading}
                className="w-full text-sm border rounded px-3 py-2 bg-white disabled:opacity-50"
              >
                {DEPENDENCY_TYPES.map(t => (
                  <option key={t.value} value={t.value} title={t.description}>
                    {t.label} - {t.description.split(' - ')[1]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lag Days */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Lag:</label>
            <input
              type="number"
              value={newLagDays}
              onChange={(e) => setNewLagDays(parseInt(e.target.value) || 0)}
              disabled={loading}
              className="w-20 text-sm border rounded px-2 py-1 text-center disabled:opacity-50"
            />
            <span className="text-xs text-gray-500">days (positive = delay, negative = overlap)</span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewPredecessorId('');
                setNewType('finish_to_start');
                setNewLagDays(0);
                setError(null);
              }}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !newPredecessorId}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Dependency'}
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Dependencies determine task order. A task with predecessors will automatically reschedule when its predecessors change.
      </p>
    </div>
  );
}
