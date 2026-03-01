/**
 * Comps API HTTP client — single place for comps requests.
 *
 * Calls the backend comps endpoints (/api/v1/similar-sold, /api/v1/similar-rent).
 * Handles retry (502/503/504), timeout, abort, and error normalization.
 * NEVER throws — always returns a typed response for UI handling.
 */

import { API_BASE_URL } from '@/lib/env'

export interface AxessoClientConfig {
  baseUrl: string
  apiKey: string
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
  baseUrl: API_BASE_URL,
  apiKey: typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_AXESSO_API_KEY ?? '') : '',
  defaultTimeout: 15_000,
  maxRetries: 3,
  retryableStatuses: [502, 503, 504],
}

function buildUrl(baseUrl: string, endpoint: string, params: Record<string, string>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.append(k, v)
  })
  const qs = search.toString()
  const pathWithQuery = qs ? `${path}?${qs}` : path
  if (!baseUrl || baseUrl === '') return pathWithQuery
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${pathWithQuery}`
}

function logAttempt(
  endpoint: string,
  params: Record<string, string>,
  attempt: number,
  status: number,
  durationMs: number,
  error: string | null
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
  signal?: AbortSignal
): Promise<AxessoResponse<T>> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // When using direct AXESSO base URL, key is required. Our backend proxy does not need a key.
  const isDirectAxesso = cfg.baseUrl.includes('axesso')
  if (isDirectAxesso && !cfg.apiKey) {
    return {
      ok: false,
      data: null,
      status: 0,
      error: 'API key not configured for comps.',
      attempts: 0,
      durationMs: 0,
    }
  }

  const startTotal = performance.now()
  let lastStatus = 0
  let lastError: string | null = null
  let lastData: T | null = null

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), cfg.defaultTimeout)
    if (signal?.aborted) {
      clearTimeout(timeoutId)
      return {
        ok: false,
        data: null,
        status: 0,
        error: 'Request aborted',
        attempts: attempt - 1,
        durationMs: Math.round(performance.now() - startTotal),
      }
    }
    signal?.addEventListener('abort', () => controller.abort(), { once: true })
    const requestSignal = controller.signal

    const url = buildUrl(cfg.baseUrl, endpoint, params)
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (cfg.apiKey) {
      headers['Ocp-Apim-Subscription-Key'] = cfg.apiKey
    }

    const start = performance.now()
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: requestSignal,
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)
      lastStatus = res.status

      const data = await res.json().catch(() => null) as T | null

      logAttempt(endpoint, params, attempt, res.status, durationMs, null)

      if (res.ok) {
        return {
          ok: true,
          data: data ?? null,
          status: res.status,
          error: null,
          attempts: attempt,
          durationMs: Math.round(performance.now() - startTotal),
        }
      }

      lastData = null
      const errBody = data && typeof data === 'object' && 'error' in data ? (data as { error?: string }).error : null
      lastError = typeof errBody === 'string' ? errBody : res.statusText || `HTTP ${res.status}`

      if (res.status === 404 || res.status === 401 || res.status === 429) {
        return {
          ok: false,
          data: null,
          status: res.status,
          error: lastError,
          attempts: attempt,
          durationMs: Math.round(performance.now() - startTotal),
        }
      }

      if (!cfg.retryableStatuses.includes(res.status) || attempt >= cfg.maxRetries) {
        return {
          ok: false,
          data: null,
          status: res.status,
          error: lastError,
          attempts: attempt,
          durationMs: Math.round(performance.now() - startTotal),
        }
      }

      const delayMs = attempt * 2000
      await new Promise((r) => setTimeout(r, delayMs))
    } catch (err) {
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      lastError = isAbort ? 'Request timed out or aborted' : (err instanceof Error ? err.message : String(err))
      lastStatus = 0
      logAttempt(endpoint, params, attempt, 0, durationMs, lastError)

      if (attempt >= cfg.maxRetries) {
        return {
          ok: false,
          data: null,
          status: 0,
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
    data: lastData,
    status: lastStatus,
    error: lastError || 'Request failed after retries',
    attempts: cfg.maxRetries,
    durationMs: Math.round(performance.now() - startTotal),
  }
}
