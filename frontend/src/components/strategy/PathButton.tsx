'use client'

/**
 * PathButton — compact button card rendered above the DealMaker worksheet on the
 * Strategy page. Each button corresponds to one Three Paths `DealStructure`;
 * clicking it applies the structure's `pre_loaded_record` levers to the
 * worksheet via `applyPathPatch` (in `app/strategy/page.tsx`).
 *
 * Visual contract:
 * - Always-visible label (`Path N`) so users can scan four cards at a glance.
 * - Family color accent on the left edge so the button family is identifiable
 *   at a glance and matches the verdict-page Path cards.
 * - Active state: filled accent background + "Applied" pill.
 */

import type { CSSProperties } from 'react'

import type { DealStructure, StructureFamily } from '@/components/iq-verdict/ThreePathsPanel'

export const PATH_FAMILY_ACCENT: Record<StructureFamily, string> = {
  price: '#84cc16',
  capital_stack: '#22c55e',
  financing: 'var(--accent-sky)',
  income: '#a78bfa',
  strategy_switch: '#f97316',
  blended: '#8b5cf6',
}

interface PathButtonProps {
  structure: DealStructure
  index: number
  active: boolean
  disabled?: boolean
  onClick: (structure: DealStructure, index: number) => void
}

export function PathButton({
  structure,
  index,
  active,
  disabled = false,
  onClick,
}: PathButtonProps) {
  const accent = PATH_FAMILY_ACCENT[structure.family] ?? 'var(--accent-sky)'
  const label = `Path ${index + 1}`
  const subtitle = structure.familyLabel || 'Strategy'
  const headline = structure.headline || ''
  const isDisabled = disabled || !structure.preLoadedRecord || Object.keys(structure.preLoadedRecord ?? {}).length === 0

  const baseStyle: CSSProperties = {
    background: active ? accent : 'var(--surface-card)',
    border: `1px solid ${active ? accent : 'var(--border-default)'}`,
    color: active ? 'var(--text-inverse)' : 'var(--text-heading)',
    borderLeft: `4px solid ${accent}`,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    transition: 'background-color 120ms ease, border-color 120ms ease, transform 80ms ease',
    textAlign: 'left',
    width: '100%',
    minWidth: 0,
  }

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onClick(structure, index)}
      disabled={isDisabled}
      className="rounded-xl px-3 py-3 flex flex-col gap-1 hover:translate-y-[-1px] active:translate-y-0 disabled:hover:translate-y-0"
      style={baseStyle}
      aria-pressed={active}
      title={isDisabled ? 'No worksheet adjustments for this path' : headline || subtitle}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{
            color: active ? 'var(--text-inverse)' : accent,
            opacity: active ? 0.9 : 1,
          }}
        >
          {label}
        </span>
        {active && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'var(--text-inverse)',
            }}
          >
            Applied
          </span>
        )}
      </div>
      <div
        className="text-sm font-semibold leading-tight truncate"
        style={{ color: active ? 'var(--text-inverse)' : 'var(--text-heading)' }}
      >
        {subtitle}
      </div>
      {headline && (
        <div
          className="text-[12px] leading-snug truncate"
          style={{
            color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
            opacity: active ? 0.85 : 1,
          }}
        >
          {headline}
        </div>
      )}
    </button>
  )
}
