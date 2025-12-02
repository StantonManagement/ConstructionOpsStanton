'use client';

import React from 'react';
import { Plus, Smartphone, Monitor } from 'lucide-react';
import { ViewMode } from 'gantt-task-react';

interface GanttToolbarProps {
  isMobile: boolean;
  viewMode: 'Day' | 'Week' | 'Month';
  projectId?: number;
  onToggleView: (mobile: boolean) => void;
  onViewModeChange: (mode: 'Day' | 'Week' | 'Month') => void;
  onAddTask: () => void;
  onClearProject: () => void;
}

export default function GanttToolbar({
  isMobile,
  viewMode,
  projectId,
  onToggleView,
  onViewModeChange,
  onAddTask,
  onClearProject
}: GanttToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center gap-4">
        {projectId && (
          <button 
            onClick={onClearProject}
            className="text-gray-400 hover:text-gray-600"
            title="Switch Project"
          >
            ←
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-900">Project Schedule</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg text-sm">
          <button
            onClick={() => onToggleView(false)}
            className={`px-3 py-1 rounded-md flex items-center gap-2 ${!isMobile ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Gantt</span>
          </button>
          <button
            onClick={() => onToggleView(true)}
            className={`px-3 py-1 rounded-md flex items-center gap-2 ${isMobile ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {!isMobile && (
          <select
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="Day">Day View</option>
            <option value="Week">Week View</option>
            <option value="Month">Month View</option>
          </select>
        )}
        
        <button
          onClick={onAddTask}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}

