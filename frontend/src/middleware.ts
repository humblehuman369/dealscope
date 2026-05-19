import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INDEXABLE_TOOL_PATHS = new Set(['/discovery', '/strategy'])

/**
 * SEO middleware: canonical host, block indexing of duplicate/thin URL variants.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname, searchParams } = request.nextUrl

  // Apex canonical: www → dealgapiq.com (HTTPS assumed at Vercel edge)
  if (host === 'www.dealgapiq.com') {
    const url = request.nextUrl.clone()
    url.host = 'dealgapiq.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }

  const response = NextResponse.next()

  // Homepage with any query string is a duplicate of canonical /
  if (pathname === '/' && searchParams.toString().length > 0) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
    return response
  }

  // Property-specific tool URLs are thin duplicates of marketing concept pages
  if (INDEXABLE_TOOL_PATHS.has(pathname)) {
    const hasPropertyContext =
      searchParams.has('address') ||
      searchParams.has('propertyId') ||
      searchParams.has('zpid')
    if (hasPropertyContext) {
      response.headers.set('X-Robots-Tag', 'noindex, follow')
    }
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/discovery',
    '/strategy',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
