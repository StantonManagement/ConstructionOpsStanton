import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Contractor {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
}

async function fetchContractors(): Promise<Contractor[]> {
  const { data, error } = await supabase
    .from('subcontractors')
    .select('*')
    .order('company_name', { ascending: true });

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

