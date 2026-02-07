'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import AuthModal from '@/components/auth/AuthModal'

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
        {children}
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
