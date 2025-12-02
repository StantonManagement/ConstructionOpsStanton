'use client';

import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { ScheduleTask, ProjectSchedule } from '@/types/schedule';
import SwimLane from './SwimLane';
import DependencyLines from './DependencyLines';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwimLaneGanttProps {
  schedule: ProjectSchedule | null;
  budgetCategories: any[];
  unassignedTasks: ScheduleTask[];
  onAssignTask: (taskId: string, budgetCategoryId: number | null) => Promise<void>;
  onAddTask?: (budgetCategoryId: number | null) => void;
  onEditTask?: (task: ScheduleTask) => void;
  onUpdateTask?: (task: ScheduleTask) => void;
}

export default function SwimLaneGantt({ 
  schedule, 
  budgetCategories, 
  unassignedTasks, 
  onAssignTask,
  onAddTask,
  onEditTask,
  onUpdateTask
}: SwimLaneGanttProps) {
  const [viewDate, setViewDate] = useState(new Date()); // Center of view, or start
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month' | 'quarter'>('month');

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Enable click on tasks without dragging
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Calculate View Range
  const { startDate, totalDays, endDate } = useMemo(() => {
    // Default to current month if no schedule/tasks
    let start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    
    if (zoomLevel === 'quarter') {
      // Start 1 month before
      start = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    }

    // Determine end based on zoom
    let daysToShow = 30;
    if (zoomLevel === 'week') daysToShow = 7;
    if (zoomLevel === 'quarter') daysToShow = 90;

    const end = new Date(start);
    end.setDate(start.getDate() + daysToShow);

    return { startDate: start, totalDays: daysToShow, endDate: end };
  }, [viewDate, zoomLevel]);

  // Handle Drag End
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Check if dropping onto the SAME lane (time adjustment)
    // DndKit doesn't give us precise drop coordinates relative to container easily for time calc
    // without custom sensors/modifiers.
    // But wait - we are dragging the task itself.
    // If we drop it on the same lane, we might want to move it in time.
    // CURRENTLY: The logic only handles moving between lanes (assigning budget categories).
    
    // To support moving time, we need to know the X coordinate of the drop.
    // DndKit provides delta.x in active.
    
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Detect if we moved significantly in X axis (Time)
    // DndKit's `delta` gives us the translation in pixels
    const deltaX = active.rect.current.translated?.left! - active.rect.current.initial?.left!;
    const containerWidth = (event.activatorEvent.target as HTMLElement).closest('.flex-1')?.clientWidth || 1000;
    
    // Calculate days shifted based on viewTotalDays and container width
    // This is approximate but effective for visual drag-to-move
    const daysShifted = Math.round((deltaX / containerWidth) * totalDays);

    let newStartDate = task.start_date;
    let newEndDate = task.end_date;

    if (daysShifted !== 0 && onUpdateTask) {
      // Update dates
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      
      start.setDate(start.getDate() + daysShifted);
      end.setDate(end.getDate() + daysShifted);
      
      newStartDate = start.toISOString().split('T')[0];
      newEndDate = end.toISOString().split('T')[0];
      
      // Update via callback
      onUpdateTask({
        ...task,
        start_date: newStartDate,
        end_date: newEndDate
      });
    }

    // Parse destination
    let budgetCategoryId: number | null = task.budget_category_id; // Default to current if invalid drop
    
    if (overId === 'unassigned') {
      budgetCategoryId = null;
    } else if (overId.startsWith('cat-')) {
      budgetCategoryId = parseInt(overId.replace('cat-', ''), 10);
    } else {
      // Invalid drop zone, but we might have moved in time (same lane)
      // If we moved in time, we already called onUpdateTask above.
      // We should return here if category didn't change to avoid redundant calls?
      // Actually, if category changed, we call onAssignTask. If not, we are done.
    }

    // Only trigger assignment if category changed
    if (budgetCategoryId !== task.budget_category_id) {
      onAssignTask(taskId, budgetCategoryId);
    }
  };

  const handlePrev = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
  };

  // Generate Timeline Header
  const timelineWeeks = useMemo(() => {
    const periods = [];
    const current = new Date(startDate);
    
    // Step size based on zoom
    const stepDays = zoomLevel === 'week' ? 1 : 7; // Daily for week view, weekly otherwise (quarter uses weekly for now or monthly?)
    // For quarter, showing every week is dense but detailed. Maybe monthly labels? 
    // Let's stick to standard grid lines.
    
    while (current < endDate) {
      periods.push(new Date(current));
      current.setDate(current.getDate() + stepDays);
    }
    return periods;
  }, [startDate, endDate, zoomLevel]);

  const formatDate = (date: Date) => {
    if (zoomLevel === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Build ordered list of tasks and lanes for dependencies
  const allTasks = useMemo(() => {
    return [...unassignedTasks, ...budgetCategories.flatMap(cat => cat.tasks)];
  }, [unassignedTasks, budgetCategories]);

  const laneOrder = useMemo(() => {
    return ['unassigned', ...budgetCategories.map(c => `cat-${c.id}`)];
  }, [budgetCategories]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
      {/* Controls Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-md border border-gray-300 shadow-sm">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-50 border-r border-gray-300">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium min-w-[120px] text-center">
              {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNext} className="p-1 hover:bg-gray-50 border-l border-gray-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center bg-white rounded-md border border-gray-300 shadow-sm overflow-hidden">
            <button 
              onClick={() => setZoomLevel('week')}
              className={`px-3 py-1 text-xs font-medium ${zoomLevel === 'week' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
            >
              Week
            </button>
            <div className="w-px h-full bg-gray-300" />
            <button 
              onClick={() => setZoomLevel('month')}
              className={`px-3 py-1 text-xs font-medium ${zoomLevel === 'month' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
            >
              Month
            </button>
            <div className="w-px h-full bg-gray-300" />
            <button 
              onClick={() => setZoomLevel('quarter')}
              className={`px-3 py-1 text-xs font-medium ${zoomLevel === 'quarter' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}
            >
              Quarter
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          Drag tasks to assign budget categories
        </div>
      </div>

      {/* Timeline Header */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-64 flex-shrink-0 p-2 border-r border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider pl-4">
          Budget Category
        </div>
        {/* Today Marker */}
        {(() => {
          const today = new Date();
          const left = ((today.getTime() - startDate.getTime()) / (totalDays * 24 * 60 * 60 * 1000)) * 100;
          
          // Don't render if out of view
          if (left < 0 || left > 100) return null;
          
          return (
            <div 
              className="absolute top-8 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
              style={{ left: `calc(${left}% + 16rem)` }} // Offset by sidebar width (16rem = 64 * 0.25rem = 256px)
            >
              <div className="absolute -top-1.5 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm" title="Today" />
            </div>
          );
        })()}

        <div className="flex-1 relative h-8 overflow-hidden">
          {timelineWeeks.map((date, i) => {
            const left = ((date.getTime() - startDate.getTime()) / (totalDays * 24 * 60 * 60 * 1000)) * 100;
            if (left > 100) return null;
            return (
              <div 
                key={i} 
                className="absolute top-0 bottom-0 border-l border-gray-200 pl-1 text-xs text-gray-400"
                style={{ left: `${left}%` }}
              >
                {formatDate(date)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-scroll relative custom-scrollbar">
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            height: 12px;
            width: 12px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 6px;
            border: 3px solid #f1f1f1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}</style>
        
        {/* Dependency Lines Layer - Renders behind lanes but on top of grid if desired, or use z-index */}
        {/* We render it inside the scrollable area so it scrolls with content */}
        <div className="absolute inset-0 pointer-events-none z-0 ml-64"> 
             {/* ml-64 to offset the sidebar width so lines align with timeline */}
             <DependencyLines
                tasks={allTasks}
                laneOrder={laneOrder}
                viewStartDate={startDate}
                viewTotalDays={totalDays}
                rowHeight={80}
             />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Unassigned Lane */}
          <SwimLane
            id="unassigned"
            title={`⚠️ Unassigned (${unassignedTasks.length})`}
            tasks={unassignedTasks}
            viewStartDate={startDate}
            viewTotalDays={totalDays}
            isUnassigned={true}
            onAddTask={() => onAddTask?.(null)}
            onEditTask={onEditTask}
            onUpdateTask={onUpdateTask}
          />

          {/* Budget Category Lanes */}
          {budgetCategories.map(cat => (
            <SwimLane
              key={cat.id}
              id={`cat-${cat.id}`}
              title={cat.category_name}
              budgetAmount={cat.revised_amount || cat.original_amount}
              tasks={cat.tasks}
              viewStartDate={startDate}
              viewTotalDays={totalDays}
              onAddTask={() => onAddTask?.(cat.id)}
              onEditTask={onEditTask}
              onUpdateTask={onUpdateTask}
            />
          ))}
          
          {/* Add padding at bottom */}
          <div className="h-12"></div>
        </DndContext>
      </div>
    </div>
  );
}
