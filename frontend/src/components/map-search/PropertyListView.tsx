'use client'

import { useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Clock,
  ArrowRight,
  Layers,
  Download,
  FileSpreadsheet,
  Lock,
  Check,
  EyeOff,
  AlertTriangle,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult, SortOption } from '@/lib/dealSignal'
import { displayListingStatus } from '@/lib/dealSignal'
import { DIRECTORY_ACCESS_NOTE } from '@/lib/planFeatures'
import { useListingPhoto } from './listingPhoto'
import {
  navigateToDiscoveryFromMap,
  useMapSelectionDestination,
  mapSelectionCtaLabel,
} from './mapDiscoveryNavigation'
import { MapViewModeToggle } from './MapViewModeToggle'
import { pinKey, useMapPinMarks, type PinMark } from './mapPinState'
import { getZipRentScreen, zipRentRatioColor } from './zipRentScreen'

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
  /** Bulk export is paid-only (see planFeatures.ts DIRECTORY_ACCESS_NOTE). */
  canExport: boolean
  /** Queue the current selection for Deal Gap ranking. */
  onAnalyzeSelected: () => void
  isAnalyzing: boolean
  viewMode: 'map' | 'list'
  onViewModeChange: (mode: 'map' | 'list') => void
  activeStatuses?: string[]
  onResetStatuses?: () => void
  sortBy?: SortOption
  /** True when the viewport holds more listings than one search returns. */
  resultsArePartial?: boolean
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
  const ctaLabel = mapSelectionCtaLabel(useMapSelectionDestination())
  const ppsqft = formatPricePerSqft(listing.price, listing.sqft)
  const { src: photoSrc, handleError: handlePhotoError } = useListingPhoto(listing, {
    streetViewSize: '160x120',
  })

  const { marks, setMark } = useMapPinMarks()
  const key = pinKey(listing)
  const mark = marks[key]
  const rentScreen = getZipRentScreen(listing)

  const handleMark = useCallback(
    (next: PinMark) => (e: React.MouseEvent) => {
      e.stopPropagation()
      setMark(key, mark === next ? null : next)
    },
    [setMark, key, mark],
  )

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
        opacity: mark === 'passed' && !isHighlighted ? 0.5 : undefined,
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

        {rentScreen && (
          <p className="text-[10px] truncate" title={rentScreen.disclosure}>
            <span
              className="font-bold"
              style={{ color: zipRentRatioColor(listing.zip_rent_to_price) }}
            >
              {rentScreen.ratioLabel ? `${rentScreen.ratioLabel} rent/price` : rentScreen.rentLabel}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}
              · {rentScreen.rentLabel} {rentScreen.basisLabel}
            </span>
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleMark('reviewed')}
              aria-pressed={mark === 'reviewed'}
              aria-label={`Mark ${listing.address} reviewed`}
              title="Reviewed"
              className="flex items-center justify-center h-[22px] w-[22px] rounded-md transition-opacity hover:opacity-90"
              style={{
                backgroundColor:
                  mark === 'reviewed' ? 'var(--accent-sky)' : 'var(--surface-elevated)',
                color: mark === 'reviewed' ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${mark === 'reviewed' ? 'var(--accent-sky)' : 'var(--border-subtle)'}`,
              }}
            >
              <Check size={11} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleMark('passed')}
              aria-pressed={mark === 'passed'}
              aria-label={`Pass on ${listing.address}`}
              title="Pass"
              className="flex items-center justify-center h-[22px] w-[22px] rounded-md transition-opacity hover:opacity-90"
              style={{
                backgroundColor:
                  mark === 'passed' ? 'var(--text-secondary)' : 'var(--surface-elevated)',
                color: mark === 'passed' ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${mark === 'passed' ? 'var(--text-secondary)' : 'var(--border-subtle)'}`,
              }}
            >
              <EyeOff size={11} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
            >
              {ctaLabel} <ArrowRight size={10} aria-hidden />
            </button>
          </div>
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
  canExport,
  onAnalyzeSelected,
  isAnalyzing,
  viewMode,
  onViewModeChange,
  activeStatuses,
  onResetStatuses,
  sortBy = 'deal_signal',
  resultsArePartial = false,
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
          />
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
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
            {/* Sorting runs over what the providers returned, not over the
                whole market. Saying so is the difference between a ranking
                the investor can trust and one that quietly misleads. */}
            {resultsArePartial && (
              <span
                className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: 'var(--status-warning)' }}
                title="This viewport holds more listings than one search returns, so the ranking covers a sample of it. Zoom in to rank a complete area."
              >
                <AlertTriangle size={10} aria-hidden />
                within a partial sample — zoom in to rank it all
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
          {/* Ranking is the primary action, so it leads — but only on an
              explicit selection. Each property spends one analysis from the
              monthly quota, and defaulting to "all visible" would burn a
              Starter plan's entire month on one click. */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={onAnalyzeSelected}
              disabled={isAnalyzing}
              title={`Analyze ${selectedIds.size} selected and rank by Deal Gap`}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
            >
              {isAnalyzing ? (
                <Loader2 size={11} className="animate-spin" aria-hidden />
              ) : (
                <TrendingUp size={11} aria-hidden />
              )}
              Rank by Deal Gap ({selectedIds.size})
            </button>
          )}
          {canExport ? (
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
          ) : (
            <Link
              href="/pricing"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-opacity hover:opacity-90"
              title={DIRECTORY_ACCESS_NOTE}
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--accent-sky)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Lock size={11} aria-hidden />
              Export ({exportCount}) — Pro
            </Link>
          )}
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
