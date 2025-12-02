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

  // Sanitize tasks helper
  const getSafeTasks = (taskList: GanttTask[]) => {
    return taskList.map(t => ({
      ...t,
      custom_class: t.custom_class?.trim().replace(/\s+/g, '-')
    }));
  };

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
      const safeTasks = getSafeTasks(tasks);

      if (ganttRef.current) {
        // Update existing instance
        ganttRef.current.refresh(safeTasks);
      } else {
        // Create new instance
        // Clear previous instance content if any
        containerRef.current.innerHTML = '';
        
        try {
          ganttRef.current = new Gantt(containerRef.current, safeTasks, {
            header_height: 60, // Increased for better spacing
            column_width: 30,
            step: 24,
            view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
            bar_height: 24, // Slightly taller bars
            bar_corner_radius: 4, // More rounded
            arrow_curve: 5,
            padding: 20,
            view_mode: viewMode,
            date_format: 'YYYY-MM-DD',
            custom_popup_html: (task: any) => {
              // Custom tooltip
              return `
                <div class="p-3 rounded shadow-lg bg-white border border-gray-200 text-sm min-w-[200px] z-50">
                  <div class="font-bold text-gray-800 mb-1">${task.name}</div>
                  <div class="text-gray-600 text-xs mb-2">
                    ${task.start} - ${task.end}
                  </div>
                  <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Progress: ${task.progress}%</span>
                  </div>
                </div>
              `;
            },
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
      }
      
      // Apply selection after render if needed
      if (selectedTaskId) {
        setTimeout(() => {
           const taskGroup = containerRef.current?.querySelector(`.bar-wrapper[data-id="${selectedTaskId}"]`);
           if (taskGroup) taskGroup.classList.add('selected-task-highlight');
        }, 100);
      }
    } else if (tasks.length === 0 && ganttRef.current) {
        // Clear chart if no tasks
        ganttRef.current = null;
        if (containerRef.current) containerRef.current.innerHTML = '';
    }
  }, [tasks]); // Dependency on tasks

  useEffect(() => {
    if (ganttRef.current) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border p-4 relative">
      <div ref={containerRef} className="gantt-target" />
      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tasks to display. Add a task to get started.
        </div>
      )}
      
      {/* Custom Styles for Frappe Gantt override */}
      <style jsx global>{`
        /* Header Styling */
        .gantt .grid-header {
          background-color: #f9fafb;
          height: 60px;
        }
        .gantt .upper-text {
          font-size: 14px;
          font-weight: 600;
          fill: #374151;
        }
        .gantt .lower-text {
          font-size: 11px;
          fill: #6b7280;
        }

        /* Bar Label Styling */
        .gantt .bar-label {
          fill: #374151;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
        }
        
        /* Base Bar Style */
        .gantt .bar {
          fill: #bfdbfe;
          stroke: #60a5fa;
          stroke-width: 1px;
        }
        
        .gantt .bar-progress {
          fill: #3b82f6;
        }
        
        /* Status Colors */
        .gantt .bar-wrapper[class*="milestone"] .bar,
        .gantt .bar[class*="milestone"] {
          fill: #fca5a5 !important;
          stroke: #ef4444 !important;
        }
        
        .gantt .bar-wrapper[class*="status-completed"] .bar,
        .gantt .bar[class*="status-completed"] {
          fill: #86efac !important;
          stroke: #22c55e !important;
        }
        
        .gantt .bar-wrapper[class*="status-delayed"] .bar,
        .gantt .bar[class*="status-delayed"] {
          fill: #fdba74 !important;
          stroke: #f97316 !important;
        }
        
        /* Budget Placeholder Style - Dashed Ghost */
        .gantt .bar[class*="bar-budget-placeholder"],
        .gantt .bar-wrapper[class*="bar-budget-placeholder"] .bar {
          fill: #f3f4f6 !important; /* Gray 100 */
          stroke: #9ca3af !important; /* Gray 400 */
          stroke-dasharray: 4, 4 !important;
          stroke-width: 1.5px !important;
          opacity: 0.8;
        }
        
        .gantt .bar-wrapper[class*="bar-budget-placeholder"] .bar-label {
          fill: #6b7280 !important; /* Gray 500 */
          font-style: italic;
        }
        
        /* Selection Highlight */
        .gantt .bar-wrapper.selected-task-highlight .bar {
          filter: drop-shadow(0 0 4px rgba(37, 99, 235, 0.6));
          stroke: #1d4ed8 !important;
          stroke-width: 2px !important;
        }
        
        .gantt-container {
          max-height: 650px;
          overflow-y: auto;
          border-radius: 8px;
        }
        
        /* Fix Header Z-Index */
        .gantt .grid-header {
          z-index: 10;
        }
        
        /* Hide scrollbars if not needed */
        .gantt-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .gantt-container::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .gantt-container::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
