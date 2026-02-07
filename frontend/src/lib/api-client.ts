/**
 * API Client — cookie-only authentication, zero JS token storage.
 *
 * Auth tokens are delivered exclusively via httpOnly cookies (web).
 * The client never reads or stores tokens in JS — eliminating XSS
 * token theft entirely.
 *
 * Features:
 * - Automatic 401 refresh with request queuing (no race conditions)
 * - CSRF double-submit cookie pattern
 * - credentials: 'include' on every request
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
}

class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// ------------------------------------------------------------------
// CSRF helper
// ------------------------------------------------------------------

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('csrf_token='))
  return match ? match.split('=')[1] : null
}

// ------------------------------------------------------------------
// Refresh queue — prevents multiple parallel refresh calls
// ------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      })
      return res.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ------------------------------------------------------------------
// Core request function
// ------------------------------------------------------------------

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Attach CSRF token on mutating requests
  if (method !== 'GET' && method !== 'DELETE') {
    const csrf = getCsrfToken()
    if (csrf) {
      requestHeaders['X-CSRF-Token'] = csrf
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  // 401 → try refresh once, then retry
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    } else {
      // Redirect to login
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        window.location.href = `/?auth=login&redirect=${encodeURIComponent(path)}`
      }
      throw new ApiError('Session expired', 401)
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new ApiError(
      errBody.detail || `API Error: ${response.status}`,
      response.status,
      errBody.code,
    )
  }

  return response.json()
}

// ------------------------------------------------------------------
// Auth-specific calls (used by useSession hook)
// ------------------------------------------------------------------

export const authApi = {
  me: () => apiRequest<UserResponse>('/api/v1/auth/me', { skipAuth: true }),

  login: (email: string, password: string, rememberMe = false) =>
    apiRequest<LoginResponse | MFAChallengeResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password, remember_me: rememberMe },
    }),

  loginMfa: (challengeToken: string, totpCode: string, rememberMe = false) =>
    apiRequest<LoginResponse>('/api/v1/auth/login/mfa', {
      method: 'POST',
      body: { challenge_token: challengeToken, totp_code: totpCode, remember_me: rememberMe },
    }),

  register: (email: string, password: string, fullName: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, full_name: fullName },
      skipAuth: true,
    }),

  logout: () =>
    apiRequest<{ message: string }>('/api/v1/auth/logout', { method: 'POST' }),

  refresh: () => refreshTokens(),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: { token, new_password: newPassword },
      skipAuth: true,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),

  verifyEmail: (token: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { token },
      skipAuth: true,
    }),

  // Sessions
  listSessions: () =>
    apiRequest<SessionInfo[]>('/api/v1/auth/sessions'),

  revokeSession: (sessionId: string) =>
    apiRequest<{ message: string }>(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  // MFA
  setupMfa: () =>
    apiRequest<MFASetupResponse>('/api/v1/auth/mfa/setup', { method: 'POST' }),

  verifyMfa: (totpCode: string) =>
    apiRequest<{ message: string }>('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: { totp_code: totpCode },
    }),

  disableMfa: () =>
    apiRequest<{ message: string }>('/api/v1/auth/mfa', { method: 'DELETE' }),
}

// ------------------------------------------------------------------
// General API (for non-auth endpoints)
// ------------------------------------------------------------------

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
}

// ------------------------------------------------------------------
// Shared types
// ------------------------------------------------------------------

export interface UserResponse {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  is_verified: boolean
  is_superuser: boolean
  mfa_enabled: boolean
  created_at: string
  last_login: string | null
  has_profile: boolean
  onboarding_completed: boolean
  roles: string[]
  permissions: string[]
}

export interface LoginResponse {
  user: UserResponse
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface MFAChallengeResponse {
  mfa_required: boolean
  challenge_token: string
}

export interface SessionInfo {
  id: string
  ip_address: string | null
  user_agent: string | null
  device_name: string | null
  last_active_at: string
  created_at: string
  is_current: boolean
}

export interface MFASetupResponse {
  secret: string
  provisioning_uri: string
}

export { ApiError }
export default api
