import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  start_date: string;
  end_date: string | null;
  budget: number;
  created_at: string;
  updated_at: string;
}

async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useProjects] Error fetching projects:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 30 * 1000, // 30 seconds
  });
}

