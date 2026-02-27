/**
 * useStrategyData — fetches worksheet calculation for a specific strategy.
 *
 * Calls the strategy-specific worksheet endpoint (e.g. /api/v1/worksheet/ltr/calculate)
 * and returns the financial analysis results.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { WORKSHEET_ENDPOINTS, type StrategyId } from '@dealscope/shared';

interface WorksheetParams {
  address: string;
  list_price?: number;
  monthly_rent?: number;
  property_taxes?: number;
  insurance?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
}

export function useStrategyData(
  strategyId: StrategyId | null,
  params: WorksheetParams | null,
) {
  return useQuery<Record<string, unknown>>({
    queryKey: ['worksheet', strategyId, params?.address],
    queryFn: async () => {
      if (!strategyId || !params) throw new Error('Missing params');
      const endpoint = WORKSHEET_ENDPOINTS[strategyId];
      return api.post<Record<string, unknown>>(endpoint, params);
    },
    enabled: !!strategyId && !!params?.address,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
