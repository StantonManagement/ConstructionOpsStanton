'use client';

import React, { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ScheduleTask } from '@/types/schedule';
import { GripVertical } from 'lucide-react';

interface DraggableTaskProps {
  task: ScheduleTask;
  viewStartDate: Date;
  viewTotalDays: number;
  onEdit?: (task: ScheduleTask) => void;
  onUpdate?: (task: ScheduleTask) => void;
}

export default function DraggableTask({ task, viewStartDate, viewTotalDays, onEdit, onUpdate }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

  // Resize state
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeOffset, setResizeOffset] = useState(0);

  // Calculate position and width
  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const taskStart = parseDate(task.start_date);
  const taskEnd = parseDate(task.end_date);
  
  // Diff in days from view start
  const startDiff = (taskStart.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24) + 1; // Inclusive

  const leftPercent = Math.max(0, (startDiff / viewTotalDays) * 100);
  const widthPercent = Math.min(100 - leftPercent, (duration / viewTotalDays) * 100);

  // Styling based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 border-green-600';
      case 'in_progress': return 'bg-primary border-primary';
      case 'on_hold': return 'bg-orange-500 border-orange-600';
      default: return 'bg-gray-400 border-gray-500';
    }
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  // Resize Logic
  const handleResizeStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation(); // Prevent drag
    e.preventDefault();
    setIsResizing(direction);
    
    const startX = e.clientX;
    const initialStart = taskStart.getTime();
    const initialEnd = taskEnd.getTime();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Convert pixels to days (approximate based on window width)
      // We need the width of the container to know pixels per day.
      // Hack: Use percentage if possible, but we only have pixels.
      // Assuming container width available? No. 
      // Let's use a fixed pixel-to-day ratio or try to infer from parent?
      // Parent container is dynamic.
      // Alternative: Pass pixelsPerDay prop?
      // For now, let's assume a rough width based on viewport or calculate percentage change.
      
      const containerWidth = (e.target as HTMLElement).closest('.flex-1')?.clientWidth || 1000;
      const daysChanged = Math.round((deltaX / containerWidth) * viewTotalDays);
      
      if (daysChanged === 0) return;

      if (direction === 'right') {
        // Update end date
        const newEnd = new Date(initialEnd);
        newEnd.setDate(newEnd.getDate() + daysChanged);
        // Limit: End >= Start
        if (newEnd >= taskStart) {
           // Update locally or just visual feedback?
           // For full resize, we need state management.
           // Let's just fire onUpdate when mouse up.
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaX = upEvent.clientX - startX;
      const containerWidth = (e.target as HTMLElement).closest('.flex-1')?.clientWidth || 1000;
      const daysChanged = Math.round((deltaX / containerWidth) * viewTotalDays);
      
      if (daysChanged !== 0 && onUpdate) {
        if (direction === 'right') {
          const newEnd = new Date(initialEnd);
          newEnd.setDate(newEnd.getDate() + daysChanged);
          if (newEnd >= taskStart) {
             onUpdate({ ...task, end_date: newEnd.toISOString().split('T')[0] });
          }
        } else if (direction === 'left') {
          const newStart = new Date(initialStart);
          newStart.setDate(newStart.getDate() + daysChanged);
          if (newStart <= taskEnd) {
             onUpdate({ ...task, start_date: newStart.toISOString().split('T')[0] });
          }
        }
      }

      setIsResizing(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Don't render if out of view (left > 100 or left+width < 0) - simple check
  if (leftPercent > 100 || leftPercent + widthPercent < 0) return null;

  // Milestone rendering
  if (task.is_milestone) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          left: `${leftPercent}%`,
          top: '34px', // Adjusted for diamond centering
          width: '20px', // Fixed size for milestone
          height: '20px',
          transform: style?.transform ? `${style.transform} rotate(45deg)` : 'rotate(45deg)',
        }}
        className={`absolute rounded-sm shadow-sm border cursor-pointer hover:brightness-110 transition-colors bg-yellow-500 border-yellow-600 z-20`}
        {...listeners}
        {...attributes}
        title={`Milestone: ${task.task_name} (${task.start_date})`}
        onClick={(e) => {
          if (!isDragging) onEdit?.(task);
        }}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 1)}%`, // Min width 1% visibility
        top: '24px', // Vertically centered in 80px lane
      }}
      className={`absolute h-8 rounded-md shadow-sm border text-white text-xs flex items-center px-2 transition-colors ${getStatusColor(task.status)} ${isDragging ? 'opacity-50 ring-2 ring-blue-400 z-50' : 'z-10'} group`}
      {...listeners}
      {...attributes}
      title={`${task.task_name} (${task.start_date} - ${task.end_date})`}
      onClick={(e) => {
        if (!isDragging && !isResizing) {
          onEdit?.(task);
        }
      }}
    >
      {/* Progress Bar */}
      {task.progress > 0 && (
        <div 
          className="absolute top-0 bottom-0 left-0 bg-black/20 pointer-events-none"
          style={{ width: `${task.progress}%` }}
        />
      )}

      {/* Left Resize Handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />

      <GripVertical className="w-3 h-3 mr-1 opacity-50 flex-shrink-0 cursor-grab active:cursor-grabbing" />
      <span className="truncate font-medium flex-1 cursor-pointer">{task.task_name}</span>

      {/* Right Resize Handle */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
    </div>
  );
}
