'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import Link from 'next/link';
import SwimLaneGantt from './SwimLaneGantt';
import TaskFormModal from './TaskFormModal';
import { ProjectSchedule, ScheduleTask } from '@/types/schedule';

interface ProjectScheduleTabProps {
  projectId: number;
}

interface BudgetCategory {
  id: number;
  category_name: string;
  original_amount: number;
  revised_amount: number;
  tasks: ScheduleTask[];
}

export default function ProjectScheduleTab({ projectId }: ProjectScheduleTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ProjectSchedule | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<ScheduleTask[]>([]);
  
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
        // If no session, maybe just show empty or return
        // throw new Error('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/schedule-with-budget`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule data');
      }

      const result = await response.json();
      
      if (result.data) {
        setSchedule(result.data.schedule);
        setBudgetCategories(result.data.budgetCategories || []);
        setUnassignedTasks(result.data.unassignedTasks || []);
      }
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTaskAssign = async (taskId: string, budgetCategoryId: number | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Optimistic update
      // Find where the task is currently
      let taskToMove: ScheduleTask | undefined;
      let fromCategory: number | null = null; // null means unassigned

      // Check unassigned first
      const unassignedIndex = unassignedTasks.findIndex(t => t.id === taskId);
      if (unassignedIndex !== -1) {
        taskToMove = unassignedTasks[unassignedIndex];
        fromCategory = null;
      } else {
        // Check budget categories
        for (const cat of budgetCategories) {
          const idx = cat.tasks.findIndex(t => t.id === taskId);
          if (idx !== -1) {
            taskToMove = cat.tasks[idx];
            fromCategory = cat.id;
            break;
          }
        }
      }

      if (!taskToMove) return; // Task not found

      // Don't do anything if not moving
      if (fromCategory === budgetCategoryId) return;

      const updatedTask = { ...taskToMove, budget_category_id: budgetCategoryId };

      // Update state
      if (fromCategory === null) {
        setUnassignedTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setBudgetCategories(prev => prev.map(cat => 
          cat.id === fromCategory 
            ? { ...cat, tasks: cat.tasks.filter(t => t.id !== taskId) }
            : cat
        ));
      }

      if (budgetCategoryId === null) {
        setUnassignedTasks(prev => [...prev, updatedTask]);
      } else {
        setBudgetCategories(prev => prev.map(cat => 
          cat.id === budgetCategoryId 
            ? { ...cat, tasks: [...cat.tasks, updatedTask] }
            : cat
        ));
      }

      // API Call
      const res = await fetch(`/api/schedules/tasks/${taskId}/assign-budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ budget_category_id: budgetCategoryId })
      });

      if (!res.ok) {
        // Revert on error (could implement full revert logic here, fetching data again is simpler for now)
        console.error('Failed to assign task');
        fetchData();
      }

    } catch (error) {
      console.error('Error assigning task:', error);
      fetchData(); // Revert
    }
  };

  const handleUpdateTask = async (task: ScheduleTask) => {
    // Optimistic update
    // Find where the task is currently
    let fromCategory: number | null = null;
    
    const unassignedIndex = unassignedTasks.findIndex(t => t.id === task.id);
    if (unassignedIndex !== -1) {
      fromCategory = null;
    } else {
      for (const cat of budgetCategories) {
        if (cat.tasks.some(t => t.id === task.id)) {
          fromCategory = cat.id;
          break;
        }
      }
    }

    // Update state
    if (fromCategory === null) {
      setUnassignedTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } else {
      setBudgetCategories(prev => prev.map(cat => 
        cat.id === fromCategory 
          ? { ...cat, tasks: cat.tasks.map(t => t.id === task.id ? task : t) }
          : cat
      ));
    }

    // API Call to save dates
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/schedules/tasks/${task.id}/update-dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          start_date: task.start_date,
          end_date: task.end_date
        })
      });

      if (!res.ok) {
        console.error('Failed to update task dates');
        fetchData(); // Revert
      }
    } catch (error) {
      console.error('Error updating task dates:', error);
      fetchData();
    }
  };

  const handleAddTask = (budgetCategoryId: number | null) => {
    setSelectedCategoryForAdd(budgetCategoryId);
    setSelectedTaskForEdit(undefined);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: ScheduleTask) => {
    setSelectedTaskForEdit(task);
    setShowTaskModal(true);
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

  // Empty state: No budget categories
  if (budgetCategories.length === 0 && unassignedTasks.length === 0 && !schedule) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Found</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          This project doesn't have a schedule yet. Go to the main Schedule view to create one.
        </p>
        <Link 
          href="/schedule" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90"
        >
          Go to Schedule View
        </Link>
      </div>
    );
  }

  // Collect all tasks for the modal
  const allTasks = [
    ...unassignedTasks,
    ...budgetCategories.flatMap(c => c.tasks)
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project Schedule</h2>
          <p className="text-sm text-gray-500">
            Link tasks to budget categories to track progress against spend.
          </p>
        </div>
        <Link 
          href={`/schedule?project=${projectId}`}
          className="flex items-center gap-2 text-sm font-medium text-[var(--link)] hover:underline"
        >
          Open Full View
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {budgetCategories.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No Budget Categories</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You need to create budget categories before you can link schedule tasks.
                Go to the <strong>Budget</strong> tab to set them up.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <SwimLaneGantt 
          schedule={schedule} 
          budgetCategories={budgetCategories} 
          unassignedTasks={unassignedTasks}
          onAssignTask={handleTaskAssign}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {/* Task Creation Modal */}
      {showTaskModal && schedule && (
        <TaskFormModal
          scheduleId={schedule.id}
          projectId={projectId}
          allTasks={allTasks}
          existingTask={selectedTaskForEdit}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskForEdit(undefined);
          }}
          onSuccess={fetchData}
          initialBudgetCategoryId={selectedCategoryForAdd}
        />
      )}
    </div>
  );
}
