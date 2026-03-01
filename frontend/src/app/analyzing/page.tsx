'use client'

/**
 * IQ Analyzing Page
 * Route: /analyzing?address=...
 *
 * Redirects to verdict with the same params. Verdict shows "Analyzing property..."
 * until data is loaded. Kept for backwards compatibility (deep links, app-site-association).
 */

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    router.replace(query ? `/verdict?${query}` : '/verdict')
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <p style={{ color: '#F1F5F9' }}>Analyzing property...</p>
      </div>
    </div>
  )
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AnalyzingContent />
    </Suspense>
  )
}
