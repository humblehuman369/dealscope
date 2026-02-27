/**
 * useUsage — tracks analysis usage against plan limits.
 *
 * Fetches from GET /api/v1/billing/usage and exposes
 * the remaining count, progress bar value, and urgency state.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSession } from './useSession';

export interface UsageData {
  tier: string;
  searches_used: number;
  searches_limit: number;
  searches_remaining: number;
  properties_saved: number;
  properties_limit: number;
  properties_remaining: number;
  days_until_reset?: number;
}

export type UsageState = 'normal' | 'warning' | 'critical';

export function useUsage() {
  const { isAuthenticated } = useSession();

  const { data, isLoading } = useQuery<UsageData>({
    queryKey: ['billing', 'usage'],
    queryFn: () => api.get<UsageData>('/api/v1/billing/usage'),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });

  const used = data?.searches_used ?? 0;
  const limit = data?.searches_limit ?? 5;
  const remaining = data?.searches_remaining ?? (limit - used);
  const progressPct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  let state: UsageState = 'normal';
  if (remaining <= 0) state = 'critical';
  else if (remaining <= 1) state = 'warning';

  const savedUsed = data?.properties_saved ?? 0;
  const savedLimit = data?.properties_limit ?? 5;
  const savedRemaining = data?.properties_remaining ?? (savedLimit - savedUsed);

  return {
    usage: data ?? null,
    isLoading,
    searches: { used, limit, remaining, progressPct },
    saved: { used: savedUsed, limit: savedLimit, remaining: savedRemaining },
    state,
    isPro: data?.tier === 'pro',
    daysUntilReset: data?.days_until_reset ?? null,
  };
}
