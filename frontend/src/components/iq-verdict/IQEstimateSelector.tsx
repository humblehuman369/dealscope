'use client'

/**
 * IQEstimateSelector — multi-source data source selector
 *
 * Displays IQ Estimate (avg of all available sources), Zillow, RentCast,
 * and Redfin values for both property value and monthly rent.
 * The user can select which source drives calculations.
 * Selection persists in sessionStorage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

export type DataSourceId = 'iq' | 'zillow' | 'rentcast' | 'redfin' | 'realtor' | 'mashvisor'

interface SourceValue {
  value: number | null
  label: string
}

// Value and rent columns can have different source lists. Realtor.com is
// only present in the value column (their API doesn't expose rent estimates);
// Mashvisor is only present in the rent column (sourced from the per-bedroom
// /rental-rates traditional endpoint). `Partial<Record<...>>` lets each
// column declare just the IDs it actually carries.
export interface IQEstimateSources {
  value: Partial<Record<DataSourceId, number | null>>
  rent: Partial<Record<DataSourceId, number | null>>
}

export interface IQEstimateSelectorProps {
  sources: IQEstimateSources
  onSourceChange?: (type: 'value' | 'rent', sourceId: DataSourceId, value: number | null) => void
  sessionKey?: string
  /** When true, the intro sentence pulses to draw attention (Verdict page only). Stops after first source change. */
  highlightIntro?: boolean
  /** Hide top "Data Sources" heading when parent already provides one. */
  showHeader?: boolean
  /** Use tighter spacing for compact embeds (Verdict accordion). */
  compact?: boolean
}

const SOURCE_META: Record<DataSourceId, { label: string; color: string }> = {
  iq: { label: 'IQ Estimate', color: 'var(--accent-sky)' },
  zillow: { label: 'Zillow', color: '#4A90D9' },
  rentcast: { label: 'RentCast', color: '#F59E0B' },
  redfin: { label: 'Redfin', color: '#A02B2D' },
  realtor: { label: 'Realtor.com', color: '#D92228' },
  mashvisor: { label: 'Mashvisor', color: '#06B6D4' },
}

function getStoredSelections(sessionKey: string): { value: DataSourceId; rent: DataSourceId } {
  if (typeof window === 'undefined') return { value: 'iq', rent: 'iq' }
  try {
    const stored = sessionStorage.getItem(sessionKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        value: parsed.value || 'iq',
        rent: parsed.rent || 'iq',
      }
    }
  } catch { /* ignore */ }
  return { value: 'iq', rent: 'iq' }
}

function persistSelections(sessionKey: string, value: DataSourceId, rent: DataSourceId) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ value, rent }))
  } catch { /* ignore */ }
}

const INTRO_SEEN_KEY = (sessionKey: string) => `${sessionKey}_intro_seen`

function getIntroSeen(sessionKey: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY(sessionKey)) === '1'
  } catch { /* ignore */ }
  return false
}

function setIntroSeen(sessionKey: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY(sessionKey), '1')
  } catch { /* ignore */ }
}

const fmt = (v: number | null) => {
  if (v == null) return null
  return `$${Math.round(v).toLocaleString()}`
}

function SourceRow({
  sourceId,
  meta,
  sourceValue,
  isSelected,
  onSelect,
  compact = false,
}: {
  sourceId: DataSourceId
  meta: { label: string; color: string }
  sourceValue: number | null
  isSelected: boolean
  onSelect: () => void
  compact?: boolean
}) {
  const available = sourceValue != null
  const [hovered, setHovered] = useState(false)
  const showHover = hovered && !isSelected && available

  const buttonStyle = useMemo(() => ({
    background: isSelected
      ? 'var(--surface-base)'
      : showHover ? 'var(--surface-card-hover)' : 'transparent',
    border: `1px solid ${
      isSelected ? 'var(--border-focus)'
      : showHover ? 'var(--border-default)' : 'transparent'
    }`,
    boxShadow: showHover ? 'var(--shadow-card)' : 'none',
    cursor: available ? 'pointer' : 'default',
    opacity: available ? 1 : 0.45,
  }), [isSelected, showHover, available, meta.color])

  return (
    <button
      onClick={available ? onSelect : undefined}
      disabled={!available}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-2.5 w-full px-3 rounded-lg transition-all duration-200 text-left ${compact ? 'py-1.5' : 'py-2'}`}
      style={buttonStyle}
    >
      <div
        className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: isSelected ? meta.color : 'var(--accent-sky)' }}
      >
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
        )}
      </div>
      <span className="text-[12px] sm:text-[16px] font-semibold flex-1" style={{ color: isSelected ? 'var(--text-heading)' : 'var(--text-body)' }}>
        {meta.label}
      </span>
      <span
        className="text-[13px] sm:text-[17px] font-bold tabular-nums"
        style={{ color: available ? (isSelected ? meta.color : 'var(--text-body)') : 'var(--text-label)' }}
      >
        {available ? fmt(sourceValue) : 'Unavailable'}
      </span>
    </button>
  )
}

function resolveDefaults(
  sources: IQEstimateSources,
  stored: { value: DataSourceId; rent: DataSourceId },
): { value: DataSourceId; rent: DataSourceId } {
  const resolveValue = (group: IQEstimateSources['value'], sel: DataSourceId): DataSourceId => {
    if (group.iq != null) return 'iq'
    if (group[sel] != null) return sel
    if (group.zillow != null) return 'zillow'
    if (group.rentcast != null) return 'rentcast'
    if (group.redfin != null) return 'redfin'
    if (group.realtor != null) return 'realtor'
    return 'iq'
  }
  const resolveRent = (group: IQEstimateSources['rent'], sel: DataSourceId): DataSourceId => {
    if (group.iq != null) return 'iq'
    if (group[sel] != null) return sel
    if (group.zillow != null) return 'zillow'
    if (group.rentcast != null) return 'rentcast'
    if (group.redfin != null) return 'redfin'
    // Mashvisor replaced Realtor.com on the rent side; older sessionStorage
    // entries with `'realtor'` for rent are filtered upstream by the column-
    // specific source-id list, so this fallthrough order intentionally
    // mirrors the new rent column composition.
    if (group.mashvisor != null) return 'mashvisor'
    return 'iq'
  }
  return {
    value: resolveValue(sources.value, stored.value),
    rent: resolveRent(sources.rent, stored.rent),
  }
}

export function IQEstimateSelector({
  sources,
  onSourceChange,
  sessionKey = 'iq_source_selection',
  highlightIntro = false,
  showHeader = true,
  compact = false,
}: IQEstimateSelectorProps) {
  const [selections, setSelections] = useState(() =>
    resolveDefaults(sources, getStoredSelections(sessionKey)),
  )
  const [introSeen, setIntroSeenState] = useState(() => getIntroSeen(sessionKey))

  useEffect(() => {
    const stored = getStoredSelections(sessionKey)
    const next = resolveDefaults(sources, stored)
    setSelections((prev) => {
      if (next.value !== prev.value || next.rent !== prev.rent) {
        persistSelections(sessionKey, next.value, next.rent)
        return next
      }
      return prev
    })
  }, [sources, sessionKey])

  const handleSelect = useCallback(
    (type: 'value' | 'rent', sourceId: DataSourceId) => {
      const sourceGroup = sources[type]
      const newValue = sourceGroup[sourceId] ?? null
      setSelections((prev) => {
        const next = { ...prev, [type]: sourceId }
        persistSelections(sessionKey, next.value, next.rent)
        return next
      })
      if (highlightIntro && !introSeen) {
        setIntroSeen(sessionKey)
        setIntroSeenState(true)
      }
      onSourceChange?.(type, sourceId, newValue)
    },
    [sources, sessionKey, onSourceChange, highlightIntro, introSeen],
  )

  const valueSourceIds: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'realtor']
  // Rent column swap: Realtor.com (no rent API) replaced by Mashvisor
  // /rental-rates traditional (per-bedroom monthly rent benchmark).
  const rentSourceIds: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'mashvisor']

  return (
    <div
      className={`rounded-xl ${compact ? 'p-3' : 'p-4'}`}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
        transition: 'all 0.3s ease',
      }}
    >
      {showHeader && (
        <div className="flex items-center gap-2 mb-1.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
          </svg>
          <span className="text-[12px] sm:text-[16px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-sky)' }}>
            Data Sources
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Property Value column (5 sources: IQ, Zillow, RentCast, Redfin, Realtor.com) */}
        <div>
          <p className={`text-[12px] sm:text-[16px] font-bold uppercase tracking-wide pl-1 ${compact ? 'mb-1' : 'mb-1.5'}`} style={{ color: 'var(--text-secondary)' }}>
            Property Value
          </p>
          <div className="flex flex-col gap-0">
            {valueSourceIds.map((id) => (
              <SourceRow
                key={`value-${id}`}
                sourceId={id}
                meta={SOURCE_META[id]}
                sourceValue={sources.value[id] ?? null}
                isSelected={selections.value === id}
                onSelect={() => handleSelect('value', id)}
                compact={compact}
              />
            ))}
          </div>
        </div>

        {/* Monthly Rent column (5 sources: IQ, Zillow, RentCast, Redfin, Mashvisor) */}
        <div>
          <p className={`text-[12px] sm:text-[16px] font-bold uppercase tracking-wide pl-1 ${compact ? 'mb-1' : 'mb-1.5'}`} style={{ color: 'var(--text-secondary)' }}>
            Monthly Rent
          </p>
          <div className="flex flex-col gap-0">
            {rentSourceIds.map((id) => (
              <SourceRow
                key={`rent-${id}`}
                sourceId={id}
                meta={SOURCE_META[id]}
                sourceValue={sources.rent[id] ?? null}
                isSelected={selections.rent === id}
                onSelect={() => handleSelect('rent', id)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to read the current IQ source selection from sessionStorage.
 * Returns the selected source IDs and the resolved values.
 */
export function useIQSourceSelection(
  sources: IQEstimateSources,
  sessionKey = 'iq_source_selection',
): {
  valueSource: DataSourceId
  rentSource: DataSourceId
  selectedValue: number | null
  selectedRent: number | null
} {
  const stored = getStoredSelections(sessionKey)
  return {
    valueSource: stored.value,
    rentSource: stored.rent,
    selectedValue: sources.value[stored.value] ?? null,
    selectedRent: sources.rent[stored.rent] ?? null,
  }
}
