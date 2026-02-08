/**
 * Centralized environment variable access (client-side).
 *
 * API calls always use relative URLs (/api/v1/...) so they go through
 * the Vercel rewrite proxy → Railway backend. This makes auth cookies
 * first-party (same domain), avoiding third-party cookie blocking in
 * modern browsers.
 *
 * NEXT_PUBLIC_API_URL is used ONLY by next.config.js rewrites to know
 * where to proxy requests. The frontend code itself never needs it.
 */

/**
 * Base URL prefix for client-side API calls.
 * Always empty string — requests use relative paths through the proxy.
 */
export const API_BASE_URL = ''
