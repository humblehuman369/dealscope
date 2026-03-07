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

import { API_BASE_URL, IS_CAPACITOR } from '@/lib/env'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/** Default request timeout: GET 30s, mutating 60s. Override via timeoutMs. */
const DEFAULT_GET_TIMEOUT_MS = 30_000
const DEFAULT_MUTATE_TIMEOUT_MS = 60_000

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  skipAuth?: boolean
  /** Try token refresh on 401 but don't hard-redirect if refresh fails. */
  softAuth?: boolean
  /** AbortSignal for request cancellation (e.g. debounced hooks). */
  signal?: AbortSignal
  /** Request timeout in ms. Defaults: GET 30s, mutating 60s. */
  timeoutMs?: number
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

/**
 * Extract a human-readable message from an error response body.
 * Handles FastAPI `{detail}`, Vercel/Railway proxy `{error}`, and other common shapes.
 */
function formatApiErrorDetail(detail: unknown, status: number, rawBody?: Record<string, unknown>): string {
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

  // Proxy error formats: { error: "Bad Gateway" } or { error: { message: "..." } }
  if (rawBody) {
    const err = rawBody.error
    if (typeof err === 'string') return err
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message?: string }).message
      if (typeof m === 'string') return m
    }
    const msg = rawBody.message
    if (typeof msg === 'string') return msg
  }

  if (status === 409) {
    return "This email is already registered. Sign in or use a different email."
  }
  return `Request failed (${status}). Please check your input and try again.`
}

// ------------------------------------------------------------------
// Token storage
//
// Web: Short-lived in-memory fallback (60s) — cookies are the
// primary auth mechanism. Memory token bridges the gap between
// login and cookie propagation.
//
// Capacitor: Persistent localStorage — cookies don't work cross-origin
// in the WebView, so Bearer tokens are the sole auth mechanism.
// ------------------------------------------------------------------

const CAP_ACCESS_KEY = 'dgiq_access_token'
const CAP_REFRESH_KEY = 'dgiq_refresh_token'

let _memoryToken: string | null = null
let _memoryTokenSetAt = 0
const MEMORY_TOKEN_TTL_MS = 60_000

/** Store the access token (called right after login). */
export function setMemoryToken(token: string, refreshToken?: string) {
  _memoryToken = token
  _memoryTokenSetAt = Date.now()
  if (IS_CAPACITOR && typeof localStorage !== 'undefined') {
    localStorage.setItem(CAP_ACCESS_KEY, token)
    if (refreshToken) localStorage.setItem(CAP_REFRESH_KEY, refreshToken)
  }
}

/** Read the access token. */
function getMemoryToken(): string | null {
  if (IS_CAPACITOR && typeof localStorage !== 'undefined') {
    return localStorage.getItem(CAP_ACCESS_KEY)
  }
  if (!_memoryToken) return null
  if (Date.now() - _memoryTokenSetAt > MEMORY_TOKEN_TTL_MS) {
    _memoryToken = null
    return null
  }
  return _memoryToken
}

/** Read the refresh token (Capacitor only). */
function getStoredRefreshToken(): string | null {
  if (IS_CAPACITOR && typeof localStorage !== 'undefined') {
    return localStorage.getItem(CAP_REFRESH_KEY)
  }
  return null
}

/** Clear all stored tokens (called on logout). */
export function clearMemoryToken() {
  _memoryToken = null
  if (IS_CAPACITOR && typeof localStorage !== 'undefined') {
    localStorage.removeItem(CAP_ACCESS_KEY)
    localStorage.removeItem(CAP_REFRESH_KEY)
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
      const storedRefresh = getStoredRefreshToken()
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: IS_CAPACITOR ? 'omit' : 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(IS_CAPACITOR && storedRefresh
            ? { Authorization: `Bearer ${storedRefresh}` }
            : {}),
        },
        ...(IS_CAPACITOR && storedRefresh
          ? { body: JSON.stringify({ refresh_token: storedRefresh }) }
          : {}),
      })
      if (res.ok) {
        try {
          const body = await res.json()
          if (body.access_token) {
            setMemoryToken(body.access_token, body.refresh_token)
          }
        } catch {
          // Token still set via cookie; memory replenishment is best-effort
        }
        return true
      }
      if (IS_CAPACITOR) clearMemoryToken()
      return false
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

function runWithTimeout<T>(
  timeoutMs: number,
  signal: AbortSignal | undefined,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId)
      return Promise.reject(new ApiError('Request aborted.', 0))
    }
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId)
        controller.abort()
      },
      { once: true },
    )
  }
  return fn(controller.signal).finally(() => clearTimeout(timeoutId))
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false, softAuth = false, signal, timeoutMs } = options
  const timeout =
    timeoutMs ?? (method === 'GET' ? DEFAULT_GET_TIMEOUT_MS : DEFAULT_MUTATE_TIMEOUT_MS)

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

  const doFetch = async (requestSignal: AbortSignal): Promise<Response> => {
    const config: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: IS_CAPACITOR ? 'omit' : 'include',
      signal: requestSignal,
    }
    if (body !== undefined) {
      config.body = JSON.stringify(body)
    }
    return fetch(`${API_BASE_URL}${endpoint}`, config)
  }

  let response: Response
  try {
    response = await runWithTimeout(timeout, signal, doFetch)
  } catch (err) {
    if (err instanceof ApiError) throw err
    const isAbort = err instanceof Error && err.name === 'AbortError'
    throw new ApiError(
      isAbort ? 'Request timed out. Please try again.' : (err as Error).message || 'Request failed.',
      0,
    )
  }

  // 401 → try a silent token refresh, then retry with fresh headers.
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      const retryHeaders: Record<string, string> = { ...requestHeaders }
      const freshToken = getMemoryToken()
      if (freshToken) {
        retryHeaders['Authorization'] = `Bearer ${freshToken}`
      }
      try {
        response = await runWithTimeout(timeout, signal, async (requestSignal) => {
          const retryConfig: RequestInit = {
            method,
            headers: retryHeaders,
            credentials: IS_CAPACITOR ? 'omit' : 'include',
            signal: requestSignal,
          }
          if (body !== undefined) {
            retryConfig.body = JSON.stringify(body)
          }
          return fetch(`${API_BASE_URL}${endpoint}`, retryConfig)
        })
      } catch (err) {
        if (err instanceof ApiError) throw err
        const isAbort = err instanceof Error && err.name === 'AbortError'
        throw new ApiError(
          isAbort ? 'Request timed out. Please try again.' : (err as Error).message || 'Request failed.',
          0,
        )
      }
    }
  }

  if (!response.ok) {
    const text = await response.text()
    let errBody: Record<string, unknown>
    try {
      errBody = text.length ? JSON.parse(text) : {}
    } catch {
      const status = response.status
      if (status >= 500) console.error(`[API ${status}] ${endpoint} — raw body:`, text.slice(0, 500))
      const fallback =
        status >= 500
          ? `Server error (${status}). Please try again in a moment.`
          :       status === 404
            ? `Backend returned 404 (Not Found). Check that NEXT_PUBLIC_API_URL points to your running backend and that the API route exists.`
            : `Request failed (${status}). Please try again.`
      throw new ApiError(fallback, status)
    }
    if (response.status >= 500) console.error(`[API ${response.status}] ${endpoint}`, errBody)
    const message = formatApiErrorDetail(errBody.detail, response.status, errBody)
    throw new ApiError(message, response.status, errBody.code as string | undefined)
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
    if ('access_token' in result && result.access_token) {
      setMemoryToken(result.access_token, (result as LoginResponse).refresh_token)
    }
    return result
  },

  loginMfa: async (challengeToken: string, totpCode: string, rememberMe = false) => {
    const result = await apiRequest<LoginResponse>('/api/v1/auth/login/mfa', {
      method: 'POST',
      body: { challenge_token: challengeToken, totp_code: totpCode, remember_me: rememberMe },
    })
    if (result.access_token) {
      setMemoryToken(result.access_token, result.refresh_token)
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
  get: <T>(endpoint: string, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth' | 'timeoutMs'>) =>
    apiRequest<T>(endpoint, opts),
  post: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth' | 'timeoutMs'>) =>
    apiRequest<T>(endpoint, { method: 'POST', body, ...opts }),
  put: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth' | 'timeoutMs'>) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, ...opts }),
  patch: <T>(endpoint: string, body?: unknown, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth' | 'timeoutMs'>) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, ...opts }),
  delete: <T>(endpoint: string, opts?: Pick<RequestOptions, 'signal' | 'headers' | 'skipAuth' | 'softAuth' | 'timeoutMs'>) =>
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
