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
  const ganttTasks: Task[] = tasks
    .filter(t => t.start_date && t.end_date) // Only show tasks with dates
    .map(t => {
      const isBudgetLinked = !!t.budget_category_id;
      
      // Ensure valid date objects
      const startDate = new Date(t.start_date);
      const endDate = new Date(t.end_date);
      
      // Fix invalid dates if they happen to pass through
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return null;
      }

      // Ensure end date is after start date (library crashes otherwise)
      if (endDate < startDate) {
          endDate.setDate(startDate.getDate() + 1);
      }

      return {
        start: startDate,
        end: endDate,
        name: t.task_name + (isBudgetLinked ? ' 💲' : ''), // Visual indicator
        id: t.id,
        type: 'task', // Simple logic
        progress: t.progress || 0,
        isDisabled: false,
        styles: { 
          progressColor: isBudgetLinked ? '#059669' : '#3B82F6', // Green for budget linked
          progressSelectedColor: isBudgetLinked ? '#047857' : '#2563EB',
          backgroundColor: isBudgetLinked ? '#D1FAE5' : undefined
        },
        dependencies: t.dependencies || [],
        project: t.parent_task_id
      };
    })
    .filter((t): t is Task => t !== null); // Filter out nulls

  const CustomTooltip = ({ task, fontSize, fontFamily }: { task: Task; fontSize: string; fontFamily: string }) => {
    const originalTask = tasks.find(t => t.id === task.id);
    const categoryId = originalTask?.budget_category_id;
    const category = categoryId ? budgetCategories.find(c => c.id === categoryId) : null;

    return (
      <div className="bg-white p-4 shadow-lg rounded border border-gray-200 z-50 text-sm max-w-xs">
        <div className="font-bold mb-1">{originalTask?.task_name}</div>
        <div className="text-gray-600 mb-2">
          {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
        </div>
        <div className="mb-1">
          Progress: <b>{task.progress}%</b>
        </div>
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
        listCellWidth="155px"
        columnWidth={viewMode === ViewMode.Month ? 300 : 65}
        barFill={60}
        ganttHeight={500}
      />
    </div>
  );
}
