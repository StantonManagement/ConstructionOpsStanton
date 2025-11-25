'use client';

import React from 'react';
import type { ScheduleTask } from '@/types/schedule';

interface MobileTaskTimelineProps {
  tasks: ScheduleTask[];
  onTaskClick: (task: ScheduleTask) => void;
}

export default function MobileTaskTimeline({ tasks, onTaskClick }: MobileTaskTimelineProps) {
  // Sort by start date
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No tasks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Vertical Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 -z-10" />

      {sortedTasks.map((task) => {
        const startDate = new Date(task.start_date);
        const isOverdue = new Date(task.end_date) < new Date() && task.status !== 'completed';
        
        return (
          <div 
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="relative pl-8"
          >
            {/* Timeline Dot */}
            <div className={`absolute left-0 top-3 w-4 h-4 rounded-full border-2 bg-white ${
              task.status === 'completed' ? 'border-green-500 bg-green-500' : 
              isOverdue ? 'border-red-500' : 'border-blue-500'
            }`} />

            {/* Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 active:scale-[0.98] transition-transform">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{task.task_name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>
                    {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' - '}
                    {new Date(task.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                {task.contractor_name && (
                  <div className="flex items-center gap-2">
                    <span>👷</span>
                    <span>{task.contractor_name}</span>
                  </div>
                )}

                {isOverdue && (
                  <div className="text-red-600 text-xs font-medium mt-1">
                    ⚠️ Overdue
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

