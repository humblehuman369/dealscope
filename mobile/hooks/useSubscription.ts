import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as PurchasesService from '@/services/purchases';

interface SubscriptionState {
  isPro: boolean;
  isTrial: boolean;
  trialExpires: Date | null;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState & {
  refetch: () => void;
} {
  const { data: info, isLoading, refetch } = useQuery({
    queryKey: ['subscription-info'],
    queryFn: () => PurchasesService.getCustomerInfo(),
    staleTime: 60_000,
    retry: 1,
  });

  return {
    isPro: info ? PurchasesService.isPro(info) : false,
    isTrial: info ? PurchasesService.isTrialActive(info) : false,
    trialExpires: info ? PurchasesService.trialExpirationDate(info) : null,
    isLoading,
    refetch,
  };
}

export function useOfferings() {
  return useQuery({
    queryKey: ['offerings'],
    queryFn: () => PurchasesService.getOfferings(),
    staleTime: 5 * 60_000,
  });
}

export function usePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: any) => {
      return PurchasesService.purchasePackage(pkg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    },
  });
}

export function useRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PurchasesService.restorePurchases(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    },
  });
}
