'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export interface Project {
  id: number;
  name: string;
  status: string;
  current_phase?: string;
  address?: string;
}

interface ProjectContextType {
  selectedProject: Project | null;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  clearProject: () => void;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedProjectId');
      if (saved) {
        const id = parseInt(saved, 10);
        if (!isNaN(id)) {
          setSelectedProjectIdState(id);
        }
      }
    }
  }, []);

  // Fetch projects from Supabase
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, status, current_phase, address')
        .neq('status', 'deleted')
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Error fetching projects:', fetchError);
        setError(fetchError.message || 'Failed to load projects');
        setProjects([]);
      } else {
        setProjects(data || []);
        if (data && data.length === 0) {
            console.warn('[ProjectProvider] Fetched 0 projects (non-deleted). Check database.');
        }
      }
    } catch (err: any) {
      console.error('Error in fetchProjects:', err);
      setError(err.message || 'Unexpected error loading projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sync state with URL
  useEffect(() => {
    // Check if we have a project ID in the URL path (e.g. /projects/123/...)
    const pathMatch = pathname?.match(/\/projects\/(\d+)/);
    
    if (pathMatch && pathMatch[1]) {
      const id = parseInt(pathMatch[1], 10);
      if (!isNaN(id) && id !== selectedProjectId) {
        setSelectedProjectIdState(id);
        return;
      }
    }
    
    // Check query param if not in path
    const projectParam = searchParams.get('project');
    if (projectParam) {
      const id = parseInt(projectParam, 10);
      if (!isNaN(id) && id !== selectedProjectId) {
        setSelectedProjectIdState(id);
      }
    }
  }, [pathname, searchParams, selectedProjectId]);

  // Handle setting project ID
  const setSelectedProjectId = useCallback((id: number | null) => {
    setSelectedProjectIdState(id);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      if (id !== null) {
        localStorage.setItem('selectedProjectId', id.toString());
      } else {
        localStorage.removeItem('selectedProjectId');
      }
    }
  }, []);

  // Clear project selection
  const clearProject = useCallback(() => {
    setSelectedProjectIdState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedProjectId');
    }
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      selectedProjectId,
      setSelectedProjectId,
      clearProject,
      projects,
      isLoading,
      error,
      refreshProjects: fetchProjects
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
