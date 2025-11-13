import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface CreateContractorData {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: string;
}

interface UpdateContractorData extends Partial<CreateContractorData> {
  id: string;
}

export function useCreateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractorData: CreateContractorData) => {
      const { data, error } = await supabase
        .from('subcontractors')
        .insert([contractorData])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateContractorData) => {
      const { data, error } = await supabase
        .from('subcontractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractorId: string) => {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', contractorId);

      if (error) throw new Error(error.message);
      return contractorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });
}

