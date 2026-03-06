import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface UsageData {
  searches_used: number;
  searches_limit: number;
  searches_remaining: number;
  properties_saved: number;
  properties_limit: number;
  days_until_reset: number;
  subscription_tier: string;
}

export function useUsage() {
  return useQuery<UsageData>({
    queryKey: ['billing', 'usage'],
    queryFn: async () => {
      const { data } = await api.get<UsageData>('/api/v1/billing/usage');
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRecordAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<UsageData>('/api/v1/billing/usage/record-analysis');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['billing', 'usage'], data);
    },
  });
}
