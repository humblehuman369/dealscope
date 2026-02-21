'use client'

/**
 * useAuth — single hook for auth state and subscription tier.
 *
 * Wraps useSession; subscription comes from the same user object (single source of truth).
 * Use this when you need isAuthenticated, user, and tier in one place.
 *
 * Usage:
 *   const { isAuthenticated, user, subscriptionTier, isLoading } = useAuth()
 */

import { useSession } from './useSession'
import type { SubscriptionTier } from './useSubscription'

export function useAuth() {
  const session = useSession()
  const subscriptionTier: SubscriptionTier =
    (session.user?.subscription_tier as SubscriptionTier) || 'free'
  const subscriptionStatus = session.user?.subscription_status ?? 'active'

  return {
    user: session.user,
    isAuthenticated: session.isAuthenticated,
    isLoading: session.isLoading,
    subscriptionTier,
    subscriptionStatus,
    needsOnboarding: session.needsOnboarding,
    permissions: session.permissions,
    roles: session.roles,
    hasPermission: session.hasPermission,
    isAdmin: session.isAdmin,
  }
}
