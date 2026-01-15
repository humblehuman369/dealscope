'use client'

import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { WorksheetLayout } from '@/components/worksheet/WorksheetLayout'
import { WorksheetShell } from '@/components/worksheet/WorksheetShell'
import { StrWorksheet } from '@/components/worksheet/str/StrWorksheet'
import { BrrrrWorksheet } from '@/components/worksheet/brrrr/BrrrrWorksheet'
import { useWorksheetProperty } from '@/hooks/useWorksheetProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { WORKSHEET_STRATEGIES, WorksheetStrategyId } from '@/constants/worksheetStrategies'

const STR_HELP_TIPS = [
  'Peak season rates can be 2-3x higher than off-season',
  'Average 65-75% occupancy is realistic for most markets',
  'Platform fees (Airbnb/VRBO) typically 3-15% of booking',
  'Dynamic pricing tools can increase revenue 10-20%',
]

const BRRRR_HELP_TIPS = [
  'Target 70-75% all-in vs. ARV to create strong equity at refinance.',
  'Shorter rehab timelines reduce holding costs and improve returns.',
  'Aim to recycle 100% of cash invested at refinance when possible.',
]

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
      if (strategyParam === 'ltr') {
        initializeFromProperty(data)
      }
    },
  })

  useEffect(() => {
    if (!isValidStrategy) {
      router.replace(`/worksheet/${propertyId}/ltr`)
    }
  }, [isValidStrategy, propertyId, router])

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
            onClick={() => router.push('/dashboard')}
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
      <WorksheetLayout
        property={property}
        propertyId={propertyId}
        strategy="ltr"
      />
    )
  }

  if (strategyParam === 'str') {
    return (
      <WorksheetShell
        property={property}
        propertyId={propertyId}
        strategy="str"
        helpTitle="STR Tips"
        helpTips={STR_HELP_TIPS}
      >
        <StrWorksheet property={property} />
      </WorksheetShell>
    )
  }

  if (strategyParam === 'brrrr') {
    return (
      <WorksheetShell
        property={property}
        propertyId={propertyId}
        strategy="brrrr"
        helpTitle="BRRRR Tips"
        helpTips={BRRRR_HELP_TIPS}
      >
        <BrrrrWorksheet property={property} />
      </WorksheetShell>
    )
  }

  return (
    <WorksheetShell
      property={property}
      propertyId={propertyId}
      strategy={strategyParam}
      helpTitle="Worksheet Tips"
      helpTips={['This strategy is being finalized for production.']}
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
