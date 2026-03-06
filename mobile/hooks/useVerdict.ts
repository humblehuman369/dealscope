import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface VerdictAnalysis {
  deal_score: number;
  deal_verdict: string;
  verdict_description: string;
  discount_percent: number;
  purchase_price: number;
  income_value: number;
  list_price: number;
  income_gap_percent: number;
  income_gap_amount: number;
  deal_gap_percent: number;
  deal_gap_amount: number;
  deal_narrative: string;
  discount_bracket_label: string;
  wholesale_price?: number;
  strategies: Record<string, StrategyResult>;
  deal_factors: DealFactor[];
  opportunity_factors?: OpportunityFactors;
  return_factors?: ReturnFactors;
  component_scores?: Record<string, number>;
}

export interface StrategyResult {
  strategy_id: string;
  strategy_name: string;
  deal_score: number;
  verdict: string;
  monthly_cash_flow: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  annual_noi: number;
  cash_needed: number;
  total_roi_5yr?: number;
  annual_roi?: number;
}

export interface DealFactor {
  label: string;
  value: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface OpportunityFactors {
  deal_gap: number;
  motivation: number;
  motivation_label: string;
  days_on_market: number;
  buyer_market: boolean;
  distressed_sale: boolean;
}

export interface ReturnFactors {
  capRate: number;
  cashOnCash: number;
  dscr: number;
  annualRoi: number;
  annualProfit: number;
}

export function useVerdict(address: string | undefined) {
  return useQuery<VerdictAnalysis>({
    queryKey: ['verdict', address],
    queryFn: async () => {
      const { data } = await api.post<VerdictAnalysis>('/api/v1/analysis/verdict', {
        address,
      });
      return data;
    },
    enabled: !!address,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
