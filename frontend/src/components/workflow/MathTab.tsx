'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

import { AuthGate } from '@/components/auth/AuthGate'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'

const PriceCheckerIQScreen = dynamic(
  () =>
    import('@/components/price-checker').then((m) => ({ default: m.PriceCheckerIQScreen })),
  { loading: () => <IQLoadingLogo /> },
)

const RehabPageContent = dynamic(
  () => import('@/app/rehab/page').then((m) => ({ default: m.RehabPageContent })),
  { loading: () => <IQLoadingLogo /> },
)

function parseAddress(address: string) {
  const parts = address.split(',').map((s) => s.trim())
  const streetAddress = parts[0] || ''
  const city = parts[1] || ''
  const stateZip = parts[2] || ''
  const stateZipParts = stateZip.split(' ')
  return {
    streetAddress,
    city,
    state: stateZipParts[0] || '',
    zipCode: stateZipParts[1] || '',
  }
}

export function MathTab({
  address,
  zpid,
  lat,
  lng,
  compsView,
  section,
  dataSources,
}: {
  address: string
  zpid?: string
  lat?: number
  lng?: number
  compsView?: 'sale' | 'rent'
  section?: string | null
  dataSources: ReactNode
}) {
  const compsRef = useRef<HTMLElement>(null)
  const estimatorRef = useRef<HTMLElement>(null)
  const parsed = parseAddress(address)

  useEffect(() => {
    if (section !== 'comps' && section !== 'estimator') return
    const node = section === 'comps' ? compsRef.current : estimatorRef.current
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  return (
    <div className="mx-0 sm:mx-5 mt-4 px-3 sm:px-5 space-y-6 pb-10">
      <section aria-labelledby="math-sources-heading">
        <h2
          id="math-sources-heading"
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--text-heading)' }}
        >
          Data sources
        </h2>
        {dataSources}
      </section>
      <section ref={compsRef} aria-labelledby="math-comps-heading">
        <h2
          id="math-comps-heading"
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--text-heading)' }}
        >
          Comps
        </h2>
        <AuthGate feature="view comparable properties" mode="section">
          <PriceCheckerIQScreen
            property={{
              address: parsed.streetAddress,
              city: parsed.city,
              state: parsed.state,
              zipCode: parsed.zipCode,
              zpid,
              latitude: lat,
              longitude: lng,
            }}
            initialView={compsView ?? 'sale'}
          />
        </AuthGate>
      </section>
      <section ref={estimatorRef} aria-labelledby="math-estimator-heading">
        <h2
          id="math-estimator-heading"
          className="text-[16px] font-semibold mb-3"
          style={{ color: 'var(--text-heading)' }}
        >
          Estimator
        </h2>
        <RehabPageContent embedded />
      </section>
    </div>
  )
}
