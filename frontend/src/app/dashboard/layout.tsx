'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
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
  const { user, isAuthenticated, isLoading, needsOnboarding, isAdmin } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/?auth=login&redirect=/dashboard')
    } else if (needsOnboarding) {
      router.push('/onboarding')
    }
  }, [isLoading, isAuthenticated, needsOnboarding, router])

  if (isLoading || !isAuthenticated || !user) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-navy-950 overflow-hidden">
      <DealHubSidebar
        isAdmin={isAdmin}
        userName={user.full_name}
        userEmail={user.email}
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
