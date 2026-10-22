'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/context/ThemeContext'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'
import { useCapacitorShell } from '@/hooks/useCapacitorShell'
import { captureFirstTouch } from '@/lib/attribution'

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), {
  ssr: false,
  loading: () => null,
})

const ProWelcomeModal = dynamic(
  () => import('@/components/billing/ProWelcomeModal').then((m) => m.ProWelcomeModal),
  { ssr: false, loading: () => null },
)

function CapacitorBridge() {
  useCapacitorDeepLinks()
  useCapacitorShell()
  return null
}

/** Records utm params, gclid and referrer once per device before any navigation drops them. */
function FirstTouchCapture() {
  useEffect(() => {
    captureFirstTouch()
  }, [])
  return null
}

export function Providers({
  children,
  withAuth = true,
}: {
  children: React.ReactNode
  /** False while the site is paused: the auth modals poll the backend for a session. */
  withAuth?: boolean
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CapacitorBridge />
        <FirstTouchCapture />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {withAuth && (
          <>
            <AuthModal />
            <ProWelcomeModal />
          </>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
