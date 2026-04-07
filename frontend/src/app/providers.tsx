'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import AuthModal from '@/components/auth/AuthModal'
import { useCapacitorDeepLinks } from '@/hooks/useCapacitorDeepLinks'
import { useCapacitorShell } from '@/hooks/useCapacitorShell'

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
        {children}
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
