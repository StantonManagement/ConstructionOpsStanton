import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface PaymentApplication {
  id: string;
  project_id: string;
  contractor_id: string;
  application_number: number;
  period_to: string;
  period_from: string;
  status: string;
  total_completed_and_stored: number;
  retainage_percent: number;
  amount_due: number;
  created_at: string;
  updated_at: string;
}

async function fetchPaymentApplications(): Promise<PaymentApplication[]> {
  const { data, error } = await supabase
    .from('payment_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[usePaymentApplications] Error fetching payment applications:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export function usePaymentApplications() {
  return useQuery({
    queryKey: ['payment-applications'],
    queryFn: fetchPaymentApplications,
    staleTime: 30 * 1000, // 30 seconds
  });
}

