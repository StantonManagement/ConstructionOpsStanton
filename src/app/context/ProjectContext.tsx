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
  projects: Project[];
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Fetch projects from Supabase
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, current_phase, address')
        .in('status', ['active', 'in_progress', 'planning'])
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error in fetchProjects:', error);
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
    
    // Update URL if needed (this logic might need to be more sophisticated depending on current page)
    // For now, we update the state. The components calling this might handle navigation/URL updates
    // or we can add a simple query param update here if we are not on a specific project route.
    
    // Note: We intentionally don't force navigation here to give the caller (e.g. Selector) control
    // over whether to navigate to a new route or just update the param.
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      selectedProject,
      selectedProjectId,
      setSelectedProjectId,
      projects,
      isLoading,
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


