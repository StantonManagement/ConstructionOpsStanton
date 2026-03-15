import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Project {
  id: number;
  name: string;
  client_name?: string;
  current_phase?: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, current_phase')
        .order('name');

      if (error) {
        throw new Error(error.message);
      }

      return data as Project[];
    },
  });
}
