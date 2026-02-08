import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Edge Middleware
 *
 * Auth-related route protection is handled CLIENT-SIDE in the dashboard
 * layout (`app/dashboard/layout.tsx`) because auth cookies are set by
 * the backend on a different domain (Railway). Edge middleware can't
 * read cross-domain httpOnly cookies, so checking `access_token` here
 * would always fail and redirect authenticated users back to login.
 *
 * This file intentionally passes all requests through.
 * Removing it entirely may leave a stale middleware in Vercel's
 * build cache from a previous deployment — keeping a no-op version
 * ensures the old one is overwritten.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}
