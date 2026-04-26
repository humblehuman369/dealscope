'use client'

/**
 * DashboardLandingGate
 *
 * Sends a returning, already-signed-in user to /dashboard the first time
 * they hit the homepage on a given day. Covers cookie-based session
 * restore (no AuthModal involved).
 *
 * Only fires on `/` to avoid hijacking deep links.
 */

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { shouldLandOnDashboard } from '@/lib/dashboardLanding'

export function DashboardLandingGate() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useSession()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (hasRedirectedRef.current) return
    if (isLoading || !isAuthenticated) return
    if (pathname !== '/') return
    if (!shouldLandOnDashboard()) return

    hasRedirectedRef.current = true
    router.replace('/dashboard')
  }, [pathname, isAuthenticated, isLoading, router])

  return null
}
