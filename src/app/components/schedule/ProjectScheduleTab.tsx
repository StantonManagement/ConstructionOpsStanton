'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
// replaced SwimLaneGantt with GanttChart and GanttToolbar
import GanttChart, { GanttTask } from './GanttChart';
import GanttToolbar from './GanttToolbar';
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
  
  // Data for Modal (Context)
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<ScheduleTask[]>([]);
  
  // Data for Gantt Chart
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
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

      // 1. Fetch Schedule & Budget Data (for Modal context)
      const scheduleResponse = await fetch(`/api/projects/${projectId}/schedule-with-budget`, {
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

      // 2. Fetch Gantt Data (formatted for frappe-gantt with dependencies)
      const ganttResponse = await fetch(`/api/projects/${projectId}/gantt`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (ganttResponse.ok) {
        const ganttResult = await ganttResponse.json();
        if (ganttResult.data && ganttResult.data.tasks) {
          setGanttTasks(ganttResult.data.tasks);
        }
      } else {
        console.error('Failed to fetch Gantt specific data');
        // Fallback could be implemented here if needed, but usually indicates API issue
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

  // --- Gantt Chart Handlers ---

  const handleGanttTaskClick = (task: GanttTask) => {
    setSelectedTaskId(task.id);
    // Find the full ScheduleTask object to open the modal
    const allTasks = [
      ...unassignedTasks,
      ...budgetCategories.flatMap(c => c.tasks)
    ];
    const fullTask = allTasks.find(t => t.id === task.id);
    
    if (fullTask) {
      setSelectedTaskForEdit(fullTask);
      setShowTaskModal(true);
    }
  };

  const handleGanttDateChange = async (task: GanttTask, start: Date, end: Date) => {
    // Optimistic update for Gantt view
    const newGanttTasks = ganttTasks.map(t => 
      t.id === task.id ? { ...t, start: start.toISOString(), end: end.toISOString() } : t
    );
    setGanttTasks(newGanttTasks);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session) return;

      // Call update endpoint (which handles cascade)
      const res = await fetch(`/api/schedules/tasks/${task.id}/update-dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`
        },
        body: JSON.stringify({
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        console.error('Failed to update task dates');
        fetchData(); // Revert
      } else {
        // If cascade happened, we need to refresh to see changes in other tasks
        // A lightweight way would be to just fetch gantt data again
        const ganttResponse = await fetch(`/api/projects/${projectId}/gantt`, {
            headers: { 'Authorization': `Bearer ${session.session?.access_token}` }
        });
        if (ganttResponse.ok) {
            const res = await ganttResponse.json();
            setGanttTasks(res.data.tasks);
        }
      }
    } catch (error) {
      console.error('Error updating task dates:', error);
      fetchData();
    }
  };

  const handleGanttProgressChange = async (task: GanttTask, progress: number) => {
    // Optimistic update
    const newGanttTasks = ganttTasks.map(t => 
        t.id === task.id ? { ...t, progress } : t
    );
    setGanttTasks(newGanttTasks);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('schedule_tasks')
        .update({ progress })
        .eq('id', task.id);
        
    } catch (e) {
      console.error('Failed to update task progress', e);
      fetchData(); // Revert
    }
  };

  // --- Modal Handlers ---

  const handleAddTask = () => {
    setSelectedCategoryForAdd(null); // or default
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
          project_id: projectId,
          start_date: startDate.toISOString().split('T')[0],
          target_end_date: targetEndDate.toISOString().split('T')[0]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }

      // Refresh data to show the new schedule
      fetchData();
    } catch (err: any) {
      console.error('Error creating schedule:', err);
      setError(err.message || 'Failed to create schedule');
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

  // Collect all tasks for the modal context
  const allTasks = [
    ...unassignedTasks,
    ...budgetCategories.flatMap(c => c.tasks)
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <GanttToolbar
        isMobile={isMobile}
        setIsMobile={setIsMobile}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onAddTask={handleAddTask}
        showBackToProjects={false} // Embedded view, no back button needed
      />

      {/* Main Chart Area */}
      {isMobile ? (
        <div className="p-4 text-center text-gray-500">
          Mobile List View is available in the main schedule dashboard.
          {/* Or implement MobileTaskTimeline here if reused */}
        </div>
      ) : (
        <GanttChart
          tasks={ganttTasks}
          viewMode={viewMode}
          selectedTaskId={selectedTaskId}
          onTaskClick={handleGanttTaskClick}
          onDateChange={handleGanttDateChange}
          onProgressChange={handleGanttProgressChange}
        />
      )}

      {/* Task Creation/Edit Modal */}
      {showTaskModal && schedule && (
        <TaskFormModal
          scheduleId={schedule.id}
          projectId={projectId}
          allTasks={allTasks}
          existingTask={selectedTaskForEdit}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskForEdit(undefined);
            setSelectedTaskId(undefined);
          }}
          onSuccess={fetchData}
          initialBudgetCategoryId={selectedCategoryForAdd}
        />
      )}
    </div>
  );
}
