'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Project, Subcontractor, Contract, BudgetCategory } from '@/context/DataContext';

// Query keys for consistent caching
export const queryKeys = {
  projects: ['projects'] as const,
  contractors: ['contractors'] as const,
  contracts: ['contracts'] as const,
  paymentApplications: ['paymentApplications'] as const,
} as const;

// Projects queries
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Project[];
    },
  });
}

// Contractors queries
export function useContractors() {
  return useQuery({
    queryKey: queryKeys.contractors,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        trade: c.trade,
        contractAmount: c.contract_amount ?? 0,
        paidToDate: c.paid_to_date ?? 0,
        lastPayment: c.last_payment ?? '',
        status: c.status ?? 'active',
        changeOrdersPending: c.change_orders_pending ?? false,
        lineItemCount: c.line_item_count ?? 0,
        phone: c.phone ?? '',
        email: c.email ?? '',
        hasOpenPaymentApp: c.has_open_payment_app ?? false,
        compliance: {
          insurance: c.insurance_status ?? 'valid',
          license: c.license_status ?? 'valid'
        },
      })) as Subcontractor[];
    },
  });
}

// Contracts queries
export function useContracts() {
  return useQuery({
    queryKey: queryKeys.contracts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          projects (id, name, client_name),
          contractors (id, name, trade)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return data.map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        subcontractor_id: c.subcontractor_id,
        contract_amount: c.contract_amount,
        contract_nickname: c.contract_nickname,
        start_date: c.start_date,
        end_date: c.end_date,
        status: c.status ?? 'active',
        project: c.projects,
        subcontractor: c.contractors,
      })) as Contract[];
    },
  });
}

// Combined data query for efficiency
export function useAllData() {
  const projects = useProjects();
  const contractors = useContractors();
  const contracts = useContracts();

  return {
    projects: projects.data ?? [],
    contractors: contractors.data ?? [],
    contracts: contracts.data ?? [],
    isLoading: projects.isLoading || contractors.isLoading || contracts.isLoading,
    error: projects.error || contractors.error || contracts.error,
    refetch: () => {
      projects.refetch();
      contractors.refetch();
      contracts.refetch();
    }
  };
}

// Mutations
export function useAddProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: number }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useAddContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractor: Omit<Subcontractor, 'id'>) => {
      const { data, error } = await supabase
        .from('contractors')
        .insert([{
          name: contractor.name,
          trade: contractor.trade,
          phone: contractor.phone,
          email: contractor.email || null,
          contract_amount: contractor.contractAmount || 0,
          paid_to_date: contractor.paidToDate || 0,
          last_payment: contractor.lastPayment || null,
          status: contractor.status || 'active',
          change_orders_pending: contractor.changeOrdersPending || false,
          line_item_count: contractor.lineItemCount || 0,
          has_open_payment_app: contractor.hasOpenPaymentApp || false,
          insurance_status: contractor.compliance?.insurance || 'valid',
          license_status: contractor.compliance?.license || 'valid',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors });
    },
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts });
    },
  });
}