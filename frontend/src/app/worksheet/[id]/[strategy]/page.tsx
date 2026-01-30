'use client'

import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { WorksheetShell } from '@/components/worksheet/WorksheetShell'
import { LTRWorksheet } from '@/components/worksheet/ltr/LTRWorksheet'
import { StrWorksheet } from '@/components/worksheet/str/StrWorksheet'
import { BrrrrWorksheet } from '@/components/worksheet/brrrr/BrrrrWorksheet'
import { FlipWorksheet } from '@/components/worksheet/flip/FlipWorksheet'
import { HouseHackWorksheet } from '@/components/worksheet/househack/HouseHackWorksheet'
import { WholesaleWorksheet } from '@/components/worksheet/wholesale/WholesaleWorksheet'
import { useWorksheetProperty } from '@/hooks/useWorksheetProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { WORKSHEET_STRATEGIES, WorksheetStrategyId } from '@/constants/worksheetStrategies'

export default function StrategyWorksheetPage() {
  const params = useParams()
  const router = useRouter()
  const { initializeFromProperty } = useWorksheetStore()

  const propertyId = params.id as string
  const strategyParam = params.strategy as WorksheetStrategyId
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'worksheet/page.tsx:17',message:'StrategyWorksheetPage mounted',data:{propertyId,strategyParam,rawId:params.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion

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
