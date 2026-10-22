import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COMING_SOON_PATH, isMaintenanceMode, isMaintenancePassthrough } from '@/lib/maintenance'

const INDEXABLE_TOOL_PATHS = new Set(['/discovery'])

const APEX_HOST = 'dealgapiq.com'

function isWwwHost(host: string): boolean {
  return host === `www.${APEX_HOST}`
}

function isDealGapHost(host: string): boolean {
  return host === APEX_HOST || isWwwHost(host)
}

/** Build canonical https://dealgapiq.com URL (apex, HTTPS). */
function canonicalUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone()
  url.protocol = 'https:'
  url.host = APEX_HOST
  return url
}

function hasPropertyContext(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has('address') ||
    searchParams.has('propertyId') ||
    searchParams.has('zpid')
  )
}

/**
 * Next.js 16 Proxy (replaces Edge Middleware).
 *
 * Auth route protection stays client-side (`app/dashboard/layout.tsx`) because
 * httpOnly cookies are set on the Railway backend domain.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto')

  // Canonical URL: https://dealgapiq.com (no www, no http)
  if (isDealGapHost(host) && (isWwwHost(host) || proto === 'http')) {
    const target = canonicalUrl(request)
    if (target.href !== request.nextUrl.href) {
      return NextResponse.redirect(target, 308)
    }
  }

  if (isMaintenanceMode()) {
    if (isMaintenancePassthrough(pathname)) {
      const passthrough = NextResponse.next()
      if (pathname === COMING_SOON_PATH) {
        passthrough.headers.set('X-Robots-Tag', 'noindex, follow')
      }
      return passthrough
    }
    const rewritten = NextResponse.rewrite(new URL(COMING_SOON_PATH, request.url))
    // Only the homepage stays indexed while paused; deep pages drop out.
    if (pathname !== '/' || searchParams.toString().length > 0) {
      rewritten.headers.set('X-Robots-Tag', 'noindex, follow')
    }
    return rewritten
  }

  if (pathname === COMING_SOON_PATH) {
    return NextResponse.redirect(new URL('/', request.url), 307)
  }

  const response = NextResponse.next()

  // Homepage with query params (e.g. /?action=analyze) duplicates canonical /
  if (pathname === '/' && searchParams.toString().length > 0) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
    return response
  }

  if (INDEXABLE_TOOL_PATHS.has(pathname) && hasPropertyContext(searchParams)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/discovery',
    '/((?!_next/static|_next/image|favicon.ico|images|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
