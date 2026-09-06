/**
 * Apply tokens from POST /plans/claim the same way /auth/magic does:
 * memory token first (Capacitor + cookie-propagation races), then /me.
 */

import type { QueryClient } from '@tanstack/react-query'

import { SESSION_QUERY_KEY, setLastKnownUser, setLastTokenRefresh } from '@/hooks/useSession'
import { authApi, setMemoryToken } from '@/lib/api-client'
import type { PlanClaimResponse } from '@/lib/api/plans'

export async function applyPlanClaimSession(
  result: PlanClaimResponse,
  queryClient: QueryClient,
): Promise<boolean> {
  if (!result.access_token) return false
  setMemoryToken(result.access_token, result.refresh_token ?? undefined)
  setLastTokenRefresh()
  try {
    const user = await authApi.me()
    if (user) {
      setLastKnownUser(user)
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
    }
  } catch {
    // Cookies are set; the session query will pick them up on the next screen.
  }
  void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  return true
}
