'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff, BookmarkPlus, Lock, PenLine, Trash2, X } from 'lucide-react'
import type { AlertFrequency, SavedMapSearch, SavedSearchFilters } from '@/lib/api'
import { useSavedMapSearches } from '@/hooks/useSavedMapSearches'
import { DEFAULT_FILTERS, type MapBounds, type MapSearchFilters } from '@/hooks/useMapSearch'

/**
 * Saved farm areas and their new-inventory email alerts.
 *
 * The reason this exists is the return-tomorrow loop: an investor works a farm
 * area, and the question that brings them back is "what came on the market
 * since?". Saving the area answers it in one click; the alert answers it
 * without them having to remember to ask.
 *
 * Two constraints show up in the UI rather than being hidden:
 *
 * Alerts are only available on ordinary listing searches. The backend refuses
 * a schedule on the per-property scan modes and returns the reason, which is
 * rendered inline — a disabled toggle with no explanation reads as a bug.
 *
 * The whole feature is Pro. Free users get the panel with the upgrade path
 * instead of a hidden button, so the capability is discoverable.
 */

interface OverlayChrome {
  backgroundColor: string
  borderColor: string
  primaryText: string
  secondaryText: string
}

interface SavedSearchesPanelProps {
  /** Pro-gated; free users see the upgrade prompt instead of the list. */
  hasAccess: boolean
  filters: MapSearchFilters
  polygon: number[][] | null
  getCurrentBounds: () => MapBounds | null
  onApply: (search: SavedMapSearch) => void
  overlayChrome: OverlayChrome
}

const FREQUENCY_ORDER: AlertFrequency[] = ['off', 'daily', 'weekly']

const FREQUENCY_LABEL: Record<AlertFrequency, string> = {
  off: 'Alerts off',
  daily: 'Daily',
  weekly: 'Weekly',
}

/**
 * Strip the client-only fields (`min_dom`, `sort_by`) that shape the local
 * list rather than the query, and drop undefined so a saved search's stored
 * filters read as exactly what the investor set.
 */
export function toSavedFilters(filters: MapSearchFilters): SavedSearchFilters {
  const saved: SavedSearchFilters = {
    listing_type: filters.listing_type,
    property_type: filters.property_type,
    min_price: filters.min_price,
    max_price: filters.max_price,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    listing_statuses:
      filters.listing_statuses.length > 0 ? filters.listing_statuses : undefined,
    include_str_listings: filters.include_str_listings || undefined,
    str_state: filters.include_str_listings ? filters.str_state : undefined,
    str_city: filters.include_str_listings ? filters.str_city : undefined,
    motivated_seller_search: filters.motivated_seller_search || undefined,
    owner_tenure_min_years: filters.owner_tenure_min_years,
    owner_tenure_max_years: filters.owner_tenure_max_years,
    owner_occupancy: filters.owner_occupancy,
    owner_records_availability: filters.owner_records_availability,
  }
  return Object.fromEntries(
    Object.entries(saved).filter(([, value]) => value !== undefined),
  ) as SavedSearchFilters
}

/**
 * Rebuild the map's filter state from a saved search.
 *
 * The base is always the pristine defaults, never the filters currently on
 * screen. Merging onto the live state would let a filter the investor never
 * saved — a max price from the last thing they looked at — survive into the
 * restored search and quietly exclude inventory.
 */
export function fromSavedFilters(saved: SavedSearchFilters): MapSearchFilters {
  return {
    ...DEFAULT_FILTERS,
    ...saved,
    listing_type: saved.listing_type ?? DEFAULT_FILTERS.listing_type,
    listing_statuses: saved.listing_statuses ?? [],
  }
}

/** A one-line description of what a saved search is watching. */
function describe(search: SavedMapSearch): string {
  const parts: string[] = []
  if (search.polygon) parts.push('Drawn area')
  const statuses = search.filters.listing_statuses
  if (statuses?.length) parts.push(statuses.join(', '))
  if (search.filters.motivated_seller_search) parts.push('motivated sellers')
  if (search.filters.owner_occupancy === 'absentee') parts.push('absentee owners')
  const min = search.filters.min_price
  const max = search.filters.max_price
  if (min != null && max != null) {
    parts.push(`$${(min / 1000).toFixed(0)}k–$${(max / 1000).toFixed(0)}k`)
  } else if (max != null) {
    parts.push(`under $${(max / 1000).toFixed(0)}k`)
  } else if (min != null) {
    parts.push(`over $${(min / 1000).toFixed(0)}k`)
  }
  if (search.filters.bedrooms) parts.push(`${search.filters.bedrooms}+ bd`)
  return parts.length ? parts.join(' · ') : 'All active listings'
}

export function SavedSearchesPanel({
  hasAccess,
  filters,
  polygon,
  getCurrentBounds,
  onApply,
  overlayChrome,
}: SavedSearchesPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const { searches, maxAllowed, isAtLimit, isLoading, create, setAlertFrequency, remove } =
    useSavedMapSearches({ enabled: hasAccess && isOpen })

  const handleSave = useCallback(() => {
    const bounds = getCurrentBounds()
    if (!bounds) return
    const name = draftName.trim()
    if (!name) return

    create.mutate(
      {
        name,
        ...bounds,
        polygon,
        filters: toSavedFilters(filters),
      },
      { onSuccess: () => setDraftName('') },
    )
  }, [create, draftName, filters, getCurrentBounds, polygon])

  const cycleFrequency = useCallback(
    (search: SavedMapSearch) => {
      const next =
        FREQUENCY_ORDER[(FREQUENCY_ORDER.indexOf(search.alert_frequency) + 1) % FREQUENCY_ORDER.length]
      setAlertFrequency.mutate({ id: search.id, frequency: next })
    },
    [setAlertFrequency],
  )

  const chrome = {
    backgroundColor: overlayChrome.backgroundColor,
    color: overlayChrome.primaryText,
    border: `1px solid ${overlayChrome.borderColor}`,
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shadow-lg transition-opacity hover:opacity-90"
        style={chrome}
      >
        <BookmarkPlus size={12} aria-hidden />
        Saved areas
      </button>
    )
  }

  return (
    <div
      className="w-[16.5rem] max-w-[calc(100vw-1.5rem)] rounded-xl shadow-xl overflow-hidden"
      style={chrome}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid ${overlayChrome.borderColor}` }}
      >
        <span className="text-[11px] font-bold tracking-wide uppercase">Saved areas</span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close saved areas"
          className="transition-opacity hover:opacity-70"
        >
          <X size={13} aria-hidden />
        </button>
      </div>

      {!hasAccess ? (
        <div className="px-3 py-3 space-y-2">
          <p className="text-[11px] leading-snug" style={{ color: overlayChrome.secondaryText }}>
            Save a farm area with its filters and get an email when new inventory
            shows up in it.
          </p>
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            <Lock size={11} aria-hidden />
            Upgrade to Pro
          </Link>
        </div>
      ) : (
        <>
          <div className="px-3 py-2.5 space-y-2" style={{ borderBottom: `1px solid ${overlayChrome.borderColor}` }}>
            <div className="flex items-center gap-1.5">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                placeholder={polygon ? 'Name this boundary' : 'Name this area'}
                maxLength={120}
                aria-label="Saved area name"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-md text-[11px] outline-none focus:ring-1"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: overlayChrome.primaryText,
                  border: `1px solid ${overlayChrome.borderColor}`,
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!draftName.trim() || isAtLimit || create.isPending}
                title={
                  isAtLimit
                    ? `You've saved the maximum of ${maxAllowed} areas`
                    : 'Save the current view and filters'
                }
                className="px-2 py-1.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
              >
                Save
              </button>
            </div>
            <p className="text-[10px] leading-snug flex items-center gap-1" style={{ color: overlayChrome.secondaryText }}>
              {polygon ? (
                <>
                  <PenLine size={9} aria-hidden />
                  Saves your drawn boundary and current filters.
                </>
              ) : (
                'Saves the current map view and filters.'
              )}
            </p>
          </div>

          <div className="max-h-[15rem] overflow-y-auto">
            {isLoading ? (
              <p className="px-3 py-3 text-[11px]" style={{ color: overlayChrome.secondaryText }}>
                Loading…
              </p>
            ) : searches.length === 0 ? (
              <p
                className="px-3 py-3 text-[11px] leading-snug"
                style={{ color: overlayChrome.secondaryText }}
              >
                No saved areas yet. Frame a farm area, name it, and you can come
                straight back to it — or have new listings emailed to you.
              </p>
            ) : (
              searches.map((search) => (
                <div
                  key={search.id}
                  className="px-3 py-2"
                  style={{ borderBottom: `1px solid ${overlayChrome.borderColor}` }}
                >
                  <div className="flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => onApply(search)}
                      className="flex-1 min-w-0 text-left transition-opacity hover:opacity-80"
                      title="Go to this area with its filters"
                    >
                      <p className="text-[11px] font-semibold truncate">{search.name}</p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: overlayChrome.secondaryText }}
                      >
                        {describe(search)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(search.id)}
                      aria-label={`Delete ${search.name}`}
                      className="p-1 transition-opacity hover:opacity-70"
                      style={{ color: overlayChrome.secondaryText }}
                    >
                      <Trash2 size={11} aria-hidden />
                    </button>
                  </div>

                  {search.alert_ineligible_reason ? (
                    <p
                      className="mt-1.5 text-[10px] leading-snug"
                      style={{ color: overlayChrome.secondaryText }}
                    >
                      {search.alert_ineligible_reason}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cycleFrequency(search)}
                      disabled={setAlertFrequency.isPending}
                      className="mt-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        color:
                          search.alert_frequency === 'off'
                            ? overlayChrome.secondaryText
                            : 'var(--accent-sky)',
                        border: `1px solid ${overlayChrome.borderColor}`,
                      }}
                    >
                      {search.alert_frequency === 'off' ? (
                        <BellOff size={9} aria-hidden />
                      ) : (
                        <Bell size={9} aria-hidden />
                      )}
                      {FREQUENCY_LABEL[search.alert_frequency]}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
