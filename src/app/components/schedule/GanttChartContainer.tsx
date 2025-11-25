'use client';

import React from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import type { ScheduleTask } from '@/types/schedule';

interface GanttChartContainerProps {
  tasks: ScheduleTask[];
  onUpdate?: (task: Task) => void; // For date/progress changes
  onEdit?: (task: Task) => void;   // For opening modal (double click)
  onDelete?: (task: Task) => void;
  viewMode: ViewMode;
  onExpanderClick?: (task: Task) => void;
}

export default function GanttChartContainer({
  tasks,
  onUpdate,
  onEdit,
  onDelete,
  onExpanderClick,
  viewMode
}: GanttChartContainerProps) {
  
  // Convert ScheduleTask to Gantt Task
  const ganttTasks: Task[] = tasks.map(t => ({
    start: new Date(t.start_date),
    end: new Date(t.end_date),
    name: t.task_name,
    id: t.id,
    type: 'task', // Simple logic
    progress: t.progress,
    isDisabled: false,
    styles: { progressColor: '#3B82F6', progressSelectedColor: '#2563EB' },
    dependencies: t.dependencies,
    project: t.parent_task_id
  }));

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
        listCellWidth="155px"
        columnWidth={viewMode === ViewMode.Month ? 300 : 65}
        barFill={60}
        ganttHeight={500}
      />
    </div>
  );
}
