import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Contract {
  id: string;
  project_id: string;
  subcontractor_id: string;
  contract_number: string;
  contract_amount: number;
  start_date: string;
  end_date: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('project_contractors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useContracts] Error fetching contracts:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: fetchContracts,
    staleTime: 30 * 1000, // 30 seconds
  });
}

