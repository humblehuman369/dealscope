'use client'

/**
 * useSubscription — derive subscription tier from the session user.
 *
 * Reads `subscription_tier` from the `/api/v1/auth/me` response
 * (included in the UserResponse since the tier-gating update).
 * No additional API call required — piggybacks on useSession's cache.
 *
 * Usage:
 *   const { isPro, tier, isTrialing } = useSubscription()
 *   if (!isPro) showUpgradePrompt()
 */

import { useSession } from './useSession'

export type SubscriptionTier = 'free' | 'pro'

export function useSubscription() {
  const { user, isLoading, isAuthenticated } = useSession()

  const tier: SubscriptionTier = (user?.subscription_tier as SubscriptionTier) || 'free'
  const status = user?.subscription_status || 'active'
  const isPro = tier === 'pro'
  const isFree = tier === 'free'
  const isTrialing = status === 'trialing'

  return {
    tier,
    status,
    isPro,
    isFree,
    isTrialing,
    isLoading,
    isAuthenticated,
  }
}
