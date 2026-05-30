'use client'

import { useCallback, useMemo } from 'react'
import { AlertTriangle, Bookmark, Gavel, Hammer, Loader2, SlidersHorizontal, Target, X } from 'lucide-react'
import type { MapSearchFilters } from '@/hooks/useMapSearch'
import type { SortOption } from '@/lib/dealSignal'
import {
  type MapOverlayChrome,
  MAP_FILTER_LIGHT_CONTROLS,
  MAP_FILTER_DISTRESSED_LIGHT,
} from '@/components/map-search/mapOverlayChrome'

interface FilterPanelProps {
  filters: MapSearchFilters
  onChange: (next: Partial<MapSearchFilters>) => void
  totalCount: number
  isLoading: boolean
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
}

const LISTING_TYPES: { value: MapSearchFilters['listing_type']; label: string }[] = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rental', label: 'For Rent' },
  { value: 'both', label: 'Both' },
]

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
const DISTRESSED_MARKER_DOT = '#EF4444'

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

const OWNER_TENURE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Any' },
  { label: '10–20 yrs', min: 10, max: 20 },
  { label: '20–30 yrs', min: 20, max: 30 },
  { label: '30+ yrs', min: 30 },
]

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

function PillButton({
  active,
  onClick,
  children,
  leading,
  mapLightChrome,
  'aria-pressed': ariaPressed,
  'aria-label': ariaLabel,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  leading?: React.ReactNode
  mapLightChrome?: boolean
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
          : mapLightChrome
            ? MAP_FILTER_LIGHT_CONTROLS.idleBg
            : 'var(--surface-elevated)',
        color: active
          ? '#fff'
          : mapLightChrome
            ? MAP_FILTER_LIGHT_CONTROLS.idleText
            : 'var(--text-body)',
        border: !active && mapLightChrome ? MAP_FILTER_LIGHT_CONTROLS.idleBorder : undefined,
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
  isOpen,
  onToggle,
  canSaveDefaultView = false,
  onSaveDefaultView,
  savingDefaultView = false,
  overlayChrome = null,
  dockCollapsedInline = false,
  mapLightChrome = false,
}: FilterPanelProps) {
  const handlePriceChange = useCallback(
    (field: 'min_price' | 'max_price', raw: string) => {
      const num = raw ? Number(raw) : undefined
      onChange({ [field]: num && !isNaN(num) ? num : undefined })
    },
    [onChange],
  )

  const toggleListingStatus = useCallback(
    (status: string) => {
      const current = filters.listing_statuses
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status]
      onChange({ listing_statuses: next })
    },
    [filters.listing_statuses, onChange],
  )

  const ownerTenureActive = filters.owner_tenure_min_years != null

  const selectOwnerTenure = useCallback(
    (min?: number, max?: number) => {
      // Owner-tenure mode replaces standard map sources on the backend; keep it
      // mutually exclusive with motivated-seller mode (which takes precedence).
      onChange({
        owner_tenure_min_years: min,
        owner_tenure_max_years: max,
        ...(min != null ? { motivated_seller_search: false } : {}),
      })
    },
    [onChange],
  )

  const activeFilterCount = [
    filters.property_type,
    filters.min_price,
    filters.max_price,
    filters.bedrooms,
    filters.bathrooms,
    filters.listing_statuses.length > 0 ? true : undefined,
    filters.min_dom,
    filters.motivated_seller_search ? true : undefined,
    ownerTenureActive ? true : undefined,
  ].filter(Boolean).length

  const hasDistressedStatusFilter = useMemo(
    () => filters.listing_statuses.some((s) => DISTRESSED_STATUS_VALUES.has(s)),
    [filters.listing_statuses],
  )

  const showCollapsedDistressedHint = !hasDistressedStatusFilter

  const chrome = overlayChrome ?? null

  const labelColor = mapLightChrome ? MAP_FILTER_LIGHT_CONTROLS.sectionLabel : undefined
  const controlIdle = mapLightChrome
    ? {
        backgroundColor: MAP_FILTER_LIGHT_CONTROLS.idleBg,
        color: MAP_FILTER_LIGHT_CONTROLS.idleText,
        border: MAP_FILTER_LIGHT_CONTROLS.idleBorder,
      }
    : {
        backgroundColor: 'var(--surface-elevated)',
        color: 'var(--text-body)',
        border: '1px solid var(--border-subtle)',
      }

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
    <div
      id="map-search-filters-panel"
      role="dialog"
      aria-label="Map search filters"
      className="pointer-events-auto absolute top-3 right-3 z-10 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl shadow-xl overflow-hidden"
      style={{
        backgroundColor: chrome?.backgroundColor ?? 'var(--surface-card)',
        border: `1px solid ${chrome?.borderColor ?? 'var(--border-default)'}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${chrome?.borderColor ?? 'var(--border-subtle)'}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal
            size={16}
            style={{ color: chrome ? chrome.primaryText : 'var(--accent-sky)' }}
            className="flex-shrink-0"
          />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: chrome?.primaryText ?? 'var(--text-heading)' }}
          >
            Filters
          </span>
          <span
            className="text-xs flex-shrink-0"
            style={{ color: chrome?.secondaryText ?? 'var(--text-secondary)' }}
          >
            {isLoading
              ? filters.motivated_seller_search
                ? 'Scanning motivated-seller keywords…'
                : 'Searching...'
              : `${totalCount} results`}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
          aria-label="Close filters"
        >
          <X size={16} style={{ color: chrome?.secondaryText ?? 'var(--text-secondary)' }} />
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
            <p
              className="text-[10px] mt-1.5 leading-snug"
              style={{
                color: mapLightChrome
                  ? MAP_FILTER_LIGHT_CONTROLS.placeholder
                  : 'var(--text-secondary)',
              }}
            >
              Your next visit will open here.
            </p>
          </div>
        )}

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
                active={filters.listing_type === opt.value}
                onClick={() => onChange({ listing_type: opt.value })}
                aria-label={opt.label}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Listing Status — MLS & FSBO */}
        <div>
          <span
            className="block text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Listing status
          </span>
          <p
            className="text-[10px] mb-2 leading-snug"
            style={{
              color: mapLightChrome
                ? MAP_FILTER_LIGHT_CONTROLS.placeholder
                : 'var(--text-secondary)',
            }}
          >
            MLS &amp; FSBO
          </p>
          <div className="flex flex-wrap gap-1">
            {CORE_LISTING_STATUS_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                mapLightChrome={mapLightChrome}
                active={filters.listing_statuses.includes(opt.value)}
                onClick={() => toggleListingStatus(opt.value)}
                aria-label={`${opt.label} listings. Toggle on or off.`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Motivated Seller Search */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="motivated-seller-heading"
          style={
            mapLightChrome
              ? {
                  backgroundColor: MAP_FILTER_DISTRESSED_LIGHT.boxBg,
                  border: MAP_FILTER_DISTRESSED_LIGHT.boxBorder,
                }
              : {
                  backgroundColor: 'rgba(245, 158, 11, 0.09)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                }
          }
        >
          <div>
            <h3
              id="motivated-seller-heading"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.heading : 'var(--text-heading)',
              }}
            >
              Motivated Seller Search
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.body : 'var(--text-secondary)',
              }}
            >
              Scans listing descriptions for investor / motivated-seller language via Zillow
              keywords. Replaces standard map results while enabled.
            </p>
          </div>
          <PillButton
            mapLightChrome={mapLightChrome}
            active={Boolean(filters.motivated_seller_search)}
            onClick={() => {
              const next = !filters.motivated_seller_search
              onChange({
                motivated_seller_search: next,
                ...(next
                  ? { owner_tenure_min_years: undefined, owner_tenure_max_years: undefined }
                  : {}),
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

        {/* Owner Tenure — long-held owners (high equity, off-market) */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="owner-tenure-heading"
          style={
            mapLightChrome
              ? {
                  backgroundColor: MAP_FILTER_DISTRESSED_LIGHT.boxBg,
                  border: MAP_FILTER_DISTRESSED_LIGHT.boxBorder,
                }
              : {
                  backgroundColor: 'rgba(56, 189, 248, 0.09)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                }
          }
        >
          <div>
            <h3
              id="owner-tenure-heading"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.heading : 'var(--text-heading)',
              }}
            >
              Owner Tenure
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.body : 'var(--text-secondary)',
              }}
            >
              Off-market homes by how long the current owner has held them — long-held owners
              often carry high equity. Replaces standard map results while active.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {OWNER_TENURE_PRESETS.map((preset) => (
              <PillButton
                key={preset.label}
                mapLightChrome={mapLightChrome}
                active={
                  filters.owner_tenure_min_years === preset.min &&
                  filters.owner_tenure_max_years === preset.max
                }
                onClick={() => selectOwnerTenure(preset.min, preset.max)}
                aria-label={`Owner tenure: ${preset.label}`}
              >
                {preset.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Distressed deals */}
        <div
          className="rounded-lg p-3 space-y-2"
          role="group"
          aria-labelledby="distressed-deals-heading"
          style={
            mapLightChrome
              ? {
                  backgroundColor: MAP_FILTER_DISTRESSED_LIGHT.boxBg,
                  border: MAP_FILTER_DISTRESSED_LIGHT.boxBorder,
                }
              : {
                  backgroundColor: 'rgba(239, 68, 68, 0.09)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                }
          }
        >
          <div>
            <h3
              id="distressed-deals-heading"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.heading : 'var(--text-heading)',
              }}
            >
              Distressed deals
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.body : 'var(--text-secondary)',
              }}
            >
              Foreclosure, auction &amp; pre-foreclosure — same red pins as the map legend.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {DISTRESSED_LISTING_STATUS_OPTIONS.map(({ value, label, dotColor, Icon }) => (
              <PillButton
                key={value}
                mapLightChrome={mapLightChrome}
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
            backgroundColor: 'rgba(139, 92, 246, 0.09)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
          }}
        >
          <div>
            <h3
              id="expired-listings-heading"
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.heading : 'var(--text-heading)',
              }}
            >
              Expired Listings
            </h3>
            <p
              className="text-[10px] mt-1 leading-snug"
              style={{
                color: mapLightChrome ? MAP_FILTER_DISTRESSED_LIGHT.body : 'var(--text-secondary)',
              }}
            >
              Was listed but didn&apos;t sell (expired or withdrawn) — a motivated-seller signal.
              Sourced from RentCast delisted records, last ~18 months.
            </p>
          </div>
          <PillButton
            mapLightChrome={mapLightChrome}
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
            <span
              className="text-xs flex-shrink-0"
              style={{
                color: mapLightChrome
                  ? MAP_FILTER_LIGHT_CONTROLS.placeholder
                  : 'var(--text-secondary)',
              }}
            >
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
                active={filters.bathrooms === opt.value}
                onClick={() => onChange({ bathrooms: opt.value })}
                aria-label={`Bathrooms: ${opt.label}`}
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Airbnb / STR Listings */}
        <div
          className="pt-3"
          style={{
            borderTop: mapLightChrome
              ? '1px solid rgba(15, 23, 42, 0.1)'
              : '1px solid var(--border-subtle)',
          }}
        >
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: labelColor ?? 'var(--text-secondary)' }}
          >
            Airbnb Listings
          </label>
          <button
            type="button"
            onClick={() => onChange({ include_str_listings: !filters.include_str_listings })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full transition-colors"
            style={{
              backgroundColor: filters.include_str_listings
                ? 'rgba(251, 113, 133, 0.15)'
                : mapLightChrome
                  ? MAP_FILTER_LIGHT_CONTROLS.idleBg
                  : 'var(--surface-elevated)',
              color: filters.include_str_listings
                ? '#FB7185'
                : mapLightChrome
                  ? MAP_FILTER_LIGHT_CONTROLS.idleText
                  : 'var(--text-body)',
              border: filters.include_str_listings
                ? '1px solid #FB7185'
                : mapLightChrome
                  ? MAP_FILTER_LIGHT_CONTROLS.idleBorder
                  : '1px solid var(--border-subtle)',
            }}
            aria-pressed={filters.include_str_listings}
            aria-label="Toggle Airbnb short-term rental listings on the map"
          >
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${filters.include_str_listings ? 'bg-rose-400' : 'bg-gray-400'}`}
              aria-hidden
            />
            {filters.include_str_listings ? 'Showing Airbnb Listings' : 'Show Airbnb Listings'}
          </button>
        </div>
      </div>
    </div>
  )
}
