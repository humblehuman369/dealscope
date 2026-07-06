/**
 * Comps API HTTP client — single place for comps requests.
 *
 * Calls the backend comps endpoints (/api/v1/similar-sold, /api/v1/similar-rent).
 * Delegates each request to the shared authenticated `apiRequest` client so
 * comps use the exact same auth as the rest of the app: Bearer token on
 * Capacitor (cookies don't work in the WebView) and cookies with a silent
 * 401 refresh-and-retry on web. A raw fetch here previously sent no auth at
 * all on mobile and treated the expired-cookie 401 as fatal on web, which
 * made the entire Comps feature error out.
 *
 * Adds comps-specific retry (502/503/504 and network errors), timeout, abort,
 * and error normalization. NEVER throws — always returns a typed response for
 * UI handling.
 */

import { apiRequest, ApiError } from '@/lib/api-client'

export interface AxessoClientConfig {
  defaultTimeout: number
  maxRetries: number
  retryableStatuses: number[]
}

export interface AxessoResponse<T> {
  ok: boolean
  data: T | null
  status: number
  error: string | null
  attempts: number
  durationMs: number
}

const DEFAULT_CONFIG: AxessoClientConfig = {
  defaultTimeout: 15_000,
  maxRetries: 3,
  retryableStatuses: [502, 503, 504],
}

function buildPath(endpoint: string, params: Record<string, string>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.append(k, v)
  })
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

function logAttempt(
  endpoint: string,
  params: Record<string, string>,
  attempt: number,
  status: number,
  durationMs: number,
  error: string | null,
): void {
  const payload = {
    endpoint,
    params,
    attempt,
    status,
    durationMs,
    error,
    timestamp: new Date().toISOString(),
  }
  if (status >= 200 && status < 300) {
    console.log('[comps_api]', payload)
  } else {
    console.warn('[comps_api]', payload)
  }
}

/**
 * GET request with retry, timeout, and normalized response.
 * Never throws — always returns AxessoResponse<T>.
 */
export async function axessoGet<T>(
  endpoint: string,
  params: Record<string, string>,
  config?: Partial<AxessoClientConfig>,
  signal?: AbortSignal,
): Promise<AxessoResponse<T>> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const path = buildPath(endpoint, params)

  const startTotal = performance.now()
  let lastStatus = 0
  let lastError: string | null = null

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    if (signal?.aborted) {
      return {
        ok: false,
        data: null,
        status: 0,
        error: 'Request aborted',
        attempts: attempt - 1,
        durationMs: Math.round(performance.now() - startTotal),
      }
    }

    const start = performance.now()
    try {
      // apiRequest attaches auth (Bearer/cookies), refreshes on 401, and
      // throws ApiError with the HTTP status on failure.
      const data = await apiRequest<T>(path, { signal, timeoutMs: cfg.defaultTimeout })
      const durationMs = Math.round(performance.now() - start)
      logAttempt(endpoint, params, attempt, 200, durationMs, null)
      return {
        ok: true,
        data: data ?? null,
        status: 200,
        error: null,
        attempts: attempt,
        durationMs: Math.round(performance.now() - startTotal),
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start)
      lastStatus = err instanceof ApiError ? err.status : 0
      lastError = err instanceof Error ? err.message : String(err)
      logAttempt(endpoint, params, attempt, lastStatus, durationMs, lastError)

      // Status 0 = network error / timeout (retryable, matching previous
      // behavior); otherwise only retry the configured statuses.
      const retryable =
        !signal?.aborted && (lastStatus === 0 || cfg.retryableStatuses.includes(lastStatus))
      if (!retryable || attempt >= cfg.maxRetries) {
        return {
          ok: false,
          data: null,
          status: lastStatus,
          error: lastError,
          attempts: attempt,
          durationMs: Math.round(performance.now() - startTotal),
        }
      }
      const delayMs = attempt * 2000
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return {
    ok: false,
    data: null,
    status: lastStatus,
    error: lastError || 'Request failed after retries',
    attempts: cfg.maxRetries,
    durationMs: Math.round(performance.now() - startTotal),
  }
}
