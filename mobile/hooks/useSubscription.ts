import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useSession } from './useSession';

export type SubscriptionTier = 'free' | 'pro';

interface UsageInfo {
  searches_used: number;
  searches_limit: number;
  period_start: string;
  period_end: string;
}

/**
 * Derives subscription info from the session user — no additional API call.
 * Mirrors frontend/src/hooks/useSubscription.ts.
 */
export function useSubscription() {
  const { user, isLoading, isAuthenticated } = useSession();

  const tier: SubscriptionTier = (user?.subscription_tier as SubscriptionTier) ?? 'free';
  const status = user?.subscription_status ?? 'active';
  const isPro = tier === 'pro';
  const isFree = tier === 'free';
  const isTrialing = status === 'trialing';

  return {
    tier,
    status,
    isPro,
    isFree,
    isTrialing,
    isLoading,
    isAuthenticated,
  };
}

export function useUsage() {
  return useQuery<UsageInfo>({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await api.get<UsageInfo>('/api/v1/billing/usage');
      return data;
    },
    staleTime: 30_000,
  });
}
