'use client'

import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { WorksheetShell } from '@/components/worksheet/WorksheetShell'
import { useWorksheetProperty } from '@/hooks/useWorksheetProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { WORKSHEET_STRATEGIES, WorksheetStrategyId } from '@/constants/worksheetStrategies'
import { trackEvent } from '@/lib/eventTracking'

// ── Dynamic imports — each worksheet is 800-2000+ lines. ──
// Only the active strategy is loaded; the rest are code-split out.
const WorksheetSkeleton = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)]">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--ws-accent)] mx-auto mb-4" />
      <p className="text-[var(--ws-text-secondary)]">Loading worksheet…</p>
    </div>
  </div>
)

const LTRWorksheet = dynamic(
  () => import('@/components/worksheet/ltr/LTRWorksheet').then(m => ({ default: m.LTRWorksheet })),
  { loading: WorksheetSkeleton },
)
const StrWorksheet = dynamic(
  () => import('@/components/worksheet/str/StrWorksheet').then(m => ({ default: m.StrWorksheet })),
  { loading: WorksheetSkeleton },
)
const BrrrrWorksheet = dynamic(
  () => import('@/components/worksheet/brrrr/BrrrrWorksheet').then(m => ({ default: m.BrrrrWorksheet })),
  { loading: WorksheetSkeleton },
)
const FlipWorksheet = dynamic(
  () => import('@/components/worksheet/flip/FlipWorksheet').then(m => ({ default: m.FlipWorksheet })),
  { loading: WorksheetSkeleton },
)
const HouseHackWorksheet = dynamic(
  () => import('@/components/worksheet/househack/HouseHackWorksheet').then(m => ({ default: m.HouseHackWorksheet })),
  { loading: WorksheetSkeleton },
)
const WholesaleWorksheet = dynamic(
  () => import('@/components/worksheet/wholesale/WholesaleWorksheet').then(m => ({ default: m.WholesaleWorksheet })),
  { loading: WorksheetSkeleton },
)

export default function StrategyWorksheetPage() {
  const params = useParams()
  const router = useRouter()
  const { initializeFromProperty } = useWorksheetStore()

  const propertyId = params.id as string
  const strategyParam = params.strategy as WorksheetStrategyId

  const isValidStrategy = useMemo(
    () => WORKSHEET_STRATEGIES.some((strategy) => strategy.id === strategyParam),
    [strategyParam]
  )

  const { property, isLoading, error } = useWorksheetProperty(propertyId, {
    onLoaded: (data) => {
      // Initialize store for all strategies - needed for RentalCompsSection and other shared components
      initializeFromProperty(data)
    },
  })

  useEffect(() => {
    if (!isValidStrategy) {
      router.replace(`/worksheet/${propertyId}/ltr`)
    }
  }, [isValidStrategy, propertyId, router])

  useEffect(() => {
    if (propertyId && strategyParam && property) {
      trackEvent('worksheet_viewed', { strategy: strategyParam })
    }
  }, [propertyId, strategyParam, property])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ws-accent)] mx-auto mb-4" />
          <p className="text-[var(--ws-text-secondary)]">Loading property worksheet...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)]">
        <div className="text-center">
          <p className="text-[var(--ws-negative)] mb-4">{error}</p>
          <button
            onClick={() => router.push('/search')}
            className="px-4 py-2 bg-[var(--ws-accent)] text-white rounded-lg hover:bg-[var(--ws-accent-hover)]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!property || !isValidStrategy) {
    return null
  }

  if (strategyParam === 'ltr') {
    return (
      <LTRWorksheet
        property={property}
        propertyId={propertyId}
      />
    )
  }

  if (strategyParam === 'str') {
    return (
      <StrWorksheet
        property={property}
        propertyId={propertyId}
      />
    )
  }

  if (strategyParam === 'brrrr') {
    return (
      <BrrrrWorksheet property={property} propertyId={propertyId} />
    )
  }

  if (strategyParam === 'flip') {
    return (
      <FlipWorksheet property={property} propertyId={propertyId} />
    )
  }

  if (strategyParam === 'househack') {
    return (
      <HouseHackWorksheet property={property} propertyId={propertyId} />
    )
  }

  if (strategyParam === 'wholesale') {
    return (
      <WholesaleWorksheet property={property} propertyId={propertyId} />
    )
  }

  return (
    <WorksheetShell
      property={property}
      propertyId={propertyId}
      strategy={strategyParam}
    >
      <div className="section-card p-6">
        <h2 className="text-lg font-semibold text-[var(--ws-text-primary)]">
          Strategy build in progress
        </h2>
        <p className="text-sm text-[var(--ws-text-secondary)] mt-2">
          We are finishing the production build for this worksheet. In the meantime,
          the LTR and STR worksheets are fully operational.
        </p>
      </div>
    </WorksheetShell>
  )
}
