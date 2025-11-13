import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Contractor {
  id: string;
  name: string;
  trade: string;
  phone: string;
  email?: string;
  status: string;
  performance_score?: number;
  created_at?: string;
  updated_at?: string;
}

async function fetchContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[useContractors] Error fetching contractors:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export function useContractors() {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: fetchContractors,
    staleTime: 30 * 1000, // 30 seconds
  });
}

