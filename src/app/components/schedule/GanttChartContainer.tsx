'use client';

import React from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import type { ScheduleTask } from '@/types/schedule';

interface GanttChartContainerProps {
  tasks: ScheduleTask[];
  budgetCategories?: any[];
  onUpdate?: (task: Task) => void; // For date/progress changes
  onEdit?: (task: Task) => void;   // For opening modal (double click)
  onDelete?: (task: Task) => void;
  viewMode: ViewMode;
  onExpanderClick?: (task: Task) => void;
}

export default function GanttChartContainer({
  tasks,
  budgetCategories = [],
  onUpdate,
  onEdit,
  onDelete,
  onExpanderClick,
  viewMode
}: GanttChartContainerProps) {
  
  // Convert ScheduleTask to Gantt Task
  const ganttTasks: Task[] = tasks.map(t => {
    const isBudgetLinked = !!t.budget_category_id;
    const isMilestone = !!t.is_milestone;
    const isOverdue = new Date(t.end_date) < new Date() && (t.progress || 0) < 100;
    
    // Determine colors based on status
    let progressColor = '#3B82F6'; // Default blue
    let progressSelectedColor = '#2563EB';
    let backgroundColor = undefined;
    
    if (isOverdue) {
      progressColor = '#DC2626'; // Red for overdue
      progressSelectedColor = '#B91C1C';
      backgroundColor = '#FEE2E2'; // Light red background
    } else if (isBudgetLinked) {
      progressColor = '#059669'; // Green for budget linked
      progressSelectedColor = '#047857';
      backgroundColor = '#D1FAE5'; // Light green background
    }
    
    return {
      start: new Date(t.start_date),
      end: new Date(t.end_date),
      name: t.task_name + (isBudgetLinked ? ' 💲' : '') + (isOverdue ? ' ⚠️' : ''),
      id: t.id,
      type: isMilestone ? 'milestone' : 'task',
      progress: t.progress || 0,
      isDisabled: false,
      styles: { 
        progressColor,
        progressSelectedColor,
        backgroundColor
      },
      dependencies: t.dependencies,
      project: t.parent_task_id
    };
  });

  const CustomTooltip = ({ task, fontSize, fontFamily }: { task: Task; fontSize: string; fontFamily: string }) => {
    const originalTask = tasks.find(t => t.id === task.id);
    const categoryId = originalTask?.budget_category_id;
    const category = categoryId ? budgetCategories.find(c => c.id === categoryId) : null;
    const isOverdue = new Date(originalTask?.end_date || task.end) < new Date() && task.progress < 100;
    const isMilestone = originalTask?.is_milestone;
    
    // Calculate duration
    const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
      <div className="bg-white p-4 shadow-lg rounded border border-gray-200 z-50 text-sm max-w-xs">
        <div className="font-bold mb-1 flex items-center gap-2">
          {isMilestone && <span className="text-purple-600">◆</span>}
          {originalTask?.task_name}
          {isOverdue && <span className="text-red-600">⚠️</span>}
        </div>
        
        <div className="text-gray-600 mb-2">
          {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
        </div>
        
        <div className="space-y-1 mb-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Duration:</span>
            <b>{isMilestone ? 'Milestone' : `${duration} day${duration !== 1 ? 's' : ''}`}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Progress:</span>
            <b className={task.progress === 100 ? 'text-green-600' : ''}>{task.progress}%</b>
          </div>
          {originalTask?.status && (
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <b className="capitalize">{originalTask.status.replace(/_/g, ' ')}</b>
            </div>
          )}
        </div>
        
        {isOverdue && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            <b>⚠️ Overdue:</b> Task is past due date
          </div>
        )}
        
        {category && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-green-700 font-medium">
              <span>💲 Linked to Budget:</span>
            </div>
            <div className="text-gray-800">{category.category_name}</div>
            <div className="text-xs text-gray-500">
              Budget: ${category.revised_amount?.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Debug logging
  console.log('[GanttChartContainer] Rendering with:', {
    taskCount: ganttTasks.length,
    viewMode,
    tasks: ganttTasks.slice(0, 3) // First 3 tasks for debugging
  });

  // Handle empty state
  if (ganttTasks.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 border rounded-lg">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No tasks scheduled</p>
          <p className="text-sm">Add a task to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-white rounded-lg border shadow-sm">
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        onDateChange={onUpdate}
        onProgressChange={onUpdate}
        onDoubleClick={onEdit}
        onDelete={onDelete}
        onExpanderClick={onExpanderClick}
        TooltipContent={CustomTooltip}
        listCellWidth="200px"
        columnWidth={
          viewMode === ViewMode.Year ? 350 :
          viewMode === ViewMode.Month ? 300 :
          viewMode === ViewMode.Week ? 100 : 65
        }
        barFill={60}
        ganttHeight={500}
      />
    </div>
  );
}
