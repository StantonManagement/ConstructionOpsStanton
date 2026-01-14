import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface FundingSource {
  id: string;
  name: string;
  type: string;
  commitment_amount: number;
  drawn_amount: number;
  remaining: number;
  eligible_to_draw: number;
  lender_name?: string;
  interest_rate?: number;
  maturity_date?: string;
}

interface Portfolio {
  id: string;
  name: string;
  code: string;
  funding_sources: FundingSource[];
  totals: {
    commitment: number;
    drawn: number;
    remaining: number;
    eligible: number;
  };
}

interface CashPositionResponse {
  portfolios: Portfolio[];
}

export function useCashPosition(portfolioId?: string) {
  return useQuery<CashPositionResponse>({
    queryKey: ['cash-position', portfolioId],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const url = portfolioId 
        ? `/api/cash-position?portfolio_id=${portfolioId}`
        : '/api/cash-position';
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch cash position');
      return res.json();
    },
  });
}
