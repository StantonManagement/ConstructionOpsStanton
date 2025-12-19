'use client';

import React, { useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import FrappeGanttChart, { FrappeTask, FrappeViewMode } from './FrappeGanttChart';
import type { ScheduleTask } from '@/types/schedule';

interface FrappeGanttWrapperProps {
  projectId: number;
  tasks: ScheduleTask[];
  loading?: boolean;
  error?: string | null;
  viewMode?: FrappeViewMode;
  onTaskClick?: (task: ScheduleTask) => void;
  onTaskUpdate?: (taskId: string, startDate: string, endDate: string) => Promise<void>;
  onProgressUpdate?: (taskId: string, progress: number) => Promise<void>;
  onRefresh?: () => void;
}

export default function FrappeGanttWrapper({
  projectId,
  tasks,
  loading = false,
  error = null,
  viewMode = 'Week',
  onTaskClick,
  onTaskUpdate,
  onProgressUpdate,
  onRefresh,
}: FrappeGanttWrapperProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  // Transform ScheduleTask[] to FrappeTask[]
  const frappeTasks: FrappeTask[] = tasks.map(task => {
    // Build custom classes for styling - replace spaces/underscores with hyphens
    const statusClass = task.status ? `status-${task.status.replace(/[\s_]/g, '-')}` : 'status-unknown';
    const classes: string[] = [statusClass];
    if (task.is_milestone) {
      classes.push('milestone');
    }
    if (task.budget_category_id) {
      classes.push('budget-linked');
    }

    return {
      id: task.id,
      name: task.task_name,
      start: task.start_date,
      end: task.end_date,
      progress: task.progress || 0,
      dependencies: task.dependencies?.join(', ') || '',
      custom_class: classes.join(' '),
    };
  });

  // Handle task click - find original task and pass to parent
  const handleTaskClick = useCallback((frappeTask: FrappeTask) => {
    const originalTask = tasks.find(t => t.id === frappeTask.id);
    if (originalTask && onTaskClick) {
      onTaskClick(originalTask);
    }
  }, [tasks, onTaskClick]);

  // Handle date change from drag
  const handleDateChange = useCallback(async (
    frappeTask: FrappeTask,
    start: Date,
    end: Date
  ) => {
    if (!onTaskUpdate) return;

    setUpdating(frappeTask.id);
    try {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      await onTaskUpdate(frappeTask.id, startStr, endStr);
    } catch (err) {
      console.error('Failed to update task dates:', err);
    } finally {
      setUpdating(null);
    }
  }, [onTaskUpdate, onRefresh]);

  // Handle progress change from drag
  const handleProgressChange = useCallback(async (
    frappeTask: FrappeTask,
    progress: number
  ) => {
    if (!onProgressUpdate) return;

    setUpdating(frappeTask.id);
    try {
      await onProgressUpdate(frappeTask.id, Math.round(progress));
    } catch (err) {
      console.error('Failed to update task progress:', err);
    } finally {
      setUpdating(null);
    }
  }, [onProgressUpdate, onRefresh]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-lg border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load schedule</h3>
        <p className="text-red-700">{error}</p>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {updating && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-gray-600">Updating schedule...</span>
          </div>
        </div>
      )}
      <FrappeGanttChart
        tasks={frappeTasks}
        viewMode={viewMode}
        onTaskClick={handleTaskClick}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
      />
    </div>
  );
}
