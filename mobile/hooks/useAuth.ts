/**
 * useAuth — unified hook for auth state + subscription tier.
 *
 * Wraps useSession; subscription comes from the same user object.
 * Mirrors the web frontend's useAuth hook.
 */

import { useSession } from './useSession';

export type SubscriptionTier = 'free' | 'pro';

export function useAuth() {
  const session = useSession();
  const subscriptionTier: SubscriptionTier =
    (session.user?.subscription_tier as SubscriptionTier) ?? 'free';
  const subscriptionStatus = session.user?.subscription_status ?? 'active';

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
  };
}
