'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ArrowRight, Layers, Download, FileSpreadsheet } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult, SortOption } from '@/lib/dealSignal'
import { displayListingStatus } from '@/lib/dealSignal'
import { useListingPhoto } from './listingPhoto'
import { navigateToDiscoveryFromMap } from './mapDiscoveryNavigation'
import { MapViewModeToggle } from './MapViewModeToggle'

const SORT_LABELS: Record<SortOption, string> = {
  deal_signal: 'Opportunity',
  price_asc: 'Price (low → high)',
  price_desc: 'Price (high → low)',
  dom_desc: 'Days on market',
  newest: 'Newest listed',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  foreclosure: 'Foreclosure',
  'pre-foreclosure': 'Pre-Foreclosure',
  auction: 'Auction',
}

interface PropertyListViewProps {
  listings: MapListing[]
  dealSignals: Map<string, DealSignalResult>
  selectedListingId: string | null
  onSelectListing: (listing: MapListing) => void
  isLoading: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onClearSelection: () => void
  onExportCsv: () => void
  onExportExcel: () => void
  viewMode: 'map' | 'list'
  onViewModeChange: (mode: 'map' | 'list') => void
  activeStatuses?: string[]
  onResetStatuses?: () => void
  sortBy?: SortOption
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

function PropertyListRow({
  listing,
  signal,
  isHighlighted,
  isChecked,
  onToggleSelect,
  onSelect,
}: {
  listing: MapListing
  signal: DealSignalResult | undefined
  isHighlighted: boolean
  isChecked: boolean
  onToggleSelect: () => void
  onSelect: () => void
}) {
  const router = useRouter()
  const ppsqft = formatPricePerSqft(listing.price, listing.sqft)
  const { src: photoSrc, handleError: handlePhotoError } = useListingPhoto(listing, {
    streetViewSize: '160x120',
  })

  const handleAnalyze = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigateToDiscoveryFromMap(router, listing)
    },
    [router, listing],
  )

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleSelect()
    },
    [onToggleSelect],
  )

  const locationLine = [listing.city, listing.state].filter(Boolean).join(', ')
  const locationSuffix = listing.zip_code ? ` ${listing.zip_code}` : ''
  const statsParts: string[] = []
  if (locationLine || locationSuffix) statsParts.push(`${locationLine}${locationSuffix}`.trim())
  if (listing.bedrooms != null) statsParts.push(`${listing.bedrooms} bd`)
  if (listing.bathrooms != null) statsParts.push(`${listing.bathrooms} ba`)
  if (formatSqft(listing.sqft)) statsParts.push(`${formatSqft(listing.sqft)} sqft`)
  if (ppsqft) statsParts.push(ppsqft)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="flex items-stretch gap-2 p-2 rounded-lg cursor-pointer transition-colors"
      style={{
        backgroundColor: isHighlighted ? 'var(--surface-elevated)' : 'var(--surface-card)',
        border: isHighlighted
          ? '2px solid var(--accent-sky)'
          : '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center shrink-0">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleSelect()}
          onClick={handleCheckboxClick}
          aria-label={`Select ${listing.address}`}
          className="h-4 w-4 rounded accent-[var(--accent-sky)]"
        />
      </div>

      <div
        className="relative shrink-0 w-24 h-16 rounded-md overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handlePhotoError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              No Photo
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-heading)' }}
          >
            {listing.address}
          </h3>
          <span
            className="text-sm font-bold whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-heading)' }}
          >
            {formatPrice(listing.price)}
          </span>
        </div>

        {statsParts.length > 0 && (
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {statsParts.join(' · ')}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {signal && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold truncate"
                style={{ color: signal.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: signal.color }}
                  aria-hidden
                />
                {signal.label}
              </span>
            )}
            {listing.listing_status && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0"
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
                className="flex items-center gap-0.5 text-[10px] font-medium shrink-0"
                style={{ color: signal?.color ?? domColor(listing.days_on_market) }}
              >
                <Clock size={10} aria-hidden />
                {listing.days_on_market}d
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-90 shrink-0"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            Analyze <ArrowRight size={10} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PropertyListView({
  listings,
  dealSignals,
  selectedListingId,
  onSelectListing,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onExportCsv,
  onExportExcel,
  viewMode,
  onViewModeChange,
  activeStatuses,
  onResetStatuses,
  sortBy = 'deal_signal',
}: PropertyListViewProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)
  const allSelected = listings.length > 0 && selectedIds.size === listings.length
  const someSelected = selectedIds.size > 0 && !allSelected
  const exportCount = selectedIds.size > 0 ? selectedIds.size : listings.length
  const exportScopeLabel = selectedIds.size > 0 ? 'Selected' : 'All'

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  if (isLoading && listings.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full p-8"
        style={{ backgroundColor: 'var(--surface-base)' }}
      >
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
    const hasStatusFilter = (activeStatuses?.length ?? 0) > 0
    const onlyDistressed = hasStatusFilter && (activeStatuses ?? []).every((s) => s !== 'active')
    const statusList = (activeStatuses ?? []).map((s) => STATUS_LABELS[s] ?? s).join(', ')

    return (
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'var(--surface-base)' }}
      >
        <div
          className="sticky top-0 z-10 px-3 py-2 flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
            0 properties
          </span>
          <MapViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            listingCount={0}
          />
        </div>
        <div className="flex items-center justify-center flex-1 p-8">
          <div className="text-center space-y-2 max-w-xs">
            <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
              No properties found
            </p>
            {hasStatusFilter ? (
              <>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {onlyDistressed
                    ? `No ${statusList} listings in this area right now. Distressed inventory is sparse — try a wider view or a different market.`
                    : `No ${statusList} listings in this area. Try widening filters or panning the map.`}
                </p>
                {onResetStatuses && (
                  <button
                    type="button"
                    onClick={onResetStatuses}
                    className="text-xs font-semibold underline-offset-2 hover:underline"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    Reset to Active listings
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Switch to Map view and adjust filters or zoom to a different area
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--surface-base)' }}>
      <div
        className="sticky top-0 z-10 px-3 py-2 space-y-2"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              aria-label="Select all properties"
              className="h-4 w-4 rounded accent-[var(--accent-sky)]"
            />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
              {listings.length} {listings.length === 1 ? 'property' : 'properties'}
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[10px] font-semibold underline-offset-2 hover:underline"
                style={{ color: 'var(--accent-sky)' }}
              >
                {selectedIds.size} selected · Clear
              </button>
            )}
          </div>
          <MapViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            listingCount={listings.length}
          />
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{ color: 'var(--text-secondary)' }}
            title={
              sortBy === 'deal_signal'
                ? 'Marker colors rank motivation (distressed, time on market, FSBO). Same priority when Opportunity sort is selected.'
                : undefined
            }
          >
            <Layers size={10} aria-hidden />
            Sorted by {SORT_LABELS[sortBy]}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportCsv}
              disabled={exportCount === 0}
              title={`Export ${exportScopeLabel.toLowerCase()} listings as CSV`}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-heading)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Download size={11} aria-hidden />
              CSV ({exportCount})
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              disabled={exportCount === 0}
              title={`Export ${exportScopeLabel.toLowerCase()} listings as Excel`}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-heading)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <FileSpreadsheet size={11} aria-hidden />
              Excel ({exportCount})
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {listings.map((listing) => (
          <PropertyListRow
            key={listing.id}
            listing={listing}
            signal={dealSignals.get(listing.id)}
            isHighlighted={listing.id === selectedListingId}
            isChecked={selectedIds.has(listing.id)}
            onToggleSelect={() => onToggleSelect(listing.id)}
            onSelect={() => onSelectListing(listing)}
          />
        ))}
      </div>
    </div>
  )
}
