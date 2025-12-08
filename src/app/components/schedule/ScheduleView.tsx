'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileTaskTimeline from './MobileTaskTimeline';
import TaskFormModal from './TaskFormModal';
import GanttChartContainer from './GanttChartContainer';
import GanttToolbar from './GanttToolbar';
import { ViewMode, Task } from 'gantt-task-react';
import type { ProjectSchedule, ScheduleTask } from '@/types/schedule';
import { Plus } from 'lucide-react';

interface ScheduleViewProps {
  projectId?: number;
}

interface Project {
  id: number;
  name: string;
}

export default function ScheduleView({ projectId: initialProjectId }: ScheduleViewProps) {
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get('project');
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(
    initialProjectId || (projectFromUrl ? parseInt(projectFromUrl) : undefined)
  );
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [schedule, setSchedule] = useState<ProjectSchedule | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | undefined>(undefined);

  // Sync with URL or Props
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    } else if (projectFromUrl) {
      const pid = parseInt(projectFromUrl);
      if (!isNaN(pid)) setSelectedProjectId(pid);
    }
  }, [initialProjectId, projectFromUrl]);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch Projects if no initial ID
  useEffect(() => {
    if (!initialProjectId) {
      const fetchProjects = async () => {
        try {
          setLoading(true); // Start loading
          const { data: session } = await supabase.auth.getSession();
          if (!session?.session?.access_token) {
            console.warn('No access token found');
            setLoading(false);
            return;
          }
          
          const response = await fetch('/api/projects/list', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.session.access_token}` },
            body: JSON.stringify({})
          });
          
          if (response.ok) {
            const result = await response.json();
            const projectsList = result.data?.projects || result.projects || [];
            setProjects(projectsList);
          }
        } catch (error) {
          console.error('Error fetching projects:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchProjects();
    }
  }, [initialProjectId]);

  // Fetch Schedule Data & Budget Categories
  const fetchScheduleData = async () => {
    if (!selectedProjectId) return;
    
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      // 1. Fetch Schedule ID for Project
      const scheduleResponse = await fetch(`/api/schedules?project_id=${selectedProjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await scheduleResponse.json();
      const schedulesList = result.data?.data || result.data || [];
      
      if (schedulesList && schedulesList.length > 0) {
        const scheduleId = schedulesList[0].id;
        setSchedule(schedulesList[0]);

        // Fetch tasks details
        const detailResponse = await fetch(`/api/schedules/${scheduleId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (detailResponse.ok) {
          const detailResult = await detailResponse.json();
          const scheduleData = detailResult.data?.data || detailResult.data || detailResult;
          if (scheduleData.tasks) setTasks(scheduleData.tasks);
        }
      } else {
        setSchedule(null);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) fetchScheduleData();
  }, [selectedProjectId]);

  const handleCreateSchedule = async () => {
    if (!selectedProjectId) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          start_date: new Date().toISOString().split('T')[0],
          target_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +90 days default
        })
      });

      if (response.ok || response.status === 409) {
        fetchScheduleData();
      } else {
        console.error('Failed to create schedule:', response.status);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleTaskClick = (task: ScheduleTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleGanttTaskClick = (ganttTask: Task) => {
    const task = tasks.find(t => t.id === ganttTask.id);
    if (task) {
      handleTaskClick(task);
    }
  };

  const handleGanttDateChange = async (task: Task) => {
    // Optimistic update first
    setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
            return {
                ...t,
                start_date: task.start.toISOString().split('T')[0],
                end_date: task.end.toISOString().split('T')[0],
                progress: task.progress
            };
        }
        return t;
    }));

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token || !schedule) return;

      const response = await fetch(`/api/schedules/${schedule.id}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          start_date: task.start.toISOString().split('T')[0],
          end_date: task.end.toISOString().split('T')[0],
          progress: task.progress
        })
      });
      
      if (!response.ok) {
        // Revert on failure (could be improved with specific rollback)
        fetchScheduleData();
      }
    } catch (e) {
      console.error('Failed to update task dates', e);
      fetchScheduleData();
    }
  };

  // Reused for both date and progress since GanttContainer calls onUpdate for both
  const handleGanttUpdate = handleGanttDateChange;

  // Render Project Selector if no project selected
  if (!selectedProjectId && !initialProjectId) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Project to View Schedule</h2>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <select
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              onChange={(e) => {
                const val = e.target.value;
                if (val) setSelectedProjectId(parseInt(val));
              }}
              value=""
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No projects found.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading && !schedule) {
    return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div></div>;
  }

  if (!schedule) {
    return (
      <div className="space-y-4">
        {!initialProjectId && (
          <button 
            onClick={() => setSelectedProjectId(undefined)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back to Projects
          </button>
        )}
        <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Found</h3>
          <p className="text-gray-500 mb-6">This project doesn't have a timeline yet.</p>
          <button
            onClick={handleCreateSchedule}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GanttToolbar
        isMobile={isMobile}
        viewMode={viewMode}
        projectId={initialProjectId ? undefined : selectedProjectId} // Only show back button if not initial
        onToggleView={setIsMobile}
        onViewModeChange={setViewMode}
        onAddTask={() => {
          setSelectedTask(undefined);
          setShowTaskModal(true);
        }}
        onClearProject={() => setSelectedProjectId(undefined)}
      />

      {/* Content */}
      {isMobile ? (
        <MobileTaskTimeline 
          tasks={tasks} 
          onTaskClick={handleTaskClick} 
        />
      ) : (
        <GanttChartContainer
          tasks={tasks}
          viewMode={viewMode}
          onEdit={handleGanttTaskClick}
          onUpdate={handleGanttUpdate}
        />
      )}

      {/* Modal */}
      {showTaskModal && (
        <TaskFormModal
          scheduleId={schedule.id}
          projectId={selectedProjectId}
          existingTask={selectedTask}
          allTasks={tasks}
          onClose={() => setShowTaskModal(false)}
          onSuccess={fetchScheduleData}
        />
      )}
    </div>
  );
}
