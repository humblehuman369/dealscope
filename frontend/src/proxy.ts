import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route Protection Proxy
 * 
 * Handles authentication redirects at the edge before the page renders.
 * This prevents the "flash of protected content" issue.
 * 
 * NOTE: Next.js 16 renamed "middleware" to "proxy" to clarify its purpose.
 * The proxy runs at the edge, in front of the app, handling routing concerns.
 */

// Routes that require authentication
// NOTE: Proxy-level protection is DISABLED because tokens are stored in localStorage,
// not cookies. The proxy cannot access localStorage tokens. All protected routes
// handle their own auth client-side with proper loading states.
// 
// To re-enable proxy protection, migrate to httpOnly cookies for token storage.
const protectedRoutes: string[] = [
  // All routes disabled - they handle auth client-side:
  // '/dashboard',    // Handles its own auth with proper loading states
  // '/profile',      // Handles its own auth
  // '/worksheet',    // Handles its own auth
  // '/deal-maker',   // Part of public analysis flow
  // '/compare',      // Part of analysis flow
  // '/search-history', // Handles its own auth
  // '/billing',      // Handles its own auth
]

// Routes that are only for unauthenticated users
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
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the access token from cookies or check for the cookie header
  // Note: In a production app, you'd use httpOnly cookies set by the server
  // For now, we check for the presence of a client-side token cookie
  const token = request.cookies.get('access_token')?.value
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Check if the current path is an auth route (login/register pages)
  const isAuthRoute = authRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // If trying to access a protected route without authentication
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('auth', 'required')
    
    const response = NextResponse.redirect(loginUrl)
    // Set a header to indicate auth is required (useful for client-side handling)
    response.headers.set('x-auth-required', 'true')
    return response
  }
  
  // If authenticated user tries to access auth-only routes, redirect to dashboard
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
