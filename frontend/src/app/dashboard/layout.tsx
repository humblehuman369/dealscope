'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, getLastKnownUser } from '@/hooks/useSession'
import { DealHubSidebar } from '@/components/dashboard/DealHubSidebar'
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary'

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading DealHubIQ...</p>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isAdmin } = useSession()
  const router = useRouter()

  // Guard: prevent multiple redirects (breaks the loop).
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      // Check in-memory fallback: if the user JUST logged in, the
      // React Query cache might not have caught up yet.  Give it a
      // grace period instead of redirecting immediately.
      const fallbackUser = getLastKnownUser()
      if (fallbackUser) {
        // User exists in memory — skip redirect.  React Query will
        // catch up on the next tick.
        return
      }

      // Only redirect once per mount to break redirect loops.
      if (hasRedirected.current) return
      hasRedirected.current = true

      router.replace('/?auth=login&redirect=/dashboard')
    } else {
      // User is authenticated — reset the guard so future logouts
      // can redirect correctly.
      hasRedirected.current = false
    }
  }, [isLoading, isAuthenticated, router])

  // Determine displayed user: prefer React Query cache, fall back
  // to in-memory snapshot to avoid a flicker.
  const displayUser = user ?? getLastKnownUser()
  const showDashboard = isAuthenticated || !!displayUser

  if (isLoading || !showDashboard || !displayUser) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-navy-950 overflow-hidden">
      <DealHubSidebar
        isAdmin={isAdmin}
        userName={displayUser.full_name}
        userEmail={displayUser.email}
      />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <Suspense fallback={<DashboardSkeleton />}>
            <div className="min-h-full">{children}</div>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
