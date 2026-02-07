/**
 * Centralized environment variable access (client-side).
 *
 * Client-side code should import `API_BASE_URL` from here instead of
 * reading `process.env.NEXT_PUBLIC_API_URL` directly.
 *
 * NEXT_PUBLIC_ variables are inlined at build time by Next.js.
 * If the build succeeded, the value is guaranteed to be embedded.
 */

// For NEXT_PUBLIC_ vars, Next.js replaces process.env.NEXT_PUBLIC_*
// with the literal value at build time. We read it once at module level.
const value = process.env.NEXT_PUBLIC_API_URL

if (!value && typeof window !== 'undefined') {
  // Only warn in the browser — during SSR/build the value may be
  // available via the inlined replacement but appear missing here.
  console.error(
    '[env] NEXT_PUBLIC_API_URL is not set. ' +
      'API calls will fail. Add it to Vercel environment settings or .env.local.',
  )
}

/** Base URL for client-side API calls (e.g. https://dealscope-production.up.railway.app) */
export const API_BASE_URL = value ?? ''
