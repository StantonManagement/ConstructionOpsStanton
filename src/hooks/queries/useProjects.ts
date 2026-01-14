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
  owner_entity_id?: number | null;
  portfolio_name?: string | null;
  portfolio_id?: string | null;
  total_units?: number | null;
  created_at: string;
  updated_at: string;
}

async function fetchProjects(): Promise<Project[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      console.error('[useProjects] No active session');
      return [];
    }

    const response = await fetch('/api/projects', {
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[useProjects] API error:', error);
      throw new Error(error.message || 'Failed to fetch projects');
    }

    const result = await response.json();
    return result.projects || [];
  } catch (err) {
    console.error('[useProjects] Fetch error:', err);
    return [];
  }
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 30 * 1000, // 30 seconds
  });
}

