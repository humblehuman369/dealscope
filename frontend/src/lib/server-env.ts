/**
 * Server-side environment variable access.
 *
 * API route handlers (app/api/) should import `BACKEND_URL` from here
 * instead of reading `process.env.BACKEND_URL` directly.
 *
 * This file should ONLY be imported from server-side code (API routes,
 * server components). It uses non-NEXT_PUBLIC_ variables that are not
 * available in the browser.
 *
 * Resolution order for BACKEND_URL:
 * 1. BACKEND_URL environment variable (preferred)
 * 2. NEXT_PUBLIC_API_URL as fallback (same host in most deployments)
 * 3. Empty string — fetch will fail with a clear network error
 *
 * This module NEVER throws at import time so the app can always start.
 */

function resolveBackendUrl(): string {
  const backendUrl = process.env.BACKEND_URL
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL

  if (backendUrl) {
    if (backendUrl.includes('vercel.app')) {
      console.warn(
        `[server-env] BACKEND_URL is set to a Vercel URL (${backendUrl}). ` +
          'It should point to the Railway backend, not a Vercel deployment.',
      )
    }
    return backendUrl
  }

  if (publicApiUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[server-env] BACKEND_URL is not set, falling back to NEXT_PUBLIC_API_URL.',
      )
    }
    return publicApiUrl
  }

  console.error(
    '[server-env] Neither BACKEND_URL nor NEXT_PUBLIC_API_URL is set. ' +
      'API proxy routes will fail. Add these to your Vercel environment settings or .env.local.',
  )
  return ''
}

/** Backend URL for server-side API route proxying */
export const BACKEND_URL = resolveBackendUrl()
