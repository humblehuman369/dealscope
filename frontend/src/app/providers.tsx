'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/context/ThemeContext'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'
import { useCapacitorShell } from '@/hooks/useCapacitorShell'

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), {
  ssr: false,
  loading: () => null,
})

function CapacitorBridge() {
  useCapacitorDeepLinks()
  useCapacitorShell()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
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
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <AuthModal />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
