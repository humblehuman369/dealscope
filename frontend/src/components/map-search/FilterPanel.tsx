'use client'

import { useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  Bookmark,
  ChevronDown,
  Gavel,
  Hammer,
  Loader2,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import type { MapSearchFilters } from '@/hooks/useMapSearch'
import { DISTRESSED_MARKER_COLOR, type SortOption } from '@/lib/dealSignal'
import { SectionHelpTooltip } from '@/components/map-search/SectionHelpTooltip'
import {
  type MapOverlayChrome,
  getMapFilterPanelOpenChrome,
  MAP_FILTER_LIGHT_CONTROLS,
} from '@/components/map-search/mapOverlayChrome'
import {
  CLEARED_OWNER_LEADS,
  OWNER_TENURE_BUCKETS,
  isOwnerRecordsActive,
  nextOwnerAvailability,
  nextOwnerOccupancy,
  ownerAvailabilityIsSelected,
  ownerLeadsPatch,
  toggleTenureBucket,
} from '@/components/map-search/ownerLeadsFilters'

interface FilterPanelProps {
  filters: MapSearchFilters
  onChange: (next: Partial<MapSearchFilters>) => void
  totalCount: number
  isLoading: boolean
  /** False until the first map-search response arrives. Hides a flash of "0 results". */
  hasSearchResponded?: boolean
  isOpen: boolean
  onToggle: () => void
  /** When true, render the "Save view as default" action inside the panel. */
  canSaveDefaultView?: boolean
  /** Persist the current map center's ZIP as the user's default location. */
  onSaveDefaultView?: () => void | Promise<void>
  /** Disables the Save-default action while the request is in flight. */
  savingDefaultView?: boolean
  /**
   * When set, panel surfaces follow map tile light/dark instead of global theme.
   */
  overlayChrome?: MapOverlayChrome | null
  /**
   * When true, the collapsed Filters chip is laid out by the parent toolbar
   * (flex row with the search bar). When false, it uses absolute top-right.
   */
  dockCollapsedInline?: boolean
  /**
   * When true, pills/selects/inputs use light surfaces so they match a light
   * map panel even if the global app theme is dark.
   */
  mapLightChrome?: boolean
  /** Fired when the pointer enters the open filter panel (auto-close cancel). */
  onPanelMouseEnter?: () => void
  /** Fired when the pointer leaves the open filter panel (auto-close schedule). */
  onPanelMouseLeave?: () => void
}

const LISTING_TYPES: { value: 'sale' | 'rental'; label: string }[] = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rental', label: 'For Rent' },
]

/**
 * Independent For Sale / For Rent toggles, mapped onto the API's single
 * `listing_type` (`sale` | `rental` | `both`). Refusing to clear the last
 * selected pill keeps the request valid — the API has no empty value, and
 * mapping "neither" to `both` would look like both pills are pressed.
 */
export function nextListingType(
  current: MapSearchFilters['listing_type'],
  toggled: 'sale' | 'rental',
): MapSearchFilters['listing_type'] {
  const saleOn = current === 'both' || current === 'sale'
  const rentOn = current === 'both' || current === 'rental'
  const nextSale = toggled === 'sale' ? !saleOn : saleOn
  const nextRent = toggled === 'rental' ? !rentOn : rentOn
  if (nextSale && nextRent) return 'both'
  if (nextSale) return 'sale'
  if (nextRent) return 'rental'
  return current
}

export function listingTypeIsSelected(
  current: MapSearchFilters['listing_type'],
  which: 'sale' | 'rental',
): boolean {
  return current === 'both' || current === which
}

const PROPERTY_TYPES = [
  { value: '', label: 'Any' },
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Multi-Family', label: 'Multi-Family' },
]

const BEDROOM_OPTIONS = [
  { value: undefined, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
]

/** Matches map distressed pin color in dealSignal.ts (markerColorForCategory distressed). */
const DISTRESSED_MARKER_DOT = DISTRESSED_MARKER_COLOR

/** Matches map expired pin color in dealSignal.ts (markerColorForCategory expired). */
const EXPIRED_MARKER_DOT = '#8B5CF6'

const CORE_LISTING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'owner_listed', label: 'Owner Listed' },
]

const DISTRESSED_LISTING_STATUS_OPTIONS: {
  value: string
  label: string
  dotColor: string
  Icon: typeof Gavel
}[] = [
  { value: 'foreclosure', label: 'Foreclosure', dotColor: DISTRESSED_MARKER_DOT, Icon: Hammer },
  { value: 'auction', label: 'Auction', dotColor: DISTRESSED_MARKER_DOT, Icon: Gavel },
  {
    value: 'pre-foreclosure',
    label: 'Pre-Foreclosure',
    dotColor: DISTRESSED_MARKER_DOT,
    Icon: AlertTriangle,
  },
]

const DISTRESSED_STATUS_VALUES = new Set(DISTRESSED_LISTING_STATUS_OPTIONS.map((o) => o.value))

const DOM_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Any' },
  { value: 30, label: '30+' },
  { value: 60, label: '60+' },
  { value: 90, label: '90+' },
  { value: 120, label: '120+' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'deal_signal', label: 'Opportunity' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'dom_desc', label: 'Days on Market' },
  { value: 'newest', label: 'Newest' },
]

export function parsePriceFilterInput(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const num = Number(trimmed)
  return Number.isFinite(num) && num >= 0 ? num : undefined
}

export function filterResultsCountText(input: {
  isLoading: boolean
  motivatedSellerSearch: boolean
  hasSearchResponded: boolean
  totalCount: number
}): string | null {
  if (input.isLoading) {
    return input.motivatedSellerSearch
      ? 'Scanning motivated-seller keywords…'
      : 'Searching...'
  }
  if (!input.hasSearchResponded) return null
  return `${input.totalCount} results`
}

function PillButton({
  active,
  onClick,
  children,
  leading,
  mapLightChrome,
  idleControl,
  'aria-pressed': ariaPressed,
  'aria-label': ariaLabel,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  leading?: React.ReactNode
  mapLightChrome?: boolean
  idleControl?: {
    backgroundColor: string
    color: string
    border?: string
  }
  'aria-pressed'?: boolean
  'aria-label'?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${className ?? ''}`}
      style={{
        backgroundColor: active
          ? 'var(--accent-sky)'
          : idleControl?.backgroundColor ??
            (mapLightChrome ? MAP_FILTER_LIGHT_CONTROLS.idleBg : 'var(--surface-elevated)'),
        color: active
          ? '#fff'
          : idleControl?.color ??
            (mapLightChrome ? MAP_FILTER_LIGHT_CONTROLS.idleText : 'var(--text-body)'),
        border: active
          ? undefined
          : idleControl?.border ??
            (mapLightChrome ? MAP_FILTER_LIGHT_CONTROLS.idleBorder : undefined),
      }}
    >
      {leading}
      {children}
    </button>
  )
}

export function FilterPanel({
  filters,
  onChange,
  totalCount,
  isLoading,
  hasSearchResponded = true,
  isOpen,
  onToggle,
  canSaveDefaultView = false,
  onSaveDefaultView,
  savingDefaultView = false,
  overlayChrome = null,
  dockCollapsedInline = false,
  mapLightChrome = false,
  onPanelMouseEnter,
  onPanelMouseLeave,
}: FilterPanelProps) {
  const handlePriceChange = useCallback(
    (field: 'min_price' | 'max_price', raw: string) => {
      onChange({ [field]: parsePriceFilterInput(raw) })
    },
    [onChange],
  )

  const toggleListingStatus = useCallback(
    (status: string) => {
      const current = filters.listing_statuses
      const isAdding = !current.includes(status)
      const next = isAdding ? [...current, status] : current.filter((s) => s !== status)
      // Standard status filters and Owner Leads (RentCast records) are mutually
      // exclusive search modes — owner-records mode replaces standard sources and
      // ignores listing_statuses, so leaving owner filters set would return
      // off-market records that the status filter then drops (0 results). Turning
      // a status on clears Owner Leads + motivated-seller so the search actually runs.
      onChange({
        listing_statuses: next,
        ...(isAdding
          ? {
              ...CLEARED_OWNER_LEADS,
              motivated_seller_search: false,
            }
          : {}),
      })
    },
    [filters.listing_statuses, onChange],
  )

  // Owner-records mode (RentCast property records) is active when any Owner Leads
  // pill is on: tenure, occupancy, or availability.
  const ownerRecordsActive = isOwnerRecordsActive(filters)

  const activeFilterCount = [
    filters.property_type,
    filters.min_price,
    filters.max_price,
    filters.bedrooms,
    filters.bathrooms,
    filters.listing_statuses.length > 0 ? true : undefined,
    filters.min_dom,
    filters.motivated_seller_search ? true : undefined,
    ownerRecordsActive ? true : undefined,
  ].filter(Boolean).length

  const hasDistressedStatusFilter = useMemo(
    () => filters.listing_statuses.some((s) => DISTRESSED_STATUS_VALUES.has(s)),
    [filters.listing_statuses],
  )

  const showCollapsedDistressedHint = !hasDistressedStatusFilter

  const chrome = overlayChrome ?? null
  const openChrome = getMapFilterPanelOpenChrome(mapLightChrome)
  const pillIdleControl = {
    backgroundColor: openChrome.controlIdleBg,
    color: openChrome.controlIdleText,
    border: openChrome.controlIdleBorder,
  }
  const labelColor = openChrome.sectionLabel
  const controlIdle = {
    backgroundColor: openChrome.controlIdleBg,
    color: openChrome.controlIdleText,
    border: openChrome.controlIdleBorder,
  }
  const resultsText = filterResultsCountText({
    isLoading,
    motivatedSellerSearch: !!filters.motivated_seller_search,
    hasSearchResponded,
    totalCount,
  })

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        aria-haspopup="dialog"
        className={`pointer-events-auto z-10 flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors max-w-[min(12rem,min(42vw,calc(100vw-13rem)))] shrink-0 ${
          dockCollapsedInline ? 'relative' : 'absolute top-3 right-3'
        }`}
        style={{
          backgroundColor: chrome?.backgroundColor ?? 'var(--surface-card)',
          color: chrome?.primaryText ?? 'var(--text-body)',
          border: `1px solid ${chrome?.borderColor ?? 'var(--border-default)'}`,
        }}
      >
        <span className="flex items-center gap-2 w-full">
          <SlidersHorizontal size={16} className="flex-shrink-0" aria-hidden />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount}
            </span>
          )}
        </span>
        {showCollapsedDistressedHint && (
          <span
            className="text-[10px] leading-snug pl-[1.375rem] w-full text-left"
            style={{ color: chrome?.secondaryText ?? 'var(--text-secondary)' }}
          >
            Foreclosure, auction &amp; pre-foreclosure
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      <style>{`
        @keyframes map-filter-panel-pop {
          from {
            opacity: 0.72;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        id="map-search-filters-panel"
        role="dialog"
        aria-label="Map search filters"
        className="pointer-events-auto absolute top-3 right-3 z-10 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl overflow-hidden"
        style={{
          backgroundColor: openChrome.panelBackground,
          border: openChrome.panelBorder,
          boxShadow: openChrome.panelShadow,
          animation: 'map-filter-panel-pop 340ms ease-out',
        }}
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: openChrome.headerBackground,
            borderBottom: openChrome.headerBorder,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal
              size={16}
              style={{ color: openChrome.headerIconColor }}
              className="flex-shrink-0"
            />
            <span
              className="text-sm font-semibold truncate"
              style={{ color: chrome?.primaryText ?? 'var(--text-heading)' }}
            >
              Filters
            </span>
            {resultsText ? (
              <span className="text-xs flex-shrink-0" style={{ color: openChrome.placeholder }}>
                {resultsText}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
            aria-label="Collapse filters"
          >
            <ChevronDown size={16} style={{ color: openChrome.headerIconColor }} />
          </button>
        </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Save current map view as the user's default landing location.
            Only shown to authenticated users (parent gates via canSaveDefaultView). */}
        {canSaveDefaultView && onSaveDefaultView && (
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: labelColor ?? 'var(--text-secondary)' }}
            >
              Default View
            </label>
            <button
              type="button"
              onClick={() => {
                void onSaveDefaultView()
              }}
              disabled={savingDefaultView}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full transition-opacity hover:opacity-90 disabled:opacity-50"
              style={controlIdle}
              aria-label="Save current map view as my default location"
            >
              {savingDefaultView ? (
                <Loader2 size={14} className="animate-spin flex-shrink-0" />
              ) : (
                <Bookmark
                  size={14}
                  className="flex-shrink-0"
                  style={{ color: 'var(--accent-sky)' }}
                />
              )}
              <span className="text-left leading-tight">
                {savingDefaultView ? 'Saving...' : 'Save view as default'}
              </span>
            </button>
            <p className="text-[10px] mt-1.5 leading-snug" style={{ color: openChrome.placeholder }}>
              Your next visit will open here.
            </p>
          </div>
        )}

        {/* Motivated Seller Search */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="motivated-seller-heading"
          style={{
            backgroundColor: openChrome.motivatedSeller.boxBg,
            border: openChrome.motivatedSeller.boxBorder,
          }}
        >
          <div>
            <h3
              id="motivated-seller-heading"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: openChrome.motivatedSeller.heading }}
            >
              Motivated Seller Search
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{ color: openChrome.motivatedSeller.body }}
            >
              Scans listings for the motivated-sellers. Replaces standard map results while
              enabled.
            </p>
          </div>
          <PillButton
            mapLightChrome={mapLightChrome}
            idleControl={pillIdleControl}
            active={Boolean(filters.motivated_seller_search)}
            onClick={() => {
              const next = !filters.motivated_seller_search
              onChange({
                motivated_seller_search: next,
                ...(next ? CLEARED_OWNER_LEADS : {}),
              })
            }}
            aria-label="Motivated seller keyword search. Replaces standard map results when enabled."
            leading={
              <Target
                size={12}
                className="flex-shrink-0 opacity-90"
                strokeWidth={2}
                aria-hidden
              />
            }
          >
            {filters.motivated_seller_search ? 'On' : 'Off'}
          </PillButton>
        </div>

        {/* Distressed deals */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="distressed-deals-heading"
          style={{
            backgroundColor: openChrome.distressed.boxBg,
            border: openChrome.distressed.boxBorder,
          }}
        >
          <div>
            <h3
              id="distressed-deals-heading"
              className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
              style={{ color: openChrome.distressed.heading }}
            >
              Distressed deals
              <SectionHelpTooltip
                label="Distressed deals"
                mapLightChrome={mapLightChrome}
                content="Foreclosure, auction, and pre-foreclosure listings appear as red pins on the map — often the highest-motivation seller pool."
              />
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{ color: openChrome.distressed.body }}
            >
              Foreclosure, auction &amp; pre-foreclosure — same red pins as the map legend.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {DISTRESSED_LISTING_STATUS_OPTIONS.map(({ value, label, dotColor, Icon }) => (
              <PillButton
                key={value}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.listing_statuses.includes(value)}
                onClick={() => toggleListingStatus(value)}
                aria-label={`${label} listings. Matches red distressed map markers. Toggle on or off.`}
                leading={
                  <>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                      aria-hidden
                    />
                    <Icon
                      size={12}
                      className="flex-shrink-0 opacity-90"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </>
                }
              >
                {label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Expired listings */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="expired-listings-heading"
          style={{
            backgroundColor: openChrome.expired.boxBg,
            border: openChrome.expired.boxBorder,
          }}
        >
          <div>
            <h3
              id="expired-listings-heading"
              className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
              style={{ color: openChrome.expired.heading }}
            >
              Expired Listings
              <SectionHelpTooltip
                label="Expired listings"
                mapLightChrome={mapLightChrome}
                content="Homes that were listed but did not sell — a motivated-seller signal. Verified live and dropped if back on market or sold."
              />
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{ color: openChrome.expired.body }}
            >
              Off-market homes that were listed but didn&apos;t sell (expired, withdrawn,
              cancelled, delisted) — a motivated-seller signal. Each candidate is verified
              live on Zillow and dropped if it&apos;s back on the market or already sold.
            </p>
          </div>
          <PillButton
            mapLightChrome={mapLightChrome}
            idleControl={pillIdleControl}
            active={filters.listing_statuses.includes('expired')}
            onClick={() => toggleListingStatus('expired')}
            aria-label="Expired listings. Toggle on or off."
            leading={
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: EXPIRED_MARKER_DOT }}
                aria-hidden
              />
            }
          >
            {filters.listing_statuses.includes('expired') ? 'On' : 'Off'}
          </PillButton>
        </div>

        {/* Owner Leads — off-market owners by tenure and/or occupancy (RentCast records) */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="owner-leads-heading"
          style={{
            backgroundColor: openChrome.ownerLeads.boxBg,
            border: openChrome.ownerLeads.boxBorder,
          }}
        >
          <div>
            <h3
              id="owner-leads-heading"
              className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
              style={{ color: openChrome.ownerLeads.heading }}
            >
              Owner Leads
              <SectionHelpTooltip
                label="Owner Leads"
                mapLightChrome={mapLightChrome}
                content="Off-market owners filtered by tenure, occupancy, and availability. Long tenure often means high equity; absentee owners may be more motivated to sell."
              />
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{ color: openChrome.ownerLeads.body }}
            >
              Homes by how long the owner has held (long tenure = likely high equity), whether
              they live there (absentee = landlord/investor) and availability (off-market / for
              sale). Select one or more constraints — replaces standard map results while active.
            </p>
          </div>
          {/* Tenure */}
          <span
            className="block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Tenure
          </span>
          <div className="flex flex-wrap gap-1">
            {OWNER_TENURE_BUCKETS.map((bucket) => (
              <PillButton
                key={bucket.id}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={(filters.owner_tenure_buckets ?? []).includes(bucket.id)}
                onClick={() =>
                  onChange(
                    ownerLeadsPatch(filters, {
                      owner_tenure_buckets: toggleTenureBucket(
                        filters.owner_tenure_buckets,
                        bucket.id,
                      ),
                    }),
                  )
                }
                aria-label={`Owner tenure: ${bucket.label}. Toggle on or off.`}
              >
                {bucket.label}
              </PillButton>
            ))}
          </div>
          {/* Occupancy */}
          <span
            className="block text-[10px] font-semibold uppercase tracking-wider pt-1"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Occupancy
          </span>
          <div className="flex flex-wrap gap-1">
            {(['absentee', 'owner_occupied'] as const).map((value) => (
              <PillButton
                key={value}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.owner_occupancy === value}
                onClick={() =>
                  onChange(
                    ownerLeadsPatch(filters, {
                      owner_occupancy: nextOwnerOccupancy(filters.owner_occupancy, value),
                    }),
                  )
                }
                aria-label={`Owner occupancy: ${value === 'absentee' ? 'Absentee' : 'Owner-occupied'}. Toggle on or off.`}
              >
                {value === 'absentee' ? 'Absentee' : 'Owner-occupied'}
              </PillButton>
            ))}
          </div>
          {/* Availability — unconstrained until a pill is on. Off-market vs
              currently for sale; both on is listed + unlisted. */}
          <span
            className="block text-[10px] font-semibold uppercase tracking-wider pt-1"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Availability
          </span>
          <div className="flex flex-wrap gap-1">
            <PillButton
              mapLightChrome={mapLightChrome}
              idleControl={pillIdleControl}
              active={ownerAvailabilityIsSelected(filters.owner_records_availability, 'off_market')}
              onClick={() =>
                onChange(
                  ownerLeadsPatch(filters, {
                    owner_records_availability: nextOwnerAvailability(
                      filters.owner_records_availability,
                      'off_market',
                    ),
                  }),
                )
              }
              aria-label="Off-market owner leads. Toggle on or off."
            >
              Off-market
            </PillButton>
            <PillButton
              mapLightChrome={mapLightChrome}
              idleControl={pillIdleControl}
              active={ownerAvailabilityIsSelected(filters.owner_records_availability, 'for_sale')}
              onClick={() =>
                onChange(
                  ownerLeadsPatch(filters, {
                    owner_records_availability: nextOwnerAvailability(
                      filters.owner_records_availability,
                      'for_sale',
                    ),
                  }),
                )
              }
              aria-label="For-sale homes matching the owner filter. Toggle on or off."
            >
              For sale
            </PillButton>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: openChrome.ownerLeads.body }}>
            For sale = only currently-listed homes that match — what active buyers want.
          </p>
        </div>

        {/* Days on Market */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Days on Market
          </label>
          <div className="flex gap-1 flex-wrap">
            {DOM_OPTIONS.map((opt) => (
              <PillButton
                key={opt.label}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.min_dom === opt.value}
                onClick={() => onChange({ min_dom: opt.value })}
                aria-label={`Minimum days on market: ${opt.label}`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Property Type
          </label>
          <select
            value={filters.property_type || ''}
            onChange={(e) => onChange({ property_type: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={controlIdle}
          >
            {PROPERTY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Price Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.min_price ?? ''}
              onChange={(e) => handlePriceChange('min_price', e.target.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm min-w-0 ${mapLightChrome ? 'placeholder:text-slate-400' : ''}`}
              style={controlIdle}
            />
            <span className="text-xs flex-shrink-0" style={{ color: openChrome.placeholder }}>
              to
            </span>
            <input
              type="number"
              placeholder="Max"
              value={filters.max_price ?? ''}
              onChange={(e) => handlePriceChange('max_price', e.target.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm min-w-0 ${mapLightChrome ? 'placeholder:text-slate-400' : ''}`}
              style={controlIdle}
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Bedrooms
          </label>
          <div className="flex gap-1 flex-wrap">
            {BEDROOM_OPTIONS.map((opt) => (
              <PillButton
                key={opt.label}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.bedrooms === opt.value}
                onClick={() => onChange({ bedrooms: opt.value })}
                aria-label={`Bedrooms: ${opt.label}`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Bathrooms
          </label>
          <div className="flex gap-1 flex-wrap">
            {[
              { value: undefined, label: 'Any' },
              { value: 1, label: '1+' },
              { value: 2, label: '2+' },
              { value: 3, label: '3+' },
            ].map((opt) => (
              <PillButton
                key={opt.label}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.bathrooms === opt.value}
                onClick={() => onChange({ bathrooms: opt.value })}
                aria-label={`Bathrooms: ${opt.label}`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Listing Type */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Listing Type
          </label>
          <div className="flex gap-1 flex-wrap">
            {LISTING_TYPES.map((opt) => (
              <PillButton
                key={opt.value}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={listingTypeIsSelected(filters.listing_type, opt.value)}
                onClick={() => onChange({ listing_type: nextListingType(filters.listing_type, opt.value) })}
                aria-label={`${opt.label}. Toggle on or off.`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Sort By
          </label>
          <select
            value={filters.sort_by}
            onChange={(e) => onChange({ sort_by: e.target.value as SortOption })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={controlIdle}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Listing Status — MLS & FSBO */}
        <div>
          <span
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Listing status
          </span>
          <p className="text-[10px] mb-2 leading-snug" style={{ color: openChrome.placeholder }}>
            MLS &amp; FSBO
          </p>
          <div className="flex flex-wrap gap-1">
            {CORE_LISTING_STATUS_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                mapLightChrome={mapLightChrome}
                idleControl={pillIdleControl}
                active={filters.listing_statuses.includes(opt.value)}
                onClick={() => toggleListingStatus(opt.value)}
                aria-label={`${opt.label} listings. Toggle on or off.`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
