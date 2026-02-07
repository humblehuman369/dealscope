/**
 * Centralized environment variable access.
 *
 * Client-side code should import `API_BASE_URL` from here instead of
 * reading `process.env.NEXT_PUBLIC_API_URL` directly. This guarantees
 * a loud, early failure when the variable is missing — rather than
 * silently falling back to a hardcoded production URL.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Add it to your .env.local file (see .env.example).',
    )
  }
  return value
}

/** Base URL for client-side API calls (e.g. https://dealscope-production.up.railway.app) */
export const API_BASE_URL = requireEnv('NEXT_PUBLIC_API_URL')
