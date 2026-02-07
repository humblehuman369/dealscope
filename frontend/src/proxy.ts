import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route Protection Proxy
 *
 * Handles authentication redirects at the edge before the page renders.
 * This prevents the "flash of protected content" issue.
 *
 * Auth tokens are httpOnly cookies set by the backend. The proxy reads
 * the `access_token` cookie to determine if the user is authenticated.
 */

// Routes that require authentication — unauthenticated users are
// redirected to the landing page with ?auth=required.
const protectedRoutes: string[] = [
  '/dashboard',
  '/profile',
  '/worksheet',
  '/search-history',
  '/billing',
]

// Routes that are only for unauthenticated users — authenticated
// users are redirected to the dashboard.
const authRoutes = [
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

// Public routes that don't need any protection
const publicRoutes = [
  '/',
  '/strategies',
  '/onboarding',
  '/property',
  '/deal-maker',
  '/verdict',
  '/price-intel',
  '/deal-gap',
  '/rehab',
  '/photos',
  '/national-averages',
  '/search',
  '/analyzing',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read the httpOnly access_token cookie set by the backend
  const token = request.cookies.get('access_token')?.value

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  // Check if the current path is an auth-only route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  // Unauthenticated user on a protected route → redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user on an auth-only route → redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}
