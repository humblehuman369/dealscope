'use client'

/**
 * useSession — React Query based session management.
 *
 * Replaces AuthContext.  React Query cache is the single source of truth
 * for the current user.  No Context Provider is needed.
 *
 * An in-memory fallback (`_lastKnownUser`) prevents a brief cache miss
 * from triggering a redirect loop after login.  The value is set on
 * login success and cleared on logout.
 *
 * Usage:
 *   const { user, isLoading, isAuthenticated } = useSession()
 *   const login = useLogin()
 *   const logout = useLogout()
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  authApi,
  type UserResponse,
  type LoginResponse,
  type MFAChallengeResponse,
} from '@/lib/api-client'

// ------------------------------------------------------------------
// Query key
// ------------------------------------------------------------------
export const SESSION_QUERY_KEY = ['session', 'me'] as const

// ------------------------------------------------------------------
// In-memory fallback for user data.
//
// Survives React Query cache misses / refetch races that happen
// immediately after login (before cookies fully propagate).
// ------------------------------------------------------------------
let _lastKnownUser: UserResponse | null = null

/** Set the in-memory user fallback (called after login). */
export function setLastKnownUser(user: UserResponse | null) {
  _lastKnownUser = user
}

/** Read the in-memory user fallback. */
export function getLastKnownUser(): UserResponse | null {
  return _lastKnownUser
}

// ------------------------------------------------------------------
// useSession — reads current user from cache / API
// ------------------------------------------------------------------

export function useSession() {
  const { data: user, isLoading, error } = useQuery<UserResponse | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        const me = await authApi.me()
        if (me) {
          _lastKnownUser = me
        }
        return me
      } catch {
        // Don't clear _lastKnownUser on transient failures —
        // the dashboard layout uses it as a grace-period fallback.
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes — keep cache longer to survive navigations
    // Retry once on transient failures so a single network hiccup
    // doesn't immediately drop the session.
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    // Proactively refresh 1 minute before the 5-minute access token
    // expires, so the user never hits a stale-token gap.
    refetchInterval: 4 * 60 * 1000, // 4 minutes
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    needsOnboarding: !!user && !user.onboarding_completed,
    permissions: user?.permissions ?? [],
    roles: user?.roles ?? [],
    hasPermission: (perm: string) => user?.permissions?.includes(perm) ?? false,
    isAdmin: user?.roles?.includes('admin') || user?.roles?.includes('owner') || false,
  }
}

// ------------------------------------------------------------------
// useLogin
// ------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({
      email,
      password,
      rememberMe,
    }: {
      email: string
      password: string
      rememberMe?: boolean
    }) => {
      const result = await authApi.login(email, password, rememberMe)
      return result
    },
    onSuccess: (data) => {
      // If MFA is required, we don't update the cache yet
      if ('mfa_required' in data && data.mfa_required) {
        return
      }
      // Login success — set user in cache AND in-memory fallback
      const loginData = data as LoginResponse
      _lastKnownUser = loginData.user
      queryClient.setQueryData(SESSION_QUERY_KEY, loginData.user)
    },
  })
}

// ------------------------------------------------------------------
// useLoginMfa
// ------------------------------------------------------------------

export function useLoginMfa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      challengeToken,
      totpCode,
      rememberMe,
    }: {
      challengeToken: string
      totpCode: string
      rememberMe?: boolean
    }) => {
      return authApi.loginMfa(challengeToken, totpCode, rememberMe)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, data.user)
    },
  })
}

// ------------------------------------------------------------------
// useRegister
// ------------------------------------------------------------------

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
    }: {
      email: string
      password: string
      fullName: string
    }) => {
      return authApi.register(email, password, fullName)
    },
  })
}

// ------------------------------------------------------------------
// useLogout
// ------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        // Best effort
      }
    },
    onSettled: () => {
      _lastKnownUser = null
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      queryClient.clear()
      router.push('/')
    },
  })
}

// ------------------------------------------------------------------
// useRefreshUser — manually refresh user data
// ------------------------------------------------------------------

export function useRefreshUser() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
  }, [queryClient])
}
