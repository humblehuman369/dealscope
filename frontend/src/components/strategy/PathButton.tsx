'use client'

/**
 * PathButton — compact button card rendered above the DealMaker worksheet on the
 * Strategy page. Each button corresponds to one Three Paths `DealStructure`;
 * clicking it applies the structure's `pre_loaded_record` levers to the
 * worksheet via `applyPathPatch` (in `app/strategy/page.tsx`).
 *
 * Visual contract:
 * - Always-visible label (`Option N`) so users can scan four cards at a glance.
 * - Family color accent on the left edge so the button family is identifiable
 *   at a glance and matches the verdict-page Option cards.
 * - Active state: filled accent background + "Applied" pill.
 */

import type { CSSProperties } from 'react'

import type { DealStructure, StructureFamily } from '@/components/iq-verdict/FourPathsPanel'

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
  const label = `Option ${index + 1}`
  const subtitle = structure.familyLabel || 'Strategy'
  const headline = structure.headline || ''
  const isDisabled =
    disabled ||
    !structure.preLoadedRecord ||
    Object.keys(structure.preLoadedRecord ?? {}).length === 0

  const baseStyle: CSSProperties = {
    // Active state mirrors the worksheet SliderRow's path-highlight glow:
    // soft sky-blue gradient + sky-blue inset edge. Family color stays on the
    // 4px left border so the four buttons remain visually distinct.
    background: active
      ? 'linear-gradient(90deg, rgba(15, 164, 233, 0.18), rgba(15, 164, 233, 0.04) 72%, transparent), var(--surface-card)'
      : 'var(--surface-card)',
    border: `1px solid ${active ? 'rgba(15, 164, 233, 0.55)' : 'var(--border-default)'}`,
    color: 'var(--text-heading)',
    borderLeft: `4px solid ${accent}`,
    boxShadow: active ? 'inset 3px 0 0 rgba(15, 164, 233, 0.55)' : 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    transition:
      'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 80ms ease',
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
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {label}
        </span>
        {active && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--accent-sky)',
              color: '#FFFFFF',
            }}
          >
            Applied
          </span>
        )}
      </div>
      <div
        className="text-sm font-semibold leading-tight truncate"
        style={{ color: 'var(--text-heading)' }}
      >
        {subtitle}
      </div>
      {headline && (
        <div
          className="text-[12px] leading-snug truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {headline}
        </div>
      )}
    </button>
  )
}
