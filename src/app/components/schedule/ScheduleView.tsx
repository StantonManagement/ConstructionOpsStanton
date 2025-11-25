'use client';

import React, { useState, useEffect } from 'react';
import { ViewMode, Task } from 'gantt-task-react';
import { supabase } from '@/lib/supabaseClient';
import GanttChartContainer from './GanttChartContainer';
import MobileTaskTimeline from './MobileTaskTimeline';
import TaskFormModal from './TaskFormModal';
import type { ProjectSchedule, ScheduleTask } from '@/types/schedule';
import { Plus, Smartphone, Monitor } from 'lucide-react';

interface ScheduleViewProps {
  projectId?: number;
}

interface Project {
  id: number;
  name: string;
}

export default function ScheduleView({ projectId: initialProjectId }: ScheduleViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(initialProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [schedule, setSchedule] = useState<ProjectSchedule | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | undefined>(undefined);

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
          
          console.log('Fetching projects list...');
          const response = await fetch('/api/projects/list', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.session.access_token}` },
            body: JSON.stringify({})
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Projects response:', result);
            // Handle both wrapped { data: { projects: [] } } and unwrapped { projects: [] } formats
            const projectsList = result.data?.projects || result.projects || [];
            console.log('Projects parsed:', projectsList.length);
            setProjects(projectsList);
          } else {
            console.error('Failed to fetch projects:', response.status, await response.text());
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

  // Fetch Schedule Data
  const fetchScheduleData = async () => {
    if (!selectedProjectId) return;
    
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      // 1. Find Schedule ID for Project
      const response = await fetch(`/api/schedules?project_id=${selectedProjectId}`, {
        headers: { 'Authorization': `Bearer ${session.session.access_token}` }
      });
      const result = await response.json();
      console.log('Schedule response:', result);
      
      const schedulesList = result.data?.data || result.data || [];
      
      if (schedulesList && schedulesList.length > 0) {
        const scheduleId = schedulesList[0].id;
        
        // 2. Fetch Full Details
        const response = await fetch(`/api/schedules/${scheduleId}`, {
          headers: { 'Authorization': `Bearer ${session.session.access_token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          // Handle wrapped response: { success: true, data: { schedule: {...}, tasks: [...] } }
          const scheduleData = result.data?.data || result.data || result;
          
          // Ensure we have the actual schedule object and tasks array
          if (scheduleData.schedule) {
            setSchedule(scheduleData.schedule);
            setTasks(scheduleData.tasks || []);
          } else {
            console.warn('Schedule data missing in response', scheduleData);
            setSchedule(null);
          }
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
        // If created or already exists, fetch data
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

  const handleGanttTaskUpdate = async (task: Task) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token || !schedule) return;

      await fetch(`/api/schedules/${schedule.id}/tasks/${task.id}`, {
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
      fetchScheduleData();
    } catch (e) {
      console.error('Failed to update task', e);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token || !schedule) return;

      const response = await fetch(`/api/schedules/${schedule.id}/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.session.access_token}` }
      });

      if (response.ok) {
        fetchScheduleData();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Render Project Selector if no project selected
  if (!selectedProjectId && !initialProjectId) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Project to View Schedule</h2>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div>
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

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto"></div></div>;
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
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
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          {!initialProjectId && (
            <button 
              onClick={() => setSelectedProjectId(undefined)}
              className="text-gray-400 hover:text-gray-600"
              title="Switch Project"
            >
              ←
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900">Project Schedule</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg text-sm">
            <button
              onClick={() => setIsMobile(false)}
              className={`px-3 py-1 rounded-md flex items-center gap-2 ${!isMobile ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Gantt</span>
            </button>
            <button
              onClick={() => setIsMobile(true)}
              className={`px-3 py-1 rounded-md flex items-center gap-2 ${isMobile ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
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
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value={ViewMode.Day}>Day View</option>
              <option value={ViewMode.Week}>Week View</option>
              <option value={ViewMode.Month}>Month View</option>
            </select>
          )}
          
          <button
            onClick={() => {
              setSelectedTask(undefined);
              setShowTaskModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

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
          onUpdate={handleGanttTaskUpdate}
          onEdit={handleGanttTaskClick}
          onDelete={handleDeleteTask}
          onExpanderClick={(task) => console.log('Expand:', task)}
        />
      )}

      {/* Modal */}
      {showTaskModal && (
        <TaskFormModal
          scheduleId={schedule.id}
          existingTask={selectedTask}
          allTasks={tasks}
          onClose={() => setShowTaskModal(false)}
          onSuccess={fetchScheduleData}
        />
      )}
    </div>
  );
}
