'use client'

/**
 * StrategyIQ Page — Financial Deep-Dive (Page 2 of 2)
 * Route: /strategy?address=...
 *
 * Thin route shell (R4 Stage 1): parses URL params, builds the auth-redirect
 * URL, and renders the extracted `<StrategyWorkbench>` feature component.
 * All financial logic and UI live in `features/strategy-workbench/`.
 */

import { Suspense, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppPathname, useAppSearchParams } from '@/hooks/useAppNavigation'
import { ScreenErrorBoundary } from '@/components/ErrorBoundary'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { parseStrategyWorksheetSection } from '@/components/iq-verdict/strategyWorksheetSection'
import { StrategyWorkbench } from '@/features/strategy-workbench'

function StrategyRoute() {
  const router = useRouter()
  const pathname = useAppPathname()
  const searchParams = useAppSearchParams()

  const addressParam = searchParams.get('address') || ''
  const strategySignInUrl = useMemo(() => {
    const cleanParams = new URLSearchParams(searchParams.toString())
    cleanParams.delete('auth')
    cleanParams.delete('redirect')
    const cleanQs = cleanParams.toString()
    const fullPath = cleanQs ? `${pathname}?${cleanQs}` : pathname
    const signInParams = new URLSearchParams(cleanQs)
    signInParams.set('auth', 'required')
    signInParams.set('redirect', fullPath)
    return `${pathname}?${signInParams.toString()}`
  }, [pathname, searchParams])

  // Once the workbench has applied a ?scenario= payload, strip it from the URL
  // so refreshes / shares don't re-apply it.
  const handleScenarioConsumed = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('scenario')
    router.replace(`/strategy?${nextParams.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <StrategyWorkbench
      address={addressParam}
      strategyId={searchParams.get('strategy')}
      condition={searchParams.get('condition')}
      location={searchParams.get('location')}
      initialSection={parseStrategyWorksheetSection(searchParams.get('section'))}
      scenarioParam={searchParams.get('scenario')}
      onScenarioConsumed={handleScenarioConsumed}
      signInUrl={strategySignInUrl}
    />
  )
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <ScreenErrorBoundary>
        <StrategyRoute />
      </ScreenErrorBoundary>
    </Suspense>
  )
}
