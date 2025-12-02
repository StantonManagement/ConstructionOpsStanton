import React from 'react';
import { ScheduleTask } from '@/types/schedule';

interface DependencyLinesProps {
  tasks: ScheduleTask[];
  laneOrder: string[]; // Array of lane IDs in display order
  viewStartDate: Date;
  viewTotalDays: number;
  rowHeight: number; // height in pixels
}

export default function DependencyLines({
  tasks,
  laneOrder,
  viewStartDate,
  viewTotalDays,
  rowHeight
}: DependencyLinesProps) {
  const lines = [];

  // Map task IDs to their lane index and dates
  const taskMap = new Map<string, { 
    laneIndex: number; 
    startDate: Date; 
    endDate: Date; 
  }>();

  // First pass: build map
  tasks.forEach(task => {
    let laneId = 'unassigned';
    if (task.budget_category_id) {
      laneId = `cat-${task.budget_category_id}`;
    }
    
    const laneIndex = laneOrder.indexOf(laneId);
    if (laneIndex !== -1) {
      taskMap.set(task.id, {
        laneIndex,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date)
      });
    }
  });

  // Second pass: generate lines
  for (const task of tasks) {
    const targetInfo = taskMap.get(task.id);
    if (!targetInfo) continue;

    // The 'dependencies' array usually contains predecessor IDs (source tasks)
    // We want to draw FROM source TO target (this task)
    // Check if 'predecessors' or 'dependencies' property exists on your task type
    // Based on previous context, task.dependencies is likely an array of objects or IDs
    // Let's assume it matches the API response structure or we'll adjust types if needed.
    // The provided types might need checking. Assuming task.dependencies is [ { source_task_id, ... } ] or similar.
    
    const predecessors = (task.dependencies || []) as any[]; 
    
    for (const pred of predecessors) {
      // If pred is just an ID string (depending on type definition), handle that
      // Or if it's an object { source_task_id: ... }
      const sourceId = typeof pred === 'string' ? pred : pred.source_task_id;
      const sourceInfo = taskMap.get(sourceId);
      
      if (!sourceInfo) continue;

      // Calculate coordinates
      // X is percentage (0-100)
      const getX = (date: Date) => {
        const diff = (date.getTime() - viewStartDate.getTime()) / (1000 * 60 * 60 * 24);
        return (diff / viewTotalDays) * 100;
      };

      const x1 = getX(sourceInfo.endDate); // End of source
      const x2 = getX(targetInfo.startDate); // Start of target
      
      // Y is pixel offset
      // Center of the row: index * height + height/2
      const y1 = sourceInfo.laneIndex * rowHeight + (rowHeight / 2);
      const y2 = targetInfo.laneIndex * rowHeight + (rowHeight / 2);

      // Control points for bezier curve
      // We want horizontal exit from source and horizontal entry to target
      // Curve intensity depends on distance
      const dist = Math.abs(x2 - x1);
      const curve = Math.min(10, dist / 2); // percentage-based control point offset

      // Since SVG coordinates will be percentages for X and pixels for Y, 
      // we need a way to mix them or use a consistent unit.
      // Easiest is to use 100% width SVG and mix units if possible, or just use percentage for X and pixels for Y in the 'd' attribute?
      // SVG 'd' attribute doesn't mix units easily. 
      // BETTER APPROACH: Since the container is scrollable and has a known width (rendered width),
      // we rely on the fact that the parent uses relative positioning.
      // BUT SVG needs consistent coordinate system.
      // If we set SVG viewBox to "0 0 100 totalHeight", X is 0-100, Y is 0-totalHeight.
      // Then ensure preserveAspectRatio="none".
      
      // However, we probably want crisp lines. 
      // If we use width="100%" height="100%" on SVG, the internal units depend on the coordinate system.
      // Let's assume the parent container is large enough. 
      // Actually, using percentages in 'd' path data isn't standard.
      // We might need to use vector-effect="non-scaling-stroke" and just use % if viewbox is 0 0 100 <height>.
      
      // Let's calculate coordinates assuming viewBox="0 0 100 <totalHeight>"
      // X values are 0-100. Y values are 0-totalPixels.
      
      // Bezier control points
      // Standard Gantt: Right -> Down/Up -> Right
      // M x1 y1 L x1+offset y1 L x1+offset y2 L x2 y2
      
      const offset = 2; // 2% offset
      
      // Use 'L' for straight lines (angular)
      const path = `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${y2} L ${x2} ${y2}`;
      
      lines.push(
        <path
          key={`${sourceId}-${task.id}`}
          d={path}
          fill="none"
          stroke="#6B7280" // gray-500 (darker than 400)
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          className="opacity-70 hover:opacity-100 hover:stroke-primary hover:stroke-width-3 transition-all duration-200" // Increased opacity
          vectorEffect="non-scaling-stroke" 
        />
      );
    }
  }

  const totalHeight = laneOrder.length * rowHeight;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      width="100%"
      height={totalHeight}
      viewBox={`0 0 100 ${totalHeight}`}
      preserveAspectRatio="none"
      style={{ minHeight: totalHeight }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <polygon points="0 0, 6 2, 0 4" fill="#6B7280" />
        </marker>
      </defs>
      {lines}
    </svg>
  );
}

