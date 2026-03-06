import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface SubscriptionInfo {
  tier: string;
  status: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface UsageInfo {
  searches_used: number;
  searches_limit: number;
  period_start: string;
  period_end: string;
}

export function useSubscription() {
  return useQuery<SubscriptionInfo>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionInfo>('/api/v1/billing/subscription');
      return data;
    },
    staleTime: 60_000,
    retry: false,
  });
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
