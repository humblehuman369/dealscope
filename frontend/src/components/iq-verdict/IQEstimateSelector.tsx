'use client'

/**
 * IQEstimateSelector — 3-value data source selector
 *
 * Displays IQ Estimate (avg of Zillow + RentCast), Zillow, and RentCast
 * values for both property value and monthly rent. The user can select
 * which source drives calculations. Selection persists in sessionStorage.
 */

import { useCallback, useEffect, useState } from 'react'
import { colors } from './verdict-design-tokens'

export type DataSourceId = 'iq' | 'zillow' | 'rentcast'

interface SourceValue {
  value: number | null
  label: string
}

export interface IQEstimateSources {
  value: {
    iq: number | null
    zillow: number | null
    rentcast: number | null
  }
  rent: {
    iq: number | null
    zillow: number | null
    rentcast: number | null
  }
}

export interface IQEstimateSelectorProps {
  sources: IQEstimateSources
  onSourceChange?: (type: 'value' | 'rent', sourceId: DataSourceId, value: number | null) => void
  sessionKey?: string
}

const SOURCE_META: Record<DataSourceId, { label: string; color: string }> = {
  iq: { label: 'IQ Estimate', color: colors.brand.teal },
  zillow: { label: 'Zillow', color: '#4A90D9' },
  rentcast: { label: 'RentCast', color: '#F59E0B' },
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
}: {
  sourceId: DataSourceId
  meta: { label: string; color: string }
  sourceValue: number | null
  isSelected: boolean
  onSelect: () => void
}) {
  const available = sourceValue != null
  return (
    <button
      onClick={available ? onSelect : undefined}
      disabled={!available}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left"
      style={{
        background: isSelected ? 'rgba(45,212,191,0.08)' : 'transparent',
        border: `1px solid ${isSelected ? 'rgba(45,212,191,0.25)' : 'transparent'}`,
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.45,
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: isSelected ? meta.color : colors.ui.border }}
      >
        {isSelected && (
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
        )}
      </div>
      <span className="text-[12px] font-semibold flex-1" style={{ color: isSelected ? colors.text.primary : colors.text.secondary }}>
        {meta.label}
      </span>
      <span
        className="text-[13px] font-bold tabular-nums"
        style={{ color: available ? (isSelected ? meta.color : colors.text.body) : colors.text.muted }}
      >
        {available ? fmt(sourceValue) : 'Unavailable'}
      </span>
    </button>
  )
}

export function IQEstimateSelector({ sources, onSourceChange, sessionKey = 'iq_source_selection' }: IQEstimateSelectorProps) {
  const [selections, setSelections] = useState(() => getStoredSelections(sessionKey))

  useEffect(() => {
    const stored = getStoredSelections(sessionKey)
    setSelections(stored)
  }, [sessionKey])

  const handleSelect = useCallback(
    (type: 'value' | 'rent', sourceId: DataSourceId) => {
      const sourceGroup = sources[type]
      const newValue = sourceGroup[sourceId]
      setSelections((prev) => {
        const next = { ...prev, [type]: sourceId }
        persistSelections(sessionKey, next.value, next.rent)
        return next
      })
      onSourceChange?.(type, sourceId, newValue)
    },
    [sources, sessionKey, onSourceChange],
  )

  const sourceIds: DataSourceId[] = ['iq', 'zillow', 'rentcast']

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={colors.brand.teal} strokeWidth="2" strokeLinecap="round">
          <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.brand.teal }}>
          Data Sources
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Property Value column */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 pl-1" style={{ color: colors.text.secondary }}>
            Property Value
          </p>
          <div className="flex flex-col gap-0.5">
            {sourceIds.map((id) => (
              <SourceRow
                key={`value-${id}`}
                sourceId={id}
                meta={SOURCE_META[id]}
                sourceValue={sources.value[id]}
                isSelected={selections.value === id}
                onSelect={() => handleSelect('value', id)}
              />
            ))}
          </div>
        </div>

        {/* Monthly Rent column */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 pl-1" style={{ color: colors.text.secondary }}>
            Monthly Rent
          </p>
          <div className="flex flex-col gap-0.5">
            {sourceIds.map((id) => (
              <SourceRow
                key={`rent-${id}`}
                sourceId={id}
                meta={SOURCE_META[id]}
                sourceValue={sources.rent[id]}
                isSelected={selections.rent === id}
                onSelect={() => handleSelect('rent', id)}
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
    selectedValue: sources.value[stored.value],
    selectedRent: sources.rent[stored.rent],
  }
}
