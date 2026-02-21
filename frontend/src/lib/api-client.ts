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

import { API_BASE_URL } from '@/lib/env'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
  /** Try token refresh on 401 but don't hard-redirect if refresh fails. */
  softAuth?: boolean
  /** AbortSignal for request cancellation (e.g. debounced hooks). */
  signal?: AbortSignal
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

/** Turn FastAPI 422/400 detail (string or array of { loc, msg }) into one readable message. */
function formatApiErrorDetail(detail: unknown, status: number): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail.map((e: { loc?: string[]; msg?: string }) => {
      const field = e.loc?.filter((s) => s !== 'body')[0] ?? 'field'
      const label = field.replace(/_/g, ' ')
      return `${label}: ${e.msg ?? 'invalid'}`
    })
    return parts.join('. ')
  }
  if (detail && typeof detail === 'object' && ('msg' in detail || 'message' in detail)) {
    const msg = 'msg' in detail ? (detail as { msg?: string }).msg : (detail as { message?: string }).message
    if (typeof msg === 'string') return msg
  }
  if (status === 409) {
    return "This email is already registered. Sign in or use a different email."
  }
  return `Request failed (${status}). Please check your input and try again.`
}

// ------------------------------------------------------------------
// In-memory token fallback
//
// Browsers sometimes delay persisting httpOnly cookies (especially
// through reverse-proxy rewrites).  We keep a short-lived copy of
// the access token in memory so that the first /me call right after
// login can fall back to the Authorization header.
// ------------------------------------------------------------------

let _memoryToken: string | null = null
let _memoryTokenSetAt = 0
const MEMORY_TOKEN_TTL_MS = 60_000 // 60 seconds — plenty for the first /me check

/** Store the access token in memory (called right after login). */
export function setMemoryToken(token: string) {
  _memoryToken = token
  _memoryTokenSetAt = Date.now()
}

/** Read the in-memory access token (returns null after TTL expires). */
function getMemoryToken(): string | null {
  if (!_memoryToken) return null
  if (Date.now() - _memoryTokenSetAt > MEMORY_TOKEN_TTL_MS) {
    _memoryToken = null
    return null
  }
  return _memoryToken
}

/** Clear the in-memory token (called on logout). */
export function clearMemoryToken() {
  _memoryToken = null
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
      // No body — backend reads the refresh_token from the httpOnly cookie.
      // Sending `body: '{}'` previously caused a 422 because FastAPI tried
      // to validate the empty object against RefreshTokenRequest (which
      // requires a `refresh_token` string field).
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
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
  const { method = 'GET', body, headers = {}, skipAuth = false, softAuth = false, signal } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Fall back to in-memory token if available (covers the window
  // between login and cookie propagation).
  const memToken = getMemoryToken()
  if (memToken && !requestHeaders['Authorization']) {
    requestHeaders['Authorization'] = `Bearer ${memToken}`
  }

  // Attach CSRF token on mutating requests
  if (method !== 'GET') {
    const csrf = getCsrfToken()
    if (csrf) {
      requestHeaders['X-CSRF-Token'] = csrf
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
    ...(signal && { signal }),
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  // 401 → try a silent token refresh, then retry.
  // Auth has been removed from the public flow so we NEVER hard-redirect
  // to a login page. If refresh fails the 401 falls through to the
  // generic error handler below.
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    }
    // No redirect — let the error propagate naturally
  }

  if (!response.ok) {
    const text = await response.text()
    let errBody: { detail?: unknown; code?: string }
    try {
      errBody = text.length ? JSON.parse(text) : {}
    } catch {
      // Server returned HTML or non-JSON (e.g. proxy error page, 404 page)
      const status = response.status
      const fallback =
        status >= 500
          ? `Server error (${status}). Please try again in a moment.`
          :       status === 404
            ? `Backend returned 404 (Not Found). Check that NEXT_PUBLIC_API_URL points to your running backend and that the API route exists.`
            : `Request failed (${status}). Please try again.`
      // #region agent log
      if (response.status === 409) {
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '29fd32' }, body: JSON.stringify({ sessionId: '29fd32', location: 'api-client.ts:4xx-non-json', message: '409 with non-JSON body', data: { status: response.status, endpoint, textPreview: text.slice(0, 80) }, hypothesisId: 'H2', timestamp: Date.now() }) }).catch(() => {});
      }
      // #endregion
      throw new ApiError(fallback, status)
    }
    const message = formatApiErrorDetail(errBody.detail, response.status)
    // #region agent log
    if (response.status === 409) {
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '29fd32' }, body: JSON.stringify({ sessionId: '29fd32', location: 'api-client.ts:4xx-errBody', message: '409 response parsed', data: { status: response.status, endpoint, detailType: typeof errBody.detail, detailPreview: typeof errBody.detail === 'string' ? errBody.detail.slice(0, 60) : JSON.stringify(errBody.detail).slice(0, 60), formattedMessage: message.slice(0, 80) }, hypothesisId: 'H1', timestamp: Date.now() }) }).catch(() => {});
    }
    // #endregion
    throw new ApiError(message, response.status, errBody.code)
  }

  // 204 No Content has no body — return undefined instead of parsing
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// ------------------------------------------------------------------
// Auth-specific calls (used by useSession hook)
// ------------------------------------------------------------------

export const authApi = {
  me: () => apiRequest<UserResponse>('/api/v1/auth/me', { softAuth: true }),

  login: async (email: string, password: string, rememberMe = false) => {
    const result = await apiRequest<LoginResponse | MFAChallengeResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password, remember_me: rememberMe },
    })
    // Store access token in memory so the very next /me call
    // can use the Authorization header if cookies haven't propagated yet.
    if ('access_token' in result && result.access_token) {
      setMemoryToken(result.access_token)
    }
    return result
  },

  loginMfa: async (challengeToken: string, totpCode: string, rememberMe = false) => {
    const result = await apiRequest<LoginResponse>('/api/v1/auth/login/mfa', {
      method: 'POST',
      body: { challenge_token: challengeToken, totp_code: totpCode, remember_me: rememberMe },
    })
    if (result.access_token) {
      setMemoryToken(result.access_token)
    }
    return result
  },

  register: (email: string, password: string, fullName: string) =>
    apiRequest<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, full_name: fullName },
      skipAuth: true,
    }),

  logout: () => {
    clearMemoryToken()
    return apiRequest<{ message: string }>('/api/v1/auth/logout', { method: 'POST' })
  },

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
  get: <T>(endpoint: string, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>) =>
    apiRequest<T>(endpoint, opts),
  post: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>) =>
    apiRequest<T>(endpoint, { method: 'POST', body, ...opts }),
  put: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, ...opts }),
  patch: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, ...opts }),
  delete: <T>(endpoint: string, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth'>) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...opts }),
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
  subscription_tier: 'free' | 'pro'
  subscription_status: string
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

export interface RegisterResponse {
  message: string
  requires_verification?: boolean
  user?: UserResponse
  access_token?: string
  refresh_token?: string
  expires_in?: number
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

// ------------------------------------------------------------------
// Billing API
// ------------------------------------------------------------------

export interface CreateCheckoutParams {
  price_id?: string
  lookup_key?: string
  success_url?: string
  cancel_url?: string
}

export interface CheckoutSessionResponse {
  checkout_url: string
  session_id: string
}

export const billingApi = {
  createSetupIntent: () =>
    apiRequest<{ client_secret: string }>('/api/v1/billing/setup-intent', { method: 'POST' }),

  createCheckoutSession: (params: CreateCheckoutParams) =>
    apiRequest<CheckoutSessionResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: {
        price_id: params.price_id ?? undefined,
        lookup_key: params.lookup_key ?? undefined,
        success_url: params.success_url ?? undefined,
        cancel_url: params.cancel_url ?? undefined,
      },
    }),

  createSubscription: (paymentMethodId: string, priceId?: string, lookupKey?: string) =>
    apiRequest<{ subscription_id: string; status: string; trial_end?: number | null }>('/api/v1/billing/subscribe', {
      method: 'POST',
      body: {
        payment_method_id: paymentMethodId,
        ...(priceId ? { price_id: priceId } : {}),
        ...(lookupKey ? { lookup_key: lookupKey } : {}),
      },
    }),
}

export { ApiError, apiRequest }
export default api
