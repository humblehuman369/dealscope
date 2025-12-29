'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import AuthModal from '@/components/AuthModal'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'providers.tsx:useEffect',message:'Route changed/loaded',data:{pathname,url:typeof window!=='undefined'?window.location.href:''},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  }, [pathname]);
  // #endregion
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <AuthModal />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
