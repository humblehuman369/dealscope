import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INDEXABLE_TOOL_PATHS = new Set(['/discovery', '/strategy'])

/**
 * Next.js 16 Proxy (replaces Edge Middleware).
 *
 * Auth route protection stays client-side (`app/dashboard/layout.tsx`) because
 * httpOnly cookies are set on the Railway backend domain.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (INDEXABLE_TOOL_PATHS.has(pathname)) {
    const hasPropertyContext =
      searchParams.has('address') ||
      searchParams.has('propertyId') ||
      searchParams.has('zpid')
    if (hasPropertyContext) {
      const response = NextResponse.next()
      response.headers.set('X-Robots-Tag', 'noindex, follow')
      return response
    }
  }

  const host = request.headers.get('host') ?? ''
  if (host === 'www.dealgapiq.com') {
    const url = request.nextUrl.clone()
    url.host = 'dealgapiq.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/discovery',
    '/strategy',
    '/((?!_next/static|_next/image|favicon.ico|images|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
