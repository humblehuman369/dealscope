'use client'

import type { ReactNode } from 'react'

import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import {
  FOUR_WAYS,
  findPathForFamily,
  formatGapAmount,
  headlineForPath,
  type FourWayFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'

export interface FourWaysStripProps {
  paths: readonly DealStructure[]
  /** Dollar gap between asking/market and Target Buy. Used for the section label. */
  dealGapAmount?: number | null
  /** Opens the wizard; `family` is set when the user tapped a specific row. */
  onMakeItWork: (family?: FourWayFamily) => void
  detailOpen: boolean
  onToggleDetail: () => void
}

function rowValue(structure: DealStructure | null): string | null {
  if (!structure) return null
  const raw = headlineForPath(structure)
  if (!raw) return null
  return raw.replace(/^→\s*/, '').replace(/^Saves\s+/i, '')
}

function Row({
  name,
  meaning,
  verb,
  structure,
  onSelect,
}: {
  name: string
  meaning: string
  verb: string
  structure: DealStructure | null
  onSelect: () => void
}): ReactNode {
  const value = rowValue(structure)
  const available = Boolean(structure)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={
        available
          ? `${name}: ${meaning}. ${value ?? ''} Build a plan around this.`
          : `${name}: not enough lift on this property`
      }
      className="group flex w-full items-baseline justify-between gap-4 text-left transition-colors focus:outline-none focus-visible:ring-2"
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        borderRadius: 0,
        padding: '10px 0',
        opacity: available ? 1 : 0.6,
      }}
    >
      <span className="min-w-0" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--text-heading)' }}>
        <span style={{ fontWeight: 700 }}>{name}</span>
        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> — {verb}</span>
      </span>
      <span
        className="tabular-nums shrink-0"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: available ? 'var(--text-heading)' : 'var(--text-secondary)',
        }}
      >
        {available ? value ?? 'See the numbers' : 'Not enough lift here'}
      </span>
    </button>
  )
}

/**
 * Compact four-row list: one fact per way, one CTA. Detail math stays
 * behind "See details".
 */
export function FourWaysStrip({
  paths,
  dealGapAmount,
  onMakeItWork,
  detailOpen,
  onToggleDetail,
}: FourWaysStripProps): ReactNode {
  const gapLabel = formatGapAmount(dealGapAmount)

  return (
    <section
      aria-labelledby="four-ways-heading"
      className="w-full min-w-0"
      style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <h3 id="four-ways-heading" className="sr-only">
        {gapLabel ? `Four ways to close a ${gapLabel} gap` : 'Four ways to close the gap'}
      </h3>

      <div className="w-full min-w-0">
        {FOUR_WAYS.map((way) => (
          <Row
            key={way.family}
            name={way.name}
            meaning={way.meaning}
            verb={way.verb}
            structure={findPathForFamily(paths, way.family)}
            onSelect={() => onMakeItWork(way.family)}
          />
        ))}
      </div>

      <div className="flex flex-col items-stretch gap-2">
        <button
          type="button"
          onClick={() => onMakeItWork()}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-[0.98]"
          style={{
            background: 'var(--accent-sky)',
            color: 'var(--text-inverse)',
          }}
        >
          Make this work for me
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={onToggleDetail}
          aria-expanded={detailOpen}
          className="self-start text-[12px] font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
        >
          {detailOpen ? 'Hide details' : 'See details'}
        </button>
      </div>
    </section>
  )
}
