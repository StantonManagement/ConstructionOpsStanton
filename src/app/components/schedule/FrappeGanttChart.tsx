'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import Gantt from 'frappe-gantt';

export type FrappeViewMode = 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year';

export interface FrappeTask {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  progress: number; // 0-100
  dependencies?: string; // Comma-separated predecessor IDs
  custom_class?: string; // For styling by status/category
}

interface FrappeGanttChartProps {
  tasks: FrappeTask[];
  viewMode?: FrappeViewMode;
  onTaskClick?: (task: FrappeTask) => void;
  onDateChange?: (task: FrappeTask, start: Date, end: Date) => void;
  onProgressChange?: (task: FrappeTask, progress: number) => void;
  onViewChange?: (mode: FrappeViewMode) => void;
}

export default function FrappeGanttChart({
  tasks,
  viewMode = 'Week',
  onTaskClick,
  onDateChange,
  onProgressChange,
}: FrappeGanttChartProps) {
  const SIDEBAR_ROW_HEIGHT = 48;
  const SIDEBAR_HEADER_HEIGHT = 48;
  const SIDEBAR_SPACER_HEIGHT = 52;

  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollLeftRef = useRef(0);
  const scrollMinRef = useRef(0);
  const scrollMaxRef = useRef(0);
  const hasAutoScrolledRef = useRef(false);
  const isSyncingScrollRef = useRef<'gantt' | 'sidebar' | null>(null);

  // Memoize handlers to prevent unnecessary re-renders
  const scrollToTask = useCallback((taskId: string) => {
    const container = containerRef.current;
    if (!container) return;

    // 1) Vertical: scroll sidebar (and chart via sync) to the row
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0 && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = Math.max(0, idx * SIDEBAR_ROW_HEIGHT);
    }

    // 2) Horizontal + finer vertical alignment: try to locate the bar in the SVG
    const svg = container.querySelector('svg');
    if (!svg) return;

    const selectors = [
      `.bar-wrapper[data-id="${taskId}"] .bar`,
      `.bar-wrapper[data-id="${taskId}"]`,
      `.bar-wrapper[task-id="${taskId}"] .bar`,
      `.bar-wrapper[task-id="${taskId}"]`,
    ];

    let el: SVGGraphicsElement | null = null;
    for (const sel of selectors) {
      el = svg.querySelector(sel) as SVGGraphicsElement | null;
      if (el) break;
    }
    if (!el) return;

    let box: DOMRect | null = null;
    try {
      // For SVGGraphicsElement, getBBox gives coordinates in SVG space.
      const b = (el as any).getBBox?.();
      if (b) {
        box = new DOMRect(b.x, b.y, b.width, b.height);
      }
    } catch {
      // ignore
    }
    if (!box) return;

    // Center-ish padding so the bar isn't glued to the edge
    const targetLeft = Math.floor(box.x - 120);
    container.scrollLeft = Math.min(
      scrollMaxRef.current,
      Math.max(scrollMinRef.current, targetLeft)
    );

    // Align vertically so the row is visible (best-effort)
    const targetTop = Math.max(0, Math.floor(box.y - SIDEBAR_HEADER_HEIGHT));
    container.scrollTop = targetTop;
  }, [tasks]);

  const handleClick = useCallback((task: FrappeTask) => {
    scrollToTask(task.id);
    onTaskClick?.(task);
  }, [onTaskClick, scrollToTask]);

  const handleDateChange = useCallback((task: FrappeTask, start: Date, end: Date) => {
    onDateChange?.(task, start, end);
  }, [onDateChange]);

  const handleProgressChange = useCallback((task: FrappeTask, progress: number) => {
    onProgressChange?.(task, progress);
  }, [onProgressChange]);

  // Initialize Gantt chart
  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    // Clear previous instance
    if (ganttRef.current) {
      containerRef.current.innerHTML = '';
    }

    // frappe-gantt expects tasks with specific format
    // Replace spaces with hyphens in custom_class to avoid DOMTokenList errors
    const ganttTasks = tasks.map(t => ({
      id: t.id,
      name: t.name,
      start: t.start,
      end: t.end,
      progress: t.progress,
      dependencies: t.dependencies || '',
      custom_class: (t.custom_class || '').replace(/\s+/g, '-'),
    }));

    try {
      ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        popup_trigger: 'click',
        custom_popup_html: null, // We'll handle popups via onTaskClick
        on_click: handleClick,
        on_date_change: handleDateChange,
        on_progress_change: handleProgressChange,
        bar_height: 30,
        bar_corner_radius: 4,
        arrow_curve: 5,
        padding: 18,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
        language: 'en',
      });

      // Compute realistic scroll bounds from rendered bars and clamp scroll.
      // This prevents scrolling far before the project start (earliest task) or far after the end.
      const computeScrollBounds = () => {
        const container = containerRef.current;
        if (!container) return;

        const svg = container.querySelector('svg');
        if (!svg) return;

        const barEls = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.bar-wrapper .bar'));
        if (barEls.length === 0) return;

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;

        for (const el of barEls) {
          try {
            const box = el.getBBox();
            if (box.width <= 0) continue;
            minX = Math.min(minX, box.x);
            maxX = Math.max(maxX, box.x + box.width);
          } catch {
            // ignore
          }
        }

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

        const leftPad = 60;
        const rightPad = 120;

        const minScroll = Math.max(0, Math.floor(minX - leftPad));
        const maxScroll = Math.max(
          minScroll,
          Math.floor(maxX - (container.clientWidth - rightPad))
        );

        scrollMinRef.current = minScroll;
        scrollMaxRef.current = maxScroll;

        // Auto-scroll once per (tasks, viewMode) render so the chart starts at project start.
        if (!hasAutoScrolledRef.current) {
          container.scrollLeft = minScroll;
          hasAutoScrolledRef.current = true;
        } else {
          // Clamp current scroll
          container.scrollLeft = Math.min(
            scrollMaxRef.current,
            Math.max(scrollMinRef.current, container.scrollLeft)
          );
        }
      };

      // Defer until the SVG is laid out.
      requestAnimationFrame(() => computeScrollBounds());
      setTimeout(() => computeScrollBounds(), 0);
    } catch (error) {
      console.error('Error initializing Frappe Gantt:', error);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      ganttRef.current = null;
    };
  }, [tasks, handleClick, handleDateChange, handleProgressChange]);

  const handlePanStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (e.button !== 0) return;

    // Don't hijack pointer events intended for task drag/resize/click.
    // Only enable panning when dragging "background" areas.
    const el = e.target as HTMLElement | null;
    if (el) {
      const interactive = el.closest(
        '.bar-wrapper, .bar, .handle, .bar-label, .details-container, .popup-wrapper'
      );
      if (interactive) return;
    }

    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    panStartScrollLeftRef.current = containerRef.current.scrollLeft;
    containerRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePanMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (!isPanningRef.current) return;
    e.preventDefault();

    const dx = e.clientX - panStartXRef.current;
    const next = panStartScrollLeftRef.current - dx;
    containerRef.current.scrollLeft = Math.min(
      scrollMaxRef.current,
      Math.max(scrollMinRef.current, next)
    );
  }, []);

  const handlePanEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (!isPanningRef.current) return;

    isPanningRef.current = false;
    try {
      containerRef.current.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  // Update view mode when it changes
  useEffect(() => {
    if (ganttRef.current && viewMode) {
      try {
        ganttRef.current.change_view_mode(viewMode);
        hasAutoScrolledRef.current = false;
      } catch (error) {
        console.error('Error changing view mode:', error);
      }
    }
  }, [viewMode]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Sync vertical scroll to sidebar.
    if (isSyncingScrollRef.current !== 'sidebar' && sidebarScrollRef.current) {
      isSyncingScrollRef.current = 'gantt';
      sidebarScrollRef.current.scrollTop = container.scrollTop;
      isSyncingScrollRef.current = null;
    }

    const clamped = Math.min(
      scrollMaxRef.current,
      Math.max(scrollMinRef.current, container.scrollLeft)
    );
    if (clamped !== container.scrollLeft) {
      container.scrollLeft = clamped;
    }
  }, []);

  const handleSidebarScroll = useCallback(() => {
    const sidebar = sidebarScrollRef.current;
    const container = containerRef.current;
    if (!sidebar || !container) return;
    if (isSyncingScrollRef.current === 'gantt') return;

    isSyncingScrollRef.current = 'sidebar';
    container.scrollTop = sidebar.scrollTop;
    isSyncingScrollRef.current = null;
  }, []);

  // Empty state
  if (tasks.length === 0) {
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
    <div className="w-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="flex w-full">
        <div className="frappe-gantt-sidebar">
          <div className="frappe-gantt-sidebar-header">Task Name</div>
          <div
            ref={sidebarScrollRef}
            className="frappe-gantt-sidebar-scroll"
            onScroll={handleSidebarScroll}
          >
            <div className="frappe-gantt-sidebar-spacer" />
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                className="frappe-gantt-sidebar-row"
                onClick={() => {
                  scrollToTask(t.id);
                  onTaskClick?.(t);
                }}
                title={t.name}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className="frappe-gantt-container"
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerCancel={handlePanEnd}
          onScroll={handleScroll}
        />
      </div>
      <style jsx global>{`
        .frappe-gantt-sidebar {
          width: 260px;
          border-right: 1px solid #e5e7eb;
          background: #fff;
          flex: 0 0 260px;
        }
        .frappe-gantt-sidebar-header {
          height: 48px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        .frappe-gantt-sidebar-scroll {
          height: 600px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .frappe-gantt-sidebar-spacer {
          height: 52px;
        }
        .frappe-gantt-sidebar-row {
          height: 48px;
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border-bottom: 1px solid #f3f4f6;
          text-align: left;
          font-size: 13px;
          color: #111827;
          background: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .frappe-gantt-sidebar-row:hover {
          background: #f9fafb;
        }
        .frappe-gantt-container {
          overflow: auto;
          height: 648px;
          width: 100%;
          cursor: grab;
          touch-action: pan-y;
        }
        .frappe-gantt-container:active {
          cursor: grabbing;
        }
        .frappe-gantt-container .gantt {
          background: white;
        }
        .frappe-gantt-container .gantt .grid-header {
          fill: #f9fafb;
          stroke: #e5e7eb;
        }
        .frappe-gantt-container .gantt .grid-row {
          fill: white;
        }
        .frappe-gantt-container .gantt .grid-row:nth-child(even) {
          fill: #f9fafb;
        }
        .frappe-gantt-container .gantt .row-line {
          stroke: #e5e7eb;
        }
        .frappe-gantt-container .gantt .tick {
          stroke: #e5e7eb;
          stroke-width: 0.5;
        }
        .frappe-gantt-container .gantt .today-highlight {
          fill: rgba(59, 130, 246, 0.1);
        }
        .frappe-gantt-container .gantt .bar {
          fill: #3b82f6;
          stroke: #2563eb;
          stroke-width: 0;
          transition: fill 0.2s;
        }
        .frappe-gantt-container .gantt .bar:hover {
          fill: #2563eb;
        }
        .frappe-gantt-container .gantt .bar-progress {
          fill: #1d4ed8;
        }
        .frappe-gantt-container .gantt .bar-label {
          fill: white;
          font-size: 12px;
          font-weight: 500;
        }
        .frappe-gantt-container .gantt .bar-wrapper:hover .bar {
          fill: #2563eb;
        }
        .frappe-gantt-container .gantt .handle {
          fill: #1e40af;
          cursor: ew-resize;
        }
        .frappe-gantt-container .gantt .arrow {
          stroke: #6b7280;
          stroke-width: 1.5;
          fill: none;
        }
        /* Status-based colors */
        .frappe-gantt-container .gantt .bar-wrapper.status-not-started .bar {
          fill: #9ca3af;
        }
        .frappe-gantt-container .gantt .bar-wrapper.status-in-progress .bar {
          fill: #3b82f6;
        }
        .frappe-gantt-container .gantt .bar-wrapper.status-completed .bar {
          fill: #10b981;
        }
        .frappe-gantt-container .gantt .bar-wrapper.status-on-hold .bar {
          fill: #f59e0b;
        }
        /* Milestone styling */
        .frappe-gantt-container .gantt .bar-wrapper.milestone .bar {
          fill: #8b5cf6;
          rx: 2;
        }
        /* Lower header (dates) */
        .frappe-gantt-container .gantt .lower-text {
          fill: #6b7280;
          font-size: 11px;
        }
        /* Upper header (months/years) */
        .frappe-gantt-container .gantt .upper-text {
          fill: #374151;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
