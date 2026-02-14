'use client'

/**
 * AuthGuard — centralised authentication gate for protected routes.
 *
 * Replaces the duplicated useEffect-redirect pattern found in every
 * protected page.  Renders children only when the user is authenticated.
 *
 * Features:
 *  • Shows a branded loading spinner while session is resolving.
 *  • Opens the global AuthModal via `?auth=required` (stays on the same
 *    URL so the modal's onLoginSuccess redirects back automatically).
 *  • Optional `requireAdmin` flag for admin-only routes.
 *  • Redirects non-admin users to `/search` when `requireAdmin` is set.
 */

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'

interface AuthGuardProps {
  children: React.ReactNode
  /** Require admin or owner role to access the wrapped content. */
  requireAdmin?: boolean
  /** Route to redirect non-admin users to. Defaults to '/search'. */
  adminFallback?: string
}

export function AuthGuard({
  children,
  requireAdmin = false,
  adminFallback = '/search',
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, isAdmin } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ── Unauthenticated → open auth modal with redirect ───────────
  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      // Build the URL to stay on this page and open the auth modal.
      // After login, the AuthModal reads `redirect` and sends the
      // user back here automatically.
      const params = new URLSearchParams(searchParams.toString())
      if (!params.has('auth')) {
        params.set('auth', 'required')
        params.set('redirect', pathname)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
      return
    }

    // ── Authenticated but not admin → bounce to fallback ─────────
    if (requireAdmin && !isAdmin) {
      router.replace(adminFallback)
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, adminFallback, router, pathname, searchParams])

  // ── Loading state ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    )
  }

  // ── Not authenticated — show skeleton behind the auth modal ────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    )
  }

  // ── Admin gate ─────────────────────────────────────────────────
  if (requireAdmin && !isAdmin) {
    return null // redirect is in progress
  }

  return <>{children}</>
}
