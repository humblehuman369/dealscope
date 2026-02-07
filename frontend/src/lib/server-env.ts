/**
 * Server-side environment variable access.
 *
 * API route handlers (app/api/) should import `BACKEND_URL` from here
 * instead of reading `process.env.BACKEND_URL` directly. This ensures
 * a loud failure when the variable is missing rather than silently
 * falling back to a hardcoded production URL.
 *
 * This file should ONLY be imported from server-side code (API routes,
 * server components). It uses non-NEXT_PUBLIC_ variables that are not
 * available in the browser.
 */

function requireServerEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required server environment variable: ${name}. ` +
        'Add it to your .env.local file (see .env.example).',
    )
  }
  return value
}

/** Backend URL for server-side API route proxying */
const rawBackendUrl = requireServerEnv('BACKEND_URL')

/**
 * Guard: if BACKEND_URL is accidentally set to a Vercel deployment URL,
 * fail loudly instead of routing traffic to the wrong host.
 */
if (rawBackendUrl.includes('vercel.app')) {
  throw new Error(
    `BACKEND_URL is set to a Vercel URL (${rawBackendUrl}). ` +
      'It must point to the Railway backend, not a Vercel deployment.',
  )
}

export const BACKEND_URL = rawBackendUrl
