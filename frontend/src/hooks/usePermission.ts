'use client'

/**
 * usePermission — gate by access level: anonymous, free (logged-in), or pro.
 *
 * Use for component-level gating. Anonymous = always allowed. Free = must be
 * authenticated. Pro = must be authenticated and have active Pro subscription.
 *
 * Usage:
 *   const { canAccess, isLoading, requiredAction } = usePermission('pro')
 *   if (!canAccess) return <UpgradePrompt requiredAction={requiredAction} />
 */

import { useSession } from './useSession'
import { useSubscription } from './useSubscription'

export type PermissionLevel = 'anonymous' | 'free' | 'pro'

export type RequiredAction = 'login' | 'upgrade' | null

export function usePermission(level: PermissionLevel): {
  canAccess: boolean
  isLoading: boolean
  requiredAction: RequiredAction
} {
  const { isAuthenticated, isLoading: sessionLoading } = useSession()
  const { isPro, isLoading: subLoading } = useSubscription()

  const isLoading = sessionLoading || (level === 'pro' ? subLoading : false)

  if (level === 'anonymous') {
    return { canAccess: true, isLoading: false, requiredAction: null }
  }

  if (!isAuthenticated) {
    return {
      canAccess: false,
      isLoading,
      requiredAction: 'login',
    }
  }

  if (level === 'free') {
    return { canAccess: true, isLoading, requiredAction: null }
  }

  // level === 'pro'
  if (!isPro) {
    return {
      canAccess: false,
      isLoading,
      requiredAction: 'upgrade',
    }
  }

  return { canAccess: true, isLoading, requiredAction: null }
}
