/**
 * useSubscription — derive subscription tier from the auth context user.
 *
 * Mirrors frontend/src/hooks/useSubscription.ts. Reads subscription_tier
 * from the /api/v1/auth/me response (included in UserResponse).
 * No additional API call required — piggybacks on AuthContext's user cache.
 */

import { useAuth } from '../context/AuthContext';

export type SubscriptionTier = 'free' | 'pro';

export function useSubscription() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const tier: SubscriptionTier =
    (user?.subscription_tier as SubscriptionTier) ?? 'free';
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
