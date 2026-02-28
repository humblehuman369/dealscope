/**
 * Non-blocking property photo fetching.
 * Decoupled from core analysis so photo failures never impact deal scoring.
 * Uses timeout, retries, and structured logging for monitoring.
 */

export interface PhotoResult {
  status: 'success' | 'failed' | 'timeout'
  photos: string[]
  error?: string
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

/** Backend photos response shape */
interface PhotosApiResponse {
  success?: boolean
  photos?: Array<{ url?: string }>
  error?: string
}

function logPhotoFetch(
  zpid: string,
  result: PhotoResult,
  durationMs: number,
  attempt?: number
) {
  const payload = {
    event: 'photo_fetch',
    zpid,
    status: result.status,
    photoCount: result.photos.length,
    durationMs,
    error: result.error ?? null,
    attempt: attempt ?? null,
    timestamp: new Date().toISOString(),
  }
  if (result.status === 'success') {
    console.log('[photo_fetch]', payload)
  } else {
    console.warn('[photo_fetch]', payload)
  }
}

/**
 * Fetch property photos from the backend (AXESSO/Zillow). Non-blocking use:
 * call after analysis has rendered; do not await in the critical path.
 *
 * - 10s timeout per attempt
 * - Up to 2 retries with delay
 * - Returns structured result; never throws
 */
export async function fetchPropertyPhotos(
  zpid: string,
  options?: { timeout?: number; maxRetries?: number }
): Promise<PhotoResult> {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const start = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const url = `/api/v1/photos?zpid=${encodeURIComponent(zpid)}`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)

      const data = (await response.json().catch(() => null)) as PhotosApiResponse | null

      if (response.ok && data?.success && Array.isArray(data.photos)) {
        const urls = data.photos
          .map((p) => p?.url)
          .filter((u): u is string => typeof u === 'string' && u.length > 0)
        const result: PhotoResult = { status: 'success', photos: urls }
        logPhotoFetch(zpid, result, durationMs, attempt)
        return result
      }

      if (response.ok && data && !data.success) {
        const result: PhotoResult = {
          status: 'failed',
          photos: [],
          error: data.error ?? 'No photos available',
        }
        logPhotoFetch(zpid, result, durationMs, attempt)
        return result
      }

      const result: PhotoResult = {
        status: 'failed',
        photos: [],
        error: data?.error ?? `HTTP ${response.status}`,
      }
      logPhotoFetch(zpid, result, durationMs, attempt)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * RETRY_DELAY_MS))
      } else {
        return result
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - start)
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const result: PhotoResult = {
        status: isTimeout ? 'timeout' : 'failed',
        photos: [],
        error: isTimeout ? 'Request timed out' : (err instanceof Error ? err.message : String(err)),
      }
      logPhotoFetch(zpid, result, durationMs, attempt)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * RETRY_DELAY_MS))
      } else {
        return result
      }
    }
  }

  return {
    status: 'failed',
    photos: [],
    error: 'All retry attempts failed',
  }
}

/** Zillow listing URL for a zpid (for "View on Zillow" link) */
export function zillowListingUrl(zpid: string): string {
  return `https://www.zillow.com/homedetails/${zpid}_zpid/`
}
