'use client'

import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight, X, Loader2, Bed, Bath, Ruler, Calendar } from 'lucide-react'

export interface OffMarketPreview {
  bedrooms?: number | null
  bathrooms?: number | null
  sqft?: number | null
  year_built?: number | null
  estimated_value?: number | null
  property_type?: string | null
  is_off_market?: boolean | null
  monthly_rent?: number | null
}

interface GeocodedPromptProps {
  address: string | null
  addressComponents?: { city?: string; state?: string; zip_code?: string }
  isGeocoding: boolean
  onClose: () => void
  propertyPreview?: OffMarketPreview | null
  isLoadingPreview?: boolean
}

function formatValue(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function GeocodedPrompt({
  address,
  addressComponents,
  isGeocoding,
  onClose,
  propertyPreview,
  isLoadingPreview,
}: GeocodedPromptProps) {
  const router = useRouter()

  if (!isGeocoding && !address) return null

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!address) return
    const params = new URLSearchParams({ address })
    if (addressComponents?.city) params.set('city', addressComponents.city)
    if (addressComponents?.state) params.set('state', addressComponents.state)
    if (addressComponents?.zip_code) params.set('zip_code', addressComponents.zip_code)
    router.push(`/verdict?${params.toString()}`)
  }

  const hasPreview = !!propertyPreview && !isLoadingPreview

  return (
    <div
      className="rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      {/* Header: icon + address + close */}
      <div className="flex items-start gap-3 p-3.5 pb-2">
        <div
          className="flex-shrink-0 p-2 rounded-lg mt-0.5"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {isGeocoding ? (
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-sky)' }} />
          ) : (
            <MapPin size={18} style={{ color: 'var(--accent-sky)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isGeocoding ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Looking up address...
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                {hasPreview && propertyPreview.is_off_market ? 'Off Market' : 'Property at this location'}
              </p>
              <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
                {address}
              </p>
            </>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity"
        >
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Property preview details */}
      {!isGeocoding && address && (
        <div className="px-3.5">
          {isLoadingPreview && (
            <div className="flex items-center gap-2 py-2" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading property details...</span>
            </div>
          )}

          {hasPreview && (
            <div className="space-y-2 pt-1 pb-1">
              {/* Value + Rent row */}
              <div className="flex items-baseline gap-4">
                {propertyPreview.estimated_value != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Est. Value
                    </p>
                    <p className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                      {formatValue(propertyPreview.estimated_value)}
                    </p>
                  </div>
                )}
                {propertyPreview.monthly_rent != null && propertyPreview.monthly_rent > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Est. Rent
                    </p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {formatValue(propertyPreview.monthly_rent)}/mo
                    </p>
                  </div>
                )}
              </div>

              {/* Property details */}
              <div className="flex items-center gap-3 flex-wrap">
                {propertyPreview.bedrooms != null && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Bed size={13} /> {propertyPreview.bedrooms} bd
                  </span>
                )}
                {propertyPreview.bathrooms != null && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Bath size={13} /> {propertyPreview.bathrooms} ba
                  </span>
                )}
                {propertyPreview.sqft != null && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Ruler size={13} /> {new Intl.NumberFormat('en-US').format(propertyPreview.sqft)} sqft
                  </span>
                )}
                {propertyPreview.year_built != null && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={13} /> {propertyPreview.year_built}
                  </span>
                )}
              </div>

              {/* Property type badge */}
              {propertyPreview.property_type && (
                <span
                  className="inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                >
                  {propertyPreview.property_type}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analyze button */}
      {address && !isGeocoding && (
        <div className="px-3.5 pb-3.5 pt-2">
          <button
            onClick={handleAnalyze}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Analyze This Property <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
