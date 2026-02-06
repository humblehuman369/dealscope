'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { storeTokens, clearTokens, getAccessToken } from '../lib/api'

// ===========================================
// Types
// ===========================================

interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  created_at: string
  last_login?: string
  has_profile: boolean
  onboarding_completed: boolean
}

interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface RegisterResponse {
  id: string
  email: string
  full_name: string
  is_verified: boolean
  is_active: boolean
  verification_required?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  showAuthModal: 'login' | 'register' | null
  setShowAuthModal: (modal: 'login' | 'register' | null) => void
}

// ===========================================
// API Configuration
// ===========================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// ===========================================
// Context
// ===========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ===========================================
// Provider
// ===========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null)

  // Check for existing session on mount
  // With httpOnly cookies, we can't check the token directly
  // Instead, we try to fetch the current user
  useEffect(() => {
    const initAuth = async () => {
      try {
        await fetchCurrentUser()
      } catch (error) {
        // No valid session - this is normal for logged out users
        console.debug('No active session')
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Build headers with Authorization token if available
  const buildAuthHeaders = (token?: string): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const authToken = token || getAccessToken()
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }

  // Refresh access token using cookie or stored refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        credentials: 'include',
      })

      if (!response.ok) {
        setUser(null)
        clearTokens()
        return false
      }

      // Store new tokens from response body
      const data = await response.json()
      if (data.access_token && data.refresh_token) {
        storeTokens(data.access_token, data.refresh_token)
      }

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  // Fetch current user from API with automatic token refresh on 401
  const fetchCurrentUser = async (accessToken?: string) => {
    let response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: buildAuthHeaders(accessToken),
      credentials: 'include',
    })

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: buildAuthHeaders(),
          credentials: 'include',
        })
      }
    }

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    const userData = await response.json()
    setUser(userData)
  }

  // Login
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Receive and store httpOnly cookies
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }

      // Store tokens from response body for Authorization header fallback
      // (httpOnly cookies may not work cross-origin in development)
      const tokens: AuthTokens = await response.json()
      storeTokens(tokens.access_token, tokens.refresh_token)

      // Fetch user data using the access token
      await fetchCurrentUser(tokens.access_token)
      
      // Note: Modal closing is handled by the component after redirect
    } finally {
      setIsLoading(false)
    }
  }

  // Register
  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email, 
          password,
          full_name: fullName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Registration failed')
      }

      const registerData: RegisterResponse = await response.json()

      // Only auto-login if user is already verified (email verification not required)
      // If user is not verified, they need to verify email first
      if (registerData.is_verified) {
        await login(email, password)
      } else {
        // User needs to verify email - throw a specific message
        throw new Error('VERIFICATION_REQUIRED:Please check your email to verify your account before signing in.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Logout - calls backend to blacklist tokens and clear cookies
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        credentials: 'include', // Send cookies for auth, server will clear them
      })
    } catch (error) {
      // Best effort - still clear local state even if API call fails
      console.error('Logout API call failed:', error)
    }
    
    // Clear tokens and user state
    clearTokens()
    setUser(null)
  }, [])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      await fetchCurrentUser()
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [])

  // Check if user needs onboarding
  const needsOnboarding = !!user && !user.onboarding_completed

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding,
        login,
        register,
        logout,
        refreshUser,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ===========================================
// Hook
// ===========================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

