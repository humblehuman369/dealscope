'use client'

/**
 * IQ Analyzing Page
 * Route: /analyzing?address=...
 *
 * Redirects to verdict with the same params. Verdict shows the pulsating IQ logo
 * until data is loaded. Kept for backwards compatibility (deep links, app-site-association).
 */

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()

  useEffect(() => {
    router.replace(queryString ? `/verdict?${queryString}` : '/verdict')
  }, [router, queryString])

  return <IQLoadingLogo />
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <AnalyzingContent />
    </Suspense>
  )
}
