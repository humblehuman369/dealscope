'use client'

import { useRouter } from 'next/navigation'
import { X, Bed, Bath, Ruler, Calendar, Clock, ArrowRight, Check, EyeOff } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'
import { displayListingStatus } from '@/lib/dealSignal'
import { useListingPhoto } from './listingPhoto'
import {
  buildDiscoverySearchParams,
  navigateToDiscoveryFromMapPath,
  useMapSelectionDestination,
  mapSelectionCtaLabel,
} from './mapDiscoveryNavigation'
import { markPinReviewed, pinKey, useMapPinMarks, type PinMark } from './mapPinState'
import { getZipRentScreen, zipRentRatioColor } from './zipRentScreen'

interface PropertyPreviewCardProps {
  listing: MapListing
  signal?: DealSignalResult
  onClose: () => void
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

function formatSqft(sqft: number | null): string {
  if (sqft == null) return '—'
  return new Intl.NumberFormat('en-US').format(sqft)
}

function domColor(dom: number): string {
  if (dom < 30) return 'var(--status-positive)'
  if (dom < 90) return 'var(--status-warning)'
  return 'var(--status-negative)'
}

export function PropertyPreviewCard({ listing, signal, onClose }: PropertyPreviewCardProps) {
  const router = useRouter()
  const ctaLabel = mapSelectionCtaLabel(useMapSelectionDestination())
  const ppsqft = formatPricePerSqft(listing.price, listing.sqft)
  const { src: photoSrc, handleError: handlePhotoError } = useListingPhoto(listing, {
    streetViewSize: '600x400',
  })

  const { marks, setMark } = useMapPinMarks()
  const key = pinKey(listing)
  const mark = marks[key]
  const rentScreen = getZipRentScreen(listing)

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    markPinReviewed(listing)
    const params = buildDiscoverySearchParams(listing)
    navigateToDiscoveryFromMapPath(router, `/discovery?${params.toString()}`)
  }

  const toggleMark = (next: PinMark) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setMark(key, mark === next ? null : next)
  }

  return (
    <div
      className="w-[340px] rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Photo / Street View fallback */}
      <div
        className="relative h-36 overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={listing.address}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={handlePhotoError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              No Photo
            </span>
          </div>
        )}

        {/* Opportunity / deal-signal badge — matches list-card placement */}
        {signal && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold leading-tight max-w-[calc(100%-3rem)]"
            style={{
              backgroundColor: 'rgba(0,0,0,0.75)',
              color: signal.color,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: signal.color }}
              aria-hidden
            />
            <span className="truncate">{signal.label}</span>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          <X size={14} />
        </button>

        {/* Price + price-per-sqft overlay — matches list-card */}
        <div className="absolute bottom-2 left-2 flex items-baseline gap-1.5">
          <span
            className="px-2.5 py-1 rounded-md text-sm font-bold"
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

      {/* Details */}
      <div className="p-3 space-y-2">
        {/* Address + city/state/zip — matches list-card */}
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
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Bed size={13} /> {listing.bedrooms}
            </span>
          )}
          {listing.bathrooms != null && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Bath size={13} /> {listing.bathrooms}
            </span>
          )}
          {listing.sqft != null && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Ruler size={13} /> {formatSqft(listing.sqft)}
            </span>
          )}
          {listing.year_built != null && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Calendar size={13} /> {listing.year_built}
            </span>
          )}
        </div>

        {/* ZIP rent-vs-price screen. Explicitly a market screen: the label
            names the basis and the caption says what it is not, because an
            investor mistaking a ZIP median for this property's rent is a
            worse outcome than showing nothing. */}
        {rentScreen && (
          <div
            className="rounded-lg px-2 py-1.5 space-y-0.5"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Rent vs price
              </span>
              {rentScreen.ratioLabel && (
                <span
                  className="text-xs font-bold"
                  style={{ color: zipRentRatioColor(listing.zip_rent_to_price) }}
                >
                  {rentScreen.ratioLabel}/mo of price
                </span>
              )}
            </div>
            <p className="text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              {rentScreen.rentLabel} {rentScreen.basisLabel} — a ZIP market screen, not an
              estimate for this home.
            </p>
          </div>
        )}

        {/* Status + DOM + Analyze — matches list-card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {listing.listing_status && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: signal?.color ?? 'var(--text-secondary)',
                }}
              >
                {displayListingStatus(listing.listing_status)}
              </span>
            )}
            {listing.days_on_market != null && (
              <span
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{
                  color: signal?.color ?? domColor(listing.days_on_market),
                }}
              >
                <Clock size={10} />
                {listing.days_on_market}d
              </span>
            )}
          </div>
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            {ctaLabel} <ArrowRight size={12} />
          </button>
        </div>

        {/* Worked state — lets an investor retire a pin so a farm area
            actually narrows instead of re-presenting the same rejects. */}
        <div className="flex items-center gap-1.5 pt-1">
          <PinMarkButton
            active={mark === 'reviewed'}
            onClick={toggleMark('reviewed')}
            color="var(--accent-sky)"
            icon={<Check size={11} aria-hidden />}
            label="Reviewed"
          />
          <PinMarkButton
            active={mark === 'passed'}
            onClick={toggleMark('passed')}
            color="var(--text-secondary)"
            icon={<EyeOff size={11} aria-hidden />}
            label="Pass"
          />
        </div>
      </div>
    </div>
  )
}

function PinMarkButton({
  active,
  onClick,
  color,
  icon,
  label,
}: {
  active: boolean
  onClick: (e: React.MouseEvent) => void
  color: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold flex-1 justify-center transition-opacity hover:opacity-90"
      style={{
        backgroundColor: active ? color : 'var(--surface-elevated)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? color : 'var(--border-subtle)'}`,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
