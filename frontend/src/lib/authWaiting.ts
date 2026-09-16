/**
 * Same-tab / other-tab handoff after email verification.
 *
 * The "Check your email" screen sets a sessionStorage flag. The link
 * landing page uses that flag to decide whether to route through or
 * show "You're signed in — close this tab".
 */

import type { QueryClient } from '@tanstack/react-query'

import { SESSION_QUERY_KEY, setLastKnownUser, setLastTokenRefresh } from '@/hooks/useSession'
import { authApi, setMemoryToken, type VerifyEmailResponse } from '@/lib/api-client'

export const AUTH_CHANNEL_NAME = 'dealgapiq-auth'
export const AUTH_WAITING_KEY = 'dealgapiq-auth-waiting'
export const AUTH_POLL_MS = 3000
export const AUTH_POLL_MAX_MS = 15 * 60 * 1000

export type AuthChannelMessage = { type: 'signed-in' }

export function markAuthWaiting(): void {
  try {
    sessionStorage.setItem(AUTH_WAITING_KEY, '1')
  } catch {
    // Private mode / disabled storage — BroadcastChannel still works.
  }
}

export function isAuthWaitingInThisTab(): boolean {
  try {
    return sessionStorage.getItem(AUTH_WAITING_KEY) === '1'
  } catch {
    return false
  }
}

export function clearAuthWaiting(): void {
  try {
    sessionStorage.removeItem(AUTH_WAITING_KEY)
  } catch {
    // ignore
  }
}

export function postSignedIn(): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
  const message: AuthChannelMessage = { type: 'signed-in' }
  channel.postMessage(message)
  channel.close()
}

export async function applyVerifySession(
  result: VerifyEmailResponse,
  queryClient: QueryClient,
): Promise<boolean> {
  if (result.access_token) {
    setMemoryToken(result.access_token, result.refresh_token ?? undefined)
  }
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
  return Boolean(result.access_token)
}

export async function hydrateSessionFromCookies(queryClient: QueryClient): Promise<boolean> {
  try {
    const user = await authApi.me()
    if (!user) return false
    setLastKnownUser(user)
    setLastTokenRefresh()
    queryClient.setQueryData(SESSION_QUERY_KEY, user)
    return true
  } catch {
    return false
  }
}

export function safePostLoginPath(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/onboarding'
  return target
}
