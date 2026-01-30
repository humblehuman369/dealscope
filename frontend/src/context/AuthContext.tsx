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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initAuth:start',message:'Auth initialization starting',data:{hasWindow:typeof window!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
      try {
        const token = localStorage.getItem('access_token')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initAuth:tokenCheck',message:'Token check',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
        // #endregion
        if (token) {
          try {
            await fetchCurrentUser(token)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initAuth:userFetched',message:'User fetched successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
            // #endregion
          } catch (error) {
            // Token expired or invalid - clear it
            console.error('Failed to restore session:', error)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initAuth:fetchError',message:'Failed to restore session',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
            // #endregion
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
        }
        setIsLoading(false)
      } catch (outerError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:initAuth:outerError',message:'Outer error in initAuth',data:{error:String(outerError)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
        // #endregion
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Refresh access token using refresh token
  const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        // Refresh token is invalid - clear auth data
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
        return null
      }

      const tokens: AuthTokens = await response.json()
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      return tokens.access_token
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    }
  }

  // Fetch current user from API with automatic token refresh on 401
  const fetchCurrentUser = async (token: string) => {
    let response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
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

