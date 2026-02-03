'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import FrappeGanttWrapper from './FrappeGanttWrapper';
import GanttToolbar from './GanttToolbar';
import TaskFormModal from './TaskFormModal';
import { ProjectSchedule, ScheduleTask } from '@/types/schedule';
import type { FrappeViewMode } from './FrappeGanttChart';

// Updated to accept both number and string for Project.id type flexibility
interface ProjectScheduleTabProps {
  projectId: number | string;
}

interface BudgetCategory {
  id: number;
  category_name: string;
  original_amount: number;
  revised_amount: number;
  actual_spend: number;
  committed_costs: number;
  tasks: ScheduleTask[];
}

export default function ProjectScheduleTab({ projectId }: ProjectScheduleTabProps) {
  const numericProjectId = typeof projectId === 'string' ? Number(projectId) : projectId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ProjectSchedule | null>(null);
  
  // Data for Modal (Context)
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<ScheduleTask[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<FrappeViewMode>('Week');
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<number | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<ScheduleTask | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // 1. Fetch Schedule & Budget Data
      const scheduleResponse = await fetch(`/api/projects/${numericProjectId}/schedule-with-budget`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule data');
      }

      const scheduleResult = await scheduleResponse.json();

      if (scheduleResult.data) {
        setSchedule(scheduleResult.data.schedule);
        setBudgetCategories(scheduleResult.data.budgetCategories || []);
        setUnassignedTasks(scheduleResult.data.unassignedTasks || []);
      }

    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [numericProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combine tasks from all sources
  const allRealTasks = [
    ...unassignedTasks,
    ...budgetCategories.flatMap(c => c.tasks || [])
  ];

  // Generate virtual tasks for budget categories with remaining budget but no tasks
  const virtualTasks: ScheduleTask[] = [];
  if (schedule && budgetCategories.length > 0) {
    budgetCategories.forEach(cat => {
      // Check if this category has no tasks
      if (!cat.tasks || cat.tasks.length === 0) {
        // Check if it has remaining budget
        const original = Number(cat.original_amount) || 0;
        const revised = Number(cat.revised_amount) || 0;
        const budget = revised > 0 ? revised : original;
        
        const actual = Number(cat.actual_spend) || 0;
        const remaining = budget - actual;

        if (remaining > 0) {
          const startDate = schedule.start_date || new Date().toISOString().split('T')[0];
          // End date: 1 day later
          const endDate = new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0];

          // Create a pseudo-ScheduleTask
          virtualTasks.push({
            id: `budget-${cat.id}`,
            schedule_id: schedule.id,
            task_name: `${cat.category_name} (Unscheduled)`,
            start_date: startDate,
            end_date: endDate,
            duration_days: 1,
            progress: 0,
            status: 'not_started',
            sort_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            budget_category_id: cat.id,
            dependencies: []
          });
        }
      }
    });
  }

  const displayTasks = [...allRealTasks, ...virtualTasks];

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRefresh = useMemo(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, 200);
    };
  }, [fetchData]);

  // --- Handlers ---

  // Handler for date changes from Frappe Gantt drag
  const handleTaskDateUpdate = async (taskId: string, startDate: string, endDate: string) => {
    // Check if it's a virtual budget task
    if (taskId.startsWith('budget-')) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      await fetch(`/api/schedules/tasks/${taskId}/update-dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate
        })
      });

      requestRefresh();
    } catch (error) {
      console.error('Error updating task dates:', error);
      requestRefresh();
    }
  };

  // Handler for progress changes from Frappe Gantt drag
  const handleTaskProgressUpdate = async (taskId: string, progress: number) => {
    if (taskId.startsWith('budget-')) return;

    try {
      await supabase
        .from('schedule_tasks')
        .update({ progress })
        .eq('id', taskId);

      requestRefresh();
    } catch (error) {
      console.error('Error updating task progress:', error);
      requestRefresh();
    }
  };

  // Handler for task click from Frappe Gantt
  const handleTaskClick = (task: ScheduleTask) => {
    // Check if it's a virtual budget task
    if (task.id.startsWith('budget-')) {
      const budgetId = parseInt(task.id.replace('budget-', ''));
      if (!isNaN(budgetId)) {
        handleAddTask(budgetId);
        return;
      }
    }

    setSelectedTaskForEdit(task);
    setShowTaskModal(true);
  };

  const handleAddTask = (budgetCategoryId?: number | null) => {
    setSelectedCategoryForAdd(budgetCategoryId ?? null); 
    setSelectedTaskForEdit(undefined);
    setShowTaskModal(true);
  };

  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startDate = new Date();
      const targetEndDate = new Date();
      targetEndDate.setDate(startDate.getDate() + 90); // Default to 90 days

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: numericProjectId,
          start_date: startDate.toISOString().split('T')[0],
          target_end_date: targetEndDate.toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }

      fetchData();
    } catch (err: any) {
      console.error('Error creating schedule:', err);
      setError(err.message || 'Failed to create schedule');
      setLoading(false);
    }
  };

  const handleAutoSchedule = async () => {
    if (!confirm('This will auto-schedule all unscheduled tasks sequentially based on project defaults. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/projects/${numericProjectId}/auto-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to auto-schedule tasks');
      }
      
      fetchData();
    } catch (err: any) {
      console.error('Auto-schedule error:', err);
      alert('Failed to auto-schedule: ' + err.message);
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load schedule</h3>
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!schedule) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Found</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          This project doesn't have a schedule yet. Initialize one to start tracking tasks and dependencies.
        </p>
        <button 
          onClick={handleCreateSchedule}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90"
        >
          Initialize Schedule
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <GanttToolbar
        isMobile={isMobile}
        viewMode={viewMode}
        onToggleView={setIsMobile}
        onViewModeChange={(mode) => setViewMode(mode as FrappeViewMode)}
        onAddTask={() => handleAddTask(null)}
        onAutoSchedule={handleAutoSchedule}
        onClearProject={() => {}} 
      />

      {/* Main Chart Area */}
      {isMobile ? (
        <div className="p-4 text-center text-gray-500">
          Mobile List View is available in the main schedule dashboard.
        </div>
      ) : (
        <FrappeGanttWrapper
          projectId={numericProjectId}
          tasks={displayTasks}
          loading={loading}
          error={error}
          viewMode={viewMode}
          onTaskClick={handleTaskClick}
          onTaskUpdate={handleTaskDateUpdate}
          onProgressUpdate={handleTaskProgressUpdate}
          onRefresh={fetchData}
        />
      )}

      {/* Task Creation/Edit Modal */}
      {showTaskModal && schedule && (
        <TaskFormModal
          scheduleId={schedule.id}
          projectId={numericProjectId}
          allTasks={allRealTasks}
          existingTask={selectedTaskForEdit}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskForEdit(undefined);
          }}
          onSuccess={fetchData}
          initialBudgetCategoryId={selectedCategoryForAdd}
          budgetCategories={budgetCategories}
        />
      )}
    </div>
  );
}
