'use client'

/**
 * AuthContext — compatibility wrapper around the new useSession hook.
 *
 * This file provides backward compatibility for existing pages that
 * import `useAuth` from '@/context/AuthContext'.  New code should use
 * `useSession` from '@/hooks/useSession' directly.
 *
 * The AuthProvider is now a no-op — state lives in React Query.
 */

import { createContext, useContext, useState, type ReactNode, useCallback } from 'react'
import {
  useSession,
  useLogin,
  useRegister,
  useLogout,
  useRefreshUser,
} from '@/hooks/useSession'

// ------------------------------------------------------------------
// Types (kept for compat)
// ------------------------------------------------------------------

interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  mfa_enabled?: boolean
  created_at: string
  last_login?: string
  has_profile: boolean
  onboarding_completed: boolean
  roles?: string[]
  permissions?: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  login: (email: string, password: string) => Promise<any>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => void
  showAuthModal: 'login' | 'register' | null
  setShowAuthModal: (modal: 'login' | 'register' | null) => void
  // Legacy compat
  isLoading: boolean
  error: string | null
  clearError: () => void
  loginMfa: (challengeToken: string, totpCode: string, rememberMe?: boolean) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // This provider is a thin wrapper — all state lives in React Query now.
  return <>{children}</>
}

export function useAuth(): AuthContextType {
  const session = useSession()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const logoutMutation = useLogout()
  const refreshUser = useRefreshUser()
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null)

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password })
      return result
    },
    [loginMutation],
  )

  const loginMfa = useCallback(
    async (challengeToken: string, totpCode: string, rememberMe = false) => {
      // Import inline to avoid circular deps
      const { authApi } = await import('@/lib/api-client')
      return authApi.loginMfa(challengeToken, totpCode, rememberMe)
    },
    [],
  )

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      await registerMutation.mutateAsync({ email, password, fullName })
    },
    [registerMutation],
  )

  const logout = useCallback(async () => {
    logoutMutation.mutate()
  }, [logoutMutation])

  const user = session.user
    ? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name || '',
        avatar_url: session.user.avatar_url || undefined,
        is_active: session.user.is_active,
        is_verified: session.user.is_verified,
        is_superuser: session.user.is_superuser,
        mfa_enabled: session.user.mfa_enabled,
        created_at: session.user.created_at,
        last_login: session.user.last_login || undefined,
        has_profile: session.user.has_profile,
        onboarding_completed: session.user.onboarding_completed,
        roles: session.user.roles,
        permissions: session.user.permissions,
      }
    : null

  return {
    user,
    isLoading: session.isLoading,
    isAuthenticated: session.isAuthenticated,
    needsOnboarding: session.needsOnboarding,
    login,
    loginMfa,
    register,
    logout,
    refreshUser,
    showAuthModal,
    setShowAuthModal,
    error: loginMutation.error?.message || registerMutation.error?.message || null,
    clearError: () => {
      loginMutation.reset()
      registerMutation.reset()
    },
  }
}
