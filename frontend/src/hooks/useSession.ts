'use client'

/**
 * useSession — React Query based session management.
 *
 * React Query cache is the single source of truth for the current user.
 * No Context Provider is needed.
 *
 * Persistence strategy (layered, most-durable first):
 *   1. localStorage indicator — survives page refresh / new tab
 *   2. In-memory fallback     — survives React Query cache misses
 *   3. React Query cache      — authoritative after /me resolves
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
// localStorage session indicator
//
// Persists a lightweight snapshot (no tokens) so that after a page
// refresh or new-tab open we can render an "authenticated" placeholder
// immediately, avoiding a flash of login prompts while /me resolves.
// ------------------------------------------------------------------
const SESSION_STORAGE_KEY = 'dgiq_session'
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours — well within session TTL

interface PersistedSession {
  id: string
  email: string
  full_name: string | null
  subscription_tier: 'free' | 'pro'
  subscription_status: string
  roles: string[]
  permissions: string[]
  is_superuser: boolean
  onboarding_completed: boolean
  ts: number
}

function persistSession(user: UserResponse): void {
  try {
    const data: PersistedSession = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status,
      roles: user.roles ?? [],
      permissions: user.permissions ?? [],
      is_superuser: user.is_superuser,
      onboarding_completed: user.onboarding_completed,
      ts: Date.now(),
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (SSR, private browsing quota) — silent
  }
}

function readPersistedSession(): UserResponse | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const data: PersistedSession = JSON.parse(raw)
    if (Date.now() - data.ts > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: null,
      is_active: true,
      is_verified: true,
      is_superuser: data.is_superuser,
      mfa_enabled: false,
      created_at: '',
      last_login: null,
      has_profile: true,
      onboarding_completed: data.onboarding_completed,
      roles: data.roles,
      permissions: data.permissions,
      subscription_tier: data.subscription_tier,
      subscription_status: data.subscription_status,
    } satisfies UserResponse
  } catch {
    return null
  }
}

function clearPersistedSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // silent
  }
}

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
  if (user) persistSession(user)
  else clearPersistedSession()
}

/** Read the in-memory user fallback. */
export function getLastKnownUser(): UserResponse | null {
  if (_lastKnownUser) return _lastKnownUser
  return readPersistedSession()
}

// ------------------------------------------------------------------
// Proactive token refresh
// ------------------------------------------------------------------
const JWT_LIFETIME_MS = 5 * 60 * 1000
const REFRESH_BUFFER_MS = 90 * 1000

let _lastTokenRefreshAt = 0

function setLastTokenRefresh() {
  _lastTokenRefreshAt = Date.now()
}

function shouldProactivelyRefresh(): boolean {
  if (_lastTokenRefreshAt === 0) return false
  const elapsed = Date.now() - _lastTokenRefreshAt
  return elapsed >= JWT_LIFETIME_MS - REFRESH_BUFFER_MS
}

// ------------------------------------------------------------------
// useSession — reads current user from cache / API
// ------------------------------------------------------------------

export function useSession() {
  const { data: user, isLoading } = useQuery<UserResponse | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        // Proactively refresh the access token before it expires so
        // the /me call never hits a 401 unnecessarily.
        if (shouldProactivelyRefresh()) {
          const refreshed = await authApi.refresh()
          if (refreshed) setLastTokenRefresh()
        }

        const me = await authApi.me()
        if (me) {
          _lastKnownUser = me
          persistSession(me)
        }
        return me
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: () => getLastKnownUser(),
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 3.5 * 60 * 1000, // 3.5 min — ensures refresh before 5-min JWT expiry
  })

  const effectiveUser = user ?? getLastKnownUser()

  return {
    user: effectiveUser ?? null,
    isLoading,
    isAuthenticated: !!effectiveUser,
    needsOnboarding: !!effectiveUser && !effectiveUser.onboarding_completed,
    permissions: effectiveUser?.permissions ?? [],
    roles: effectiveUser?.roles ?? [],
    hasPermission: (perm: string) => effectiveUser?.permissions?.includes(perm) ?? false,
    isAdmin: effectiveUser?.roles?.includes('admin') || effectiveUser?.roles?.includes('owner') || effectiveUser?.is_superuser || false,
  }
}

// ------------------------------------------------------------------
// useLogin
// ------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient()

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
      if ('mfa_required' in data && data.mfa_required) {
        return
      }
      const loginData = data as LoginResponse
      _lastKnownUser = loginData.user
      persistSession(loginData.user)
      setLastTokenRefresh()
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
      _lastKnownUser = data.user
      persistSession(data.user)
      setLastTokenRefresh()
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
      clearPersistedSession()
      _lastTokenRefreshAt = 0
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
