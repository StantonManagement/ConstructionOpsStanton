'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ScheduleTask } from '@/types/schedule';
import DraggableTask from './DraggableTask';
import { Plus, DollarSign } from 'lucide-react';

interface SwimLaneProps {
  id: string; // 'unassigned' or categoryId
  title: string;
  budgetAmount?: number;
  tasks: ScheduleTask[];
  viewStartDate: Date;
  viewTotalDays: number;
  isUnassigned?: boolean;
  onAddTask?: () => void;
  onEditTask?: (task: ScheduleTask) => void;
  onUpdateTask?: (task: ScheduleTask) => void;
}

export default function SwimLane({ 
  id, 
  title, 
  budgetAmount, 
  tasks, 
  viewStartDate, 
  viewTotalDays, 
  isUnassigned,
  onAddTask,
  onEditTask,
  onUpdateTask
}: SwimLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex border-b border-gray-200 h-[80px]">
      {/* Sidebar / Header */}
      <div className={`w-64 flex-shrink-0 p-3 border-r border-gray-200 flex flex-col justify-center ${isUnassigned ? 'bg-amber-50' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold truncate ${isUnassigned ? 'text-amber-800' : 'text-gray-900'}`}>
            {title}
          </h4>
          {onAddTask && (
            <button 
              onClick={onAddTask}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              title="Add task to this category"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {!isUnassigned && budgetAmount !== undefined && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>{formatCurrency(budgetAmount)}</span>
          </div>
        )}
        
        <div className="mt-1 text-xs text-gray-400">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Timeline Lane */}
      <div 
        ref={setNodeRef}
        className={`flex-1 relative h-full transition-colors ${
          isOver ? 'bg-primary/10 ring-2 ring-inset ring-blue-200' : 
          isUnassigned ? 'bg-amber-50/30' : 'bg-gray-50/30'
        }`}
      >
        {/* Grid lines and Weekend Highlighting */}
        <div className="absolute inset-0 flex pointer-events-none">
          {[...Array(viewTotalDays)].map((_, i) => {
             const currentDate = new Date(viewStartDate);
             currentDate.setDate(currentDate.getDate() + i);
             const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
             
             return (
               <div 
                 key={i} 
                 className={`flex-1 border-r border-gray-100 last:border-0 ${isWeekend ? 'bg-gray-50/50' : ''}`} 
               />
             );
          })}
        </div>

        {/* Tasks */}
        <div className="absolute inset-0 py-2">
          {tasks.map(task => (
            <DraggableTask
              key={task.id}
              task={task}
              viewStartDate={viewStartDate}
              viewTotalDays={viewTotalDays}
              onEdit={onEditTask}
              onUpdate={onUpdateTask}
            />
          ))}
        </div>
        
        {tasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-300 italic">
              {isUnassigned ? 'No unassigned tasks' : 'Drop tasks here'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

