'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bed, Bath, Ruler, Calendar, Clock, ArrowRight, TrendingUp } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'
import { normalizeListingStatus, displayListingStatus } from '@/lib/dealSignal'

function getPhotoSrc(listing: MapListing): string | null {
  if (listing.photo_url) return listing.photo_url
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${listing.latitude},${listing.longitude}&key=${apiKey}`
}

interface PropertyCardListProps {
  listings: MapListing[]
  dealSignals: Map<string, DealSignalResult>
  selectedId: string | null
  onSelectListing: (listing: MapListing) => void
  isLoading: boolean
}

function formatPrice(price: number | null): string {
  if (price == null) return 'Price N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function formatPricePerSqft(price: number | null, sqft: number | null): string | null {
  if (price == null || sqft == null || sqft <= 0) return null
  return `$${Math.round(price / sqft)}/sqft`
}

function formatSqft(sqft: number | null): string | null {
  if (sqft == null) return null
  return new Intl.NumberFormat('en-US').format(sqft)
}

function domColor(dom: number): string {
  if (dom < 30) return 'var(--status-positive)'
  if (dom < 90) return 'var(--status-warning)'
  return 'var(--status-negative)'
}

function statusColor(raw: string | null): string {
  const canonical = normalizeListingStatus(raw)
  if (canonical === 'active') return 'var(--status-positive)'
  if (canonical === 'pending') return 'var(--status-warning)'
  if (canonical === 'foreclosure' || canonical === 'pre-foreclosure' || canonical === 'auction') {
    return 'var(--status-negative)'
  }
  return 'var(--text-secondary)'
}

function PropertyCard({
  listing,
  signal,
  isSelected,
  onSelect,
  cardRef,
}: {
  listing: MapListing
  signal: DealSignalResult | undefined
  isSelected: boolean
  onSelect: () => void
  cardRef: (el: HTMLDivElement | null) => void
}) {
  const router = useRouter()
  const ppsqft = formatPricePerSqft(listing.price, listing.sqft)
  const [imgFailed, setImgFailed] = useState(false)
  const photoSrc = imgFailed ? null : getPhotoSrc(listing)

  const handleAnalyze = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const params = new URLSearchParams({ address: listing.address })
      if (listing.city) params.set('city', listing.city)
      if (listing.state) params.set('state', listing.state)
      if (listing.zip_code) params.set('zip_code', listing.zip_code)
      router.push(`/verdict?${params.toString()}`)
    },
    [router, listing],
  )

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: isSelected ? '2px solid var(--accent-sky)' : '1px solid var(--border-default)',
        boxShadow: isSelected ? '0 0 0 1px var(--accent-sky)' : 'var(--shadow-card)',
      }}
    >
      {/* Photo row with deal signal badge */}
      <div className="relative h-28 overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={listing.address}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No Photo</span>
          </div>
        )}

        {/* Deal Signal badge */}
        {signal && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold"
            style={{
              backgroundColor: 'rgba(0,0,0,0.75)',
              color: signal.color,
            }}
          >
            <TrendingUp size={11} />
            {signal.score}
          </div>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-2 left-2 flex items-baseline gap-1.5">
          <span
            className="px-2 py-0.5 rounded text-sm font-bold"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff' }}
          >
            {formatPrice(listing.price)}
          </span>
          {ppsqft && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}
            >
              {ppsqft}
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Address */}
        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
          {listing.address}
        </h3>
        {(listing.city || listing.state) && (
          <p className="text-xs truncate -mt-1" style={{ color: 'var(--text-secondary)' }}>
            {[listing.city, listing.state].filter(Boolean).join(', ')}
            {listing.zip_code ? ` ${listing.zip_code}` : ''}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Bed size={12} /> {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Bath size={12} /> {listing.bathrooms}
            </span>
          )}
          {formatSqft(listing.sqft) && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Ruler size={12} /> {formatSqft(listing.sqft)}
            </span>
          )}
          {listing.year_built != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={12} /> {listing.year_built}
            </span>
          )}
        </div>

        {/* Status + DOM row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {listing.listing_status && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: statusColor(listing.listing_status),
                }}
              >
                {displayListingStatus(listing.listing_status)}
              </span>
            )}
            {listing.days_on_market != null && (
              <span
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: domColor(listing.days_on_market) }}
              >
                <Clock size={10} />
                {listing.days_on_market}d
              </span>
            )}
          </div>
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Analyze <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PropertyCardList({
  listings,
  dealSignals,
  selectedId,
  onSelectListing,
  isLoading,
}: PropertyCardListProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new globalThis.Map())

  useEffect(() => {
    if (!selectedId) return
    const el = cardRefs.current.get(selectedId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId])

  const setCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el)
    } else {
      cardRefs.current.delete(id)
    }
  }, [])

  if (isLoading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-2">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: 'var(--accent-sky)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Searching properties...
          </p>
        </div>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
            No properties found
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Try adjusting filters or zooming to a different area
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-3 py-2 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
          {listings.length} {listings.length === 1 ? 'property' : 'properties'}
        </span>
        <span
          className="flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--text-secondary)' }}
          title="Estimated deal potential based on price, market time, and listing status. Run full analysis for detailed DealGap."
        >
          <TrendingUp size={10} />
          Sorted by Deal Signal
        </span>
      </div>

      {/* Card list */}
      <div className="p-2 space-y-2">
        {listings.map((listing) => (
          <PropertyCard
            key={listing.id}
            listing={listing}
            signal={dealSignals.get(listing.id)}
            isSelected={listing.id === selectedId}
            onSelect={() => onSelectListing(listing)}
            cardRef={setCardRef(listing.id)}
          />
        ))}
      </div>
    </div>
  )
}
