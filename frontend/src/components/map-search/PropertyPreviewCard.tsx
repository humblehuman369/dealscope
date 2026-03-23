'use client'

import { useRouter } from 'next/navigation'
import { X, Bed, Bath, Ruler, Calendar, ArrowRight } from 'lucide-react'
import type { MapListing } from '@/lib/api'

interface PropertyPreviewCardProps {
  listing: MapListing
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

function formatSqft(sqft: number | null): string {
  if (sqft == null) return '—'
  return new Intl.NumberFormat('en-US').format(sqft)
}

export function PropertyPreviewCard({ listing, onClose }: PropertyPreviewCardProps) {
  const router = useRouter()

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const params = new URLSearchParams({ address: listing.address })
    if (listing.city) params.set('city', listing.city)
    if (listing.state) params.set('state', listing.state)
    if (listing.zip_code) params.set('zip_code', listing.zip_code)
    router.push(`/verdict?${params.toString()}`)
  }

  return (
    <div
      className="w-[340px] rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Photo / placeholder */}
      <div className="relative h-36 overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        {listing.photo_url ? (
          <img src={listing.photo_url} alt={listing.address} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl" style={{ color: 'var(--text-secondary)' }}>
              No Photo
            </span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          <X size={14} />
        </button>
        <div
          className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md text-sm font-bold"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
        >
          {formatPrice(listing.price)}
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
          {listing.address}
        </h3>

        <div className="flex items-center gap-3 mt-2">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Bed size={13} /> {listing.bedrooms} bd
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Bath size={13} /> {listing.bathrooms} ba
            </span>
          )}
          {listing.sqft != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Ruler size={13} /> {formatSqft(listing.sqft)} sqft
            </span>
          )}
          {listing.year_built != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={13} /> {listing.year_built}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {listing.property_type && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
              >
                {listing.property_type}
              </span>
            )}
            {listing.days_on_market != null && (
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {listing.days_on_market}d on market
              </span>
            )}
          </div>
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Analyze <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
