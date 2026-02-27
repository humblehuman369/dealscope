/**
 * useSubscription — React Query hook for subscription status + purchase actions.
 *
 * Combines RevenueCat entitlement checks with the backend user tier
 * for a unified subscription state. The backend is the canonical source
 * (it receives RevenueCat webhooks), but RevenueCat is checked for
 * real-time receipt validation.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform, Alert, Linking } from 'react-native';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getSubscriptionStatus,
  isPaymentsInitialized,
} from '@/services/payments';
import { useAuth } from './useAuth';
import { SESSION_QUERY_KEY } from './useSession';
import type { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';

export interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  expiresDate: string | null;
  willRenew: boolean;
}

export function useSubscription() {
  const { subscriptionTier } = useAuth();
  const qc = useQueryClient();

  // RevenueCat status (real-time check)
  const rcQuery = useQuery({
    queryKey: ['subscription', 'status'],
    queryFn: getSubscriptionStatus,
    enabled: isPaymentsInitialized(),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Offerings
  const offeringsQuery = useQuery({
    queryKey: ['subscription', 'offerings'],
    queryFn: getOfferings,
    enabled: isPaymentsInitialized(),
    staleTime: 10 * 60 * 1000,
  });

  // Canonical Pro status: backend tier OR RevenueCat entitlement
  const isPro = subscriptionTier === 'pro' || rcQuery.data?.isPro === true;

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const info = await purchasePackage(pkg);
      if (!info) throw new Error('Purchase cancelled');
      return info;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const info = await restorePurchases();
      return info;
    },
    onSuccess: (info) => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      const hasEntitlement = info?.entitlements?.active?.['pro'];
      Alert.alert(
        hasEntitlement ? 'Restored!' : 'No Purchases Found',
        hasEntitlement
          ? 'Your Pro subscription has been restored.'
          : 'No previous purchases were found for this account.',
      );
    },
  });

  const purchase = useCallback(
    (pkg: PurchasesPackage) => purchaseMutation.mutateAsync(pkg),
    [purchaseMutation],
  );

  const restore = useCallback(
    () => restoreMutation.mutateAsync(),
    [restoreMutation],
  );

  const manageSubscription = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }, []);

  return {
    isPro,
    isLoading: rcQuery.isLoading,
    offerings: offeringsQuery.data ?? null,
    expiresDate: rcQuery.data?.expiresDate ?? null,
    willRenew: rcQuery.data?.willRenew ?? false,
    purchase,
    restore,
    manageSubscription,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
  };
}
