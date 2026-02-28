/**
 * Non-blocking sale and rent comps fetching.
 * Decoupled from core analysis so comp failures never block the deal report.
 * Uses timeout, retries (for 502/503/504), and structured logging.
 */

export type CompType = 'sale' | 'rent'

export interface CompResult<T = Record<string, unknown>> {
  status: 'success' | 'failed' | 'timeout'
  data: T | null
  error?: string
  httpStatus?: number
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

/** Backend comps response shape */
interface CompsApiResponse {
  success?: boolean
  results?: unknown[]
  error?: string
}

function isRetryable(status: number | undefined, errorMessage?: string): boolean {
  if (status && [502, 503, 504].includes(status)) return true
  if (errorMessage && /502|503|504|unreachable|bad gateway/i.test(errorMessage)) return true
  return false
}

function logCompsFetch(
  type: CompType,
  params: { zpid?: string; address?: string },
  result: CompResult,
  durationMs: number,
  attempts: number
) {
  const payload = {
    event: 'comps_fetch',
    type,
    zpid: params.zpid ?? null,
    status: result.status,
    httpStatus: result.httpStatus ?? null,
    compCount: Array.isArray((result.data as CompsApiResponse)?.results)
      ? (result.data as CompsApiResponse).results!.length
      : 0,
    durationMs,
    attempts,
    error: result.error ?? null,
    timestamp: new Date().toISOString(),
  }
  if (result.status === 'success') {
    console.log('[comps_fetch]', payload)
  } else {
    console.warn('[comps_fetch]', payload)
  }
}

function buildUrl(type: CompType, params: { zpid?: string; address?: string; limit?: number; offset?: number; exclude_zpids?: string }): string {
  const endpoint = type === 'sale' ? '/api/v1/similar-sold' : '/api/v1/similar-rent'
  const url = new URL(endpoint, window.location.origin)
  if (params.zpid) url.searchParams.append('zpid', params.zpid)
  if (params.address) url.searchParams.append('address', params.address)
  if (params.limit != null) url.searchParams.append('limit', String(params.limit))
  if (params.offset != null) url.searchParams.append('offset', String(params.offset))
  if (params.exclude_zpids) url.searchParams.append('exclude_zpids', params.exclude_zpids)
  return url.toString()
}

/**
 * Fetch sale or rent comps from the backend. Non-blocking: call after analysis
 * has rendered; do not await in the critical path.
 *
 * - 15s timeout per attempt
 * - Up to 3 retries for 502/503/504 (or error message containing them)
 * - 404 / "no comps" does not retry
 * - Never throws; returns CompResult
 */
export async function fetchComps(
  params: { zpid?: string; address?: string; limit?: number; offset?: number; exclude_zpids?: string },
  type: CompType,
  options?: { timeout?: number; maxRetries?: number }
): Promise<CompResult<CompsApiResponse>> {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES

  if (!params.zpid && !params.address) {
    const result: CompResult<CompsApiResponse> = {
      status: 'failed',
      data: null,
      error: 'No property address or ID available',
    }
    logCompsFetch(type, params, result, 0, 0)
    return result
  }

  let lastResult: CompResult<CompsApiResponse> = { status: 'failed', data: null, error: 'All retry attempts failed' }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const url = buildUrl(type, { ...params, limit: params.limit ?? 10, offset: params.offset ?? 0 })
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)

      const data = (await response.json().catch(() => null)) as CompsApiResponse | null

      if (response.ok && data?.success === true) {
        const result: CompResult<CompsApiResponse> = { status: 'success', data, httpStatus: response.status }
        logCompsFetch(type, params, result, durationMs, attempt)
        return result
      }

      if (response.status === 404) {
        lastResult = {
          status: 'failed',
          data: null,
          error: 'No comps available for this property',
          httpStatus: 404,
        }
        logCompsFetch(type, params, lastResult, durationMs, attempt)
        return lastResult
      }

      const errorMsg = data?.error ?? (response.ok ? 'No data' : `API returned ${response.status}`)
      lastResult = {
        status: 'failed',
        data: null,
        error: errorMsg,
        httpStatus: response.ok ? undefined : response.status,
      }
      logCompsFetch(type, params, lastResult, durationMs, attempt)

      if (!isRetryable(response.status, errorMsg) || attempt >= maxRetries) {
        return lastResult
      }
      console.warn(`Comps (${type}) attempt ${attempt}/${maxRetries} got ${response.status ?? 'error'} for ZPID: ${params.zpid ?? 'address'}`)
      await new Promise((r) => setTimeout(r, attempt * RETRY_DELAY_MS))
    } catch (err) {
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      lastResult = {
        status: isTimeout ? 'timeout' : 'failed',
        data: null,
        error: isTimeout ? 'Request timed out' : (err instanceof Error ? err.message : String(err)),
      }
      logCompsFetch(type, params, lastResult, durationMs, attempt)
      if (attempt < maxRetries) {
        console.warn(`Comps (${type}) attempt ${attempt} ${isTimeout ? 'timed out' : 'failed'} for ZPID: ${params.zpid ?? 'address'}`)
        await new Promise((r) => setTimeout(r, attempt * RETRY_DELAY_MS))
      } else {
        return lastResult
      }
    }
  }

  return lastResult
}

/** Convenience: fetch sale comps by zpid or address */
export async function fetchSaleComps(
  params: { zpid?: string; address?: string; limit?: number; offset?: number; exclude_zpids?: string },
  options?: { timeout?: number; maxRetries?: number }
) {
  return fetchComps(params, 'sale', options)
}

/** Convenience: fetch rent comps by zpid or address */
export async function fetchRentComps(
  params: { zpid?: string; address?: string; limit?: number; offset?: number; exclude_zpids?: string },
  options?: { timeout?: number; maxRetries?: number }
) {
  return fetchComps(params, 'rent', options)
}
