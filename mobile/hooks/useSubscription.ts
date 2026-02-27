/**
 * useSubscription — unified subscription state with full edge-case coverage.
 *
 * Combines RevenueCat entitlement checks with the backend user tier.
 * Handles: trial, paid, grace period, cancelled-but-active, refund,
 * trial-expiring-soon, and billing retry states.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform, Alert, Linking } from 'react-native';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getDetailedSubscriptionStatus,
  isPaymentsInitialized,
  type DetailedSubscriptionStatus,
} from '@/services/payments';
import { useAuth } from './useAuth';
import { SESSION_QUERY_KEY } from './useSession';
import type { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';

export function useSubscription() {
  const { subscriptionTier } = useAuth();
  const qc = useQueryClient();

  // Detailed RevenueCat status
  const rcQuery = useQuery({
    queryKey: ['subscription', 'status'],
    queryFn: getDetailedSubscriptionStatus,
    enabled: isPaymentsInitialized(),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ['subscription', 'offerings'],
    queryFn: getOfferings,
    enabled: isPaymentsInitialized(),
    staleTime: 10 * 60 * 1000,
  });

  const rc = rcQuery.data;

  // Canonical Pro: backend tier OR RevenueCat entitlement (either is sufficient)
  const isPro = subscriptionTier === 'pro' || rc?.isPro === true;

  // Purchase
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

  // Restore
  const restoreMutation = useMutation({
    mutationFn: restorePurchases,
    onSuccess: (info) => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      const restored = !!info?.entitlements?.active?.['pro'];
      Alert.alert(
        restored ? 'Restored!' : 'No Purchases Found',
        restored
          ? 'Your Pro subscription has been restored.'
          : 'No previous purchases were found for this account. If you subscribed on another device, make sure you are signed in with the same Apple ID or Google account.',
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
    // Core state
    isPro,
    isLoading: rcQuery.isLoading,
    offerings: offeringsQuery.data ?? null,

    // Detailed status
    periodType: rc?.periodType ?? 'none',
    expiresDate: rc?.expiresDate ?? null,
    willRenew: rc?.willRenew ?? false,
    productId: rc?.productId ?? null,

    // Edge cases
    trialExpiringSoon: rc?.trialExpiringSoon ?? false,
    cancelledButActive: rc?.cancelledButActive ?? false,
    inGracePeriod: rc?.inGracePeriod ?? false,
    wasRefunded: rc?.wasRefunded ?? false,
    isTrial: rc?.periodType === 'trial',

    // Actions
    purchase,
    restore,
    manageSubscription,

    // Loading states
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
  };
}
