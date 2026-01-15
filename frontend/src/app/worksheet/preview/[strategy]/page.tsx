'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { WorksheetLayout } from '@/components/worksheet/WorksheetLayout'
import { WorksheetShell } from '@/components/worksheet/WorksheetShell'
import { StrWorksheet } from '@/components/worksheet/str/StrWorksheet'
import { BrrrrWorksheet } from '@/components/worksheet/brrrr/BrrrrWorksheet'
import { FlipWorksheet } from '@/components/worksheet/flip/FlipWorksheet'
import { HouseHackWorksheet } from '@/components/worksheet/househack/HouseHackWorksheet'
import { WholesaleWorksheet } from '@/components/worksheet/wholesale/WholesaleWorksheet'
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

const FLIP_HELP_TIPS = [
  'Follow the 70% rule: pay no more than 70% of ARV minus repairs.',
  'Shorter holding periods reduce carrying costs and protect margins.',
  'Target at least a 15% profit margin after all selling costs.',
]

const HOUSE_HACK_HELP_TIPS = [
  'FHA loans allow 3.5% down on 2-4 unit properties.',
  'Budget for vacancy even if units are leased.',
  'Aim for a net housing cost below market rent.',
]

const WHOLESALE_HELP_TIPS = [
  'Target assignment fees above $5k for strong wholesale deals.',
  'Investor ROI should exceed 25% to be compelling.',
  'Keep contracts below 70% of ARV minus rehab.',
]

interface LocalStorageProperty {
  address: string
  city: string
  state: string
  zipCode: string
  fullAddress: string
  bedrooms: number
  bathrooms: number
  sqft: number
  thumbnailUrl?: string
  photos?: string[]
  listPrice: number
  monthlyRent: number
  arv: number
  propertyTaxes: number
  insurance: number
  averageDailyRate?: number
  occupancyRate?: number
  strategy: string
  timestamp: number
}

// Convert localStorage property to SavedProperty format
function convertToSavedProperty(data: LocalStorageProperty) {
  return {
    id: 'preview',
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zipCode,
    property_data_snapshot: {
      listPrice: data.listPrice,
      monthlyRent: data.monthlyRent,
      propertyTaxes: data.propertyTaxes,
      insurance: data.insurance,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      sqft: data.sqft,
      arv: data.arv,
      averageDailyRate: data.averageDailyRate,
      occupancyRate: data.occupancyRate,
    },
    last_analytics_result: null,
    worksheet_assumptions: null,
    created_at: new Date().toISOString(),
  }
}

export default function PreviewWorksheetPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { initializeFromProperty } = useWorksheetStore()

  const strategyParam = params.strategy as WorksheetStrategyId
  const addressParam = searchParams.get('address')

  const [property, setProperty] = useState<ReturnType<typeof convertToSavedProperty> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isValidStrategy = useMemo(
    () => WORKSHEET_STRATEGIES.some((strategy) => strategy.id === strategyParam),
    [strategyParam]
  )

  useEffect(() => {
    // Try to load property from localStorage
    try {
      const storedData = localStorage.getItem('worksheetProperty')
      if (storedData) {
        const parsed: LocalStorageProperty = JSON.parse(storedData)
        
        // Check if data is recent (within 1 hour)
        const isRecent = Date.now() - parsed.timestamp < 3600000
        
        if (isRecent) {
          const converted = convertToSavedProperty(parsed)
          setProperty(converted)
          
          if (strategyParam === 'ltr') {
            initializeFromProperty(converted)
          }
        } else {
          setError('Property data has expired. Please search for the property again.')
        }
      } else {
        setError('No property data found. Please search for a property first.')
      }
    } catch (err) {
      console.error('Error loading property from localStorage:', err)
      setError('Failed to load property data.')
    } finally {
      setIsLoading(false)
    }
  }, [strategyParam, initializeFromProperty])

  useEffect(() => {
    if (!isValidStrategy && !isLoading) {
      router.replace('/worksheet/preview/ltr')
    }
  }, [isValidStrategy, isLoading, router])

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
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[var(--ws-accent)] text-white rounded-lg hover:bg-[var(--ws-accent-hover)]"
          >
            Search Properties
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
        propertyId="preview"
        strategy="ltr"
      />
    )
  }

  if (strategyParam === 'str') {
    return (
      <WorksheetShell
        property={property}
        propertyId="preview"
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
        propertyId="preview"
        strategy="brrrr"
        helpTitle="BRRRR Tips"
        helpTips={BRRRR_HELP_TIPS}
      >
        <BrrrrWorksheet property={property} />
      </WorksheetShell>
    )
  }

  if (strategyParam === 'flip') {
    return (
      <WorksheetShell
        property={property}
        propertyId="preview"
        strategy="flip"
        helpTitle="Fix & Flip Tips"
        helpTips={FLIP_HELP_TIPS}
      >
        <FlipWorksheet property={property} />
      </WorksheetShell>
    )
  }

  if (strategyParam === 'househack') {
    return (
      <WorksheetShell
        property={property}
        propertyId="preview"
        strategy="househack"
        helpTitle="House Hack Tips"
        helpTips={HOUSE_HACK_HELP_TIPS}
      >
        <HouseHackWorksheet property={property} />
      </WorksheetShell>
    )
  }

  if (strategyParam === 'wholesale') {
    return (
      <WorksheetShell
        property={property}
        propertyId="preview"
        strategy="wholesale"
        helpTitle="Wholesale Tips"
        helpTips={WHOLESALE_HELP_TIPS}
      >
        <WholesaleWorksheet property={property} />
      </WorksheetShell>
    )
  }

  return (
    <WorksheetShell
      property={property}
      propertyId="preview"
      strategy={strategyParam}
      helpTitle="Worksheet Tips"
      helpTips={['This strategy is being finalized for production.']}
    >
      <div className="section-card p-6">
        <h2 className="text-lg font-semibold text-[var(--ws-text-primary)]">
          Strategy build in progress
        </h2>
        <p className="text-sm text-[var(--ws-text-secondary)] mt-2">
          We are finishing the production build for this worksheet.
        </p>
      </div>
    </WorksheetShell>
  )
}
