import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Proxy (formerly Edge Middleware)
 *
 * Auth-related route protection is handled CLIENT-SIDE in the dashboard
 * layout (`app/dashboard/layout.tsx`) because auth cookies are set by
 * the backend on a different domain (Railway). The proxy can't
 * read cross-domain httpOnly cookies, so checking `access_token` here
 * would always fail and redirect authenticated users back to login.
 *
 * This file intentionally passes all requests through.
 * Keeping a no-op version ensures predictable behavior and overwrites
 * any stale middleware from previous deployments.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}
