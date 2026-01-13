'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

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

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
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

  // Load user from stored token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          await fetchCurrentUser(token)
        } catch (error) {
          // Token expired or invalid - clear it
          console.error('Failed to restore session:', error)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Fetch current user from API
  const fetchCurrentUser = async (token: string) => {
    // #region agent log
    console.log('[DEBUG-F] fetchCurrentUser called');
    // #endregion
    
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // #region agent log
      console.log('[DEBUG-F] fetchCurrentUser FAILED', { status: response.status });
      // #endregion
      throw new Error('Failed to fetch user')
    }

    const userData = await response.json()
    // #region agent log
    console.log('[DEBUG-H] API /auth/me response', { onboarding_completed: userData.onboarding_completed, has_profile: userData.has_profile, fullData: userData });
    // #endregion
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
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }

      const tokens: AuthTokens = await response.json()
      
      // Store tokens
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)

      // Fetch user data
      await fetchCurrentUser(tokens.access_token)
      
      // Close modal
      setShowAuthModal(null)
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

      // Auto-login after registration
      await login(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      await fetchCurrentUser(token)
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

