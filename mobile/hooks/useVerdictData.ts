/**
 * useVerdictData — fetches verdict analysis for a property.
 *
 * Calls POST /api/v1/analysis/verdict with the property address
 * and returns the verdict score, component scores, and strategy grades.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface VerdictComponentScores {
  deal_gap: number;
  return_quality: number;
  market_alignment: number;
  deal_probability: number;
}

export interface StrategyGrade {
  strategy: string;
  grade: string;
  score: number;
  key_metric_label: string;
  key_metric_value: string;
  viable: boolean;
}

export interface VerdictData {
  score: number;
  verdict_label: string;
  verdict_description: string;
  component_scores: VerdictComponentScores;
  deal_gap_percent: number;
  deal_gap_zone: string;
  income_value: number;
  target_buy_price: number;
  wholesale_price: number;
  cap_rate: number;
  cash_on_cash: number;
  dscr: number;
  monthly_cash_flow: number;
  annual_noi: number;
  cash_needed: number;
  strategy_grades: StrategyGrade[];
}

export function useVerdictData(address: string | undefined) {
  return useQuery<VerdictData>({
    queryKey: ['verdict', address],
    queryFn: async () => {
      return api.post<VerdictData>('/api/v1/analysis/verdict', { address });
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
