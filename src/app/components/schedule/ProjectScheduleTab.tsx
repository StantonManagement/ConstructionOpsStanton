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
  actual_spend: number; // Added field
  committed_costs: number; // Added field
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
      let currentSchedule = null;
      let categories: BudgetCategory[] = [];
      
      if (scheduleResult.data) {
        currentSchedule = scheduleResult.data.schedule;
        setSchedule(currentSchedule);
        categories = scheduleResult.data.budgetCategories || [];
        setBudgetCategories(categories);
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
          let loadedTasks: GanttTask[] = ganttResult.data.tasks;

          // 3. Inject virtual tasks for empty budget categories WITH REMAINING BUDGET
          if (currentSchedule && categories.length > 0) {
            const virtualTasks: GanttTask[] = [];
            
            categories.forEach(cat => {
              // Check if this category has no tasks
              if (!cat.tasks || cat.tasks.length === 0) {
                // Check if it has remaining budget (revised - actual > 0)
                // Use original_amount if revised_amount is 0 (assuming initial state)
                const original = Number(cat.original_amount) || 0;
                const revised = Number(cat.revised_amount) || 0;
                const budget = revised > 0 ? revised : original;
                
                const actual = Number(cat.actual_spend) || 0;
                const remaining = budget - actual;

                if (remaining > 0) {
                   // Create a virtual task
                  // Start date: Project start or today
                  const startDate = (currentSchedule as ProjectSchedule).start_date || new Date().toISOString().split('T')[0];
                  // End date: 1 day later
                  const endDate = new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0];

                  virtualTasks.push({
                    id: `budget-${cat.id}`,
                    name: `${cat.category_name} (Unscheduled)`,
                    start: startDate,
                    end: endDate,
                    progress: 0,
                    dependencies: '',
                    custom_class: 'bar-budget-placeholder'
                  });
                }
              }
            });

            // Combine real tasks and virtual tasks
            loadedTasks = [...loadedTasks, ...virtualTasks];
          }
          
          setGanttTasks(loadedTasks);
        }
      } else {
        console.error('Failed to fetch Gantt specific data');
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

    // Check if it's a virtual budget task
    if (task.id.startsWith('budget-')) {
      const budgetId = parseInt(task.id.replace('budget-', ''));
      if (!isNaN(budgetId)) {
        // Open Add Task modal with this category pre-selected
        handleAddTask(budgetId);
        return;
      }
    }

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
    // Ignore virtual tasks for date changes
    if (task.id.startsWith('budget-')) return;

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
        const ganttResponse = await fetch(`/api/projects/${projectId}/gantt`, {
            headers: { 'Authorization': `Bearer ${session.session?.access_token}` }
        });
        if (ganttResponse.ok) {
            const res = await ganttResponse.json();
            // We need to re-inject virtual tasks here too, ideally we extract the injection logic
            fetchData(); 
        }
      }
    } catch (error) {
      console.error('Error updating task dates:', error);
      fetchData();
    }
  };

  const handleGanttProgressChange = async (task: GanttTask, progress: number) => {
    if (task.id.startsWith('budget-')) return;

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
        viewMode={viewMode}
        onToggleView={setIsMobile}
        onViewModeChange={setViewMode}
        onAddTask={() => handleAddTask(null)}
        onClearProject={() => {}} 
        // projectId is not passed to avoid showing back button
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
          budgetCategories={budgetCategories} // Correctly passing the prop
        />
      )}
    </div>
  );
}
