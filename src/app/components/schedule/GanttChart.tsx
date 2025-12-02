'use client';

import React, { useEffect, useRef } from 'react';
// @ts-ignore - frappe-gantt has no official types yet
import Gantt from 'frappe-gantt';

export interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string; // comma separated ids
  custom_class?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  viewMode?: 'Day' | 'Week' | 'Month';
  selectedTaskId?: string; // Added prop
  onTaskClick?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask, start: Date, end: Date) => void;
  onProgressChange?: (task: GanttTask, progress: number) => void;
}

export default function GanttChart({
  tasks,
  viewMode = 'Week',
  selectedTaskId, // Destructure
  onTaskClick,
  onDateChange,
  onProgressChange
}: GanttChartProps) {
  const ganttRef = useRef<Gantt | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // CSS is now loaded globally in globals.css
  }, []);

  // Selection Effect - Highlights the bar without re-rendering the whole chart
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous selection
    const previouslySelected = containerRef.current.querySelectorAll('.selected-task-highlight');
    previouslySelected.forEach(el => el.classList.remove('selected-task-highlight'));

    if (selectedTaskId) {
      // Frappe Gantt puts `data-id` on the group `.bar-wrapper`
      const taskGroup = containerRef.current.querySelector(`.bar-wrapper[data-id="${selectedTaskId}"]`);
      if (taskGroup) {
        taskGroup.classList.add('selected-task-highlight');
      }
    }
  }, [selectedTaskId, tasks]); // Run when selection changes or tasks re-render

  useEffect(() => {
    if (containerRef.current && tasks.length > 0) {
      // Clear previous instance content if re-rendering
      containerRef.current.innerHTML = '';

      // Sanitization step to ensure no invalid tokens reach the library
      // Replaces spaces with hyphens to avoid "contains HTML space characters" error
      // and ensure valid CSS class names
      const safeTasks = tasks.map(t => ({
        ...t,
        custom_class: t.custom_class?.trim().replace(/\s+/g, '-')
      }));

      console.log('Gantt safeTasks:', safeTasks);

      try {
        ganttRef.current = new Gantt(containerRef.current, safeTasks, {
          header_height: 50,
          column_width: 30,
          step: 24,
          view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
          bar_height: 20,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          view_mode: viewMode,
          date_format: 'YYYY-MM-DD',
          custom_popup_html: null,
          on_click: (task: any) => {
            if (onTaskClick) onTaskClick(task);
          },
          on_date_change: (task: any, start: Date, end: Date) => {
            if (onDateChange) onDateChange(task, start, end);
          },
          on_progress_change: (task: any, progress: number) => {
            if (onProgressChange) onProgressChange(task, progress);
          },
        });
      } catch (e) {
        console.error('Error initializing Gantt:', e);
      }
      
      // Apply selection after render if needed
      if (selectedTaskId) {
        setTimeout(() => {
           const taskGroup = containerRef.current?.querySelector(`.bar-wrapper[data-id="${selectedTaskId}"]`);
           if (taskGroup) taskGroup.classList.add('selected-task-highlight');
        }, 100);
      }
    }
  }, [tasks]); // Re-render when tasks change

  useEffect(() => {
    if (ganttRef.current) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border p-4">
      <div ref={containerRef} className="gantt-target" />
      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tasks to display. Add a task to get started.
        </div>
      )}
      
      {/* Custom Styles for Frappe Gantt override */}
      <style jsx global>{`
        .gantt .bar-label {
          fill: #4b5563;
          font-family: inherit;
          font-size: 12px;
        }
        .gantt .bar-progress {
          fill: #3b82f6;
        }
        
        /* Base Bar Style */
        .gantt .bar {
          fill: #bfdbfe;
        }
        
        /* Status Colors - Targeting .bar-wrapper because custom_class is applied there */
        .gantt .bar-wrapper[class*="milestone"] .bar {
          fill: #ef4444 !important;
        }
        .gantt .bar-wrapper[class*="status-completed"] .bar {
          fill: #22c55e !important;
        }
        .gantt .bar-wrapper[class*="status-delayed"] .bar {
          fill: #f97316 !important;
        }
        
        /* Fallback selectors in case custom_class is on .bar */
        .gantt .bar[class*="milestone"] {
          fill: #ef4444 !important;
        }
        .gantt .bar[class*="status-completed"] {
          fill: #22c55e !important;
        }
        .gantt .bar[class*="status-delayed"] {
          fill: #f97316 !important;
        }
        
        /* Budget Placeholder Style */
        .gantt .bar[class*="bar-budget-placeholder"],
        .gantt .bar-wrapper[class*="bar-budget-placeholder"] .bar {
          fill: #f3f4f6 !important; /* Gray 100 */
          stroke: #9ca3af !important; /* Gray 400 */
          stroke-dasharray: 4, 4 !important;
        }
        
        .gantt .bar-wrapper[class*="bar-budget-placeholder"] .bar-label {
          fill: #6b7280 !important; /* Gray 500 */
          font-style: italic;
        }
        
        /* Selection Highlight */
        .gantt .bar-wrapper.selected-task-highlight .bar {
          fill: #60a5fa !important; /* Darker blue */
          stroke: #2563eb !important; /* Blue-600 border */
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 3px rgba(37, 99, 235, 0.5));
        }
        
        .gantt-container {
          /* height: auto !important; - Removed to allow library to set height */
          max-height: 600px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
