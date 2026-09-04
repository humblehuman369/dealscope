'use client'

import type { ReactNode } from 'react'
import { HeartHandshake, Layers, Tag, TrendingUp } from 'lucide-react'

import { FAMILY_ACCENT, type DealStructure } from '@/components/iq-verdict/PathOptionCard'
import {
  FOUR_WAYS,
  findPathForFamily,
  formatGapAmount,
  headlineForPath,
  type FourWayFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'

const FAMILY_ICON: Record<FourWayFamily, typeof Tag> = {
  price: Tag,
  income: TrendingUp,
  financing: HeartHandshake,
  blended: Layers,
}

export interface FourWaysStripProps {
  paths: readonly DealStructure[]
  /** Dollar gap between asking/market and Target Buy. Drives the headline. */
  dealGapAmount?: number | null
  /** Opens the wizard; `family` is set when the user tapped a specific tile. */
  onMakeItWork: (family?: FourWayFamily) => void
  detailOpen: boolean
  onToggleDetail: () => void
}

function Tile({
  family,
  name,
  meaning,
  structure,
  onSelect,
}: {
  family: FourWayFamily
  name: string
  meaning: string
  structure: DealStructure | null
  onSelect: () => void
}): ReactNode {
  const accent = FAMILY_ACCENT[family]
  const Icon = FAMILY_ICON[family]
  const headline = structure ? headlineForPath(structure) : null
  const available = Boolean(structure)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={
        available
          ? `${name}: ${meaning}. ${headline ?? ''} Build a plan around this.`
          : `${name}: not enough lift on this property`
      }
      className="group text-left rounded-xl transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2"
      style={{
        background: 'var(--surface-card)',
        border: `1px solid color-mix(in srgb, ${accent} ${available ? 35 : 12}%, transparent)`,
        padding: '14px 14px 12px',
        opacity: available ? 1 : 0.6,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 118,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center rounded-lg"
        style={{
          width: 32,
          height: 32,
          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
          color: accent,
        }}
      >
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--text-heading)',
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--text-body)' }}>
          {meaning}
        </span>
      </span>
      <span
        className="tabular-nums"
        style={{
          marginTop: 'auto',
          fontSize: 13.5,
          fontWeight: 700,
          color: available ? accent : 'var(--text-secondary)',
        }}
      >
        {available ? headline ?? 'See the numbers' : 'Not enough lift here'}
      </span>
    </button>
  )
}

/**
 * The simple, scannable replacement for the four dense option cards.
 * Four tiles, one sentence, one CTA. Everything else lives behind
 * "See all four options in detail".
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
      style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-label)',
          }}
        >
          Ways to make this work
        </p>
        <h3
          id="four-ways-heading"
          style={{
            margin: '4px 0 0',
            fontSize: 'clamp(17px, 2.2vw, 20px)',
            fontWeight: 800,
            lineHeight: 1.25,
            color: 'var(--text-heading)',
          }}
        >
          {gapLabel ? (
            <>
              The gap is <span className="tabular-nums">{gapLabel}</span>. Investors close it four
              ways.
            </>
          ) : (
            <>Investors close a gap four ways.</>
          )}
        </h3>
      </div>

      <div className="grid w-full min-w-0 grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
        {FOUR_WAYS.map((way) => (
          <Tile
            key={way.family}
            family={way.family}
            name={way.name}
            meaning={way.meaning}
            structure={findPathForFamily(paths, way.family)}
            onSelect={() => onMakeItWork(way.family)}
          />
        ))}
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onMakeItWork()}
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-[0.98]"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--text-inverse)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            Make this work for me
            <span aria-hidden="true">→</span>
          </button>
          <span
            className="text-center sm:text-left"
            style={{ fontSize: 12, color: 'var(--text-secondary)' }}
          >
            3 quick questions · 60 seconds · free
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleDetail}
          aria-expanded={detailOpen}
          className="self-center text-[13px] font-semibold underline-offset-2 hover:underline sm:self-auto"
          style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none' }}
        >
          {detailOpen ? 'Hide the detailed options' : 'See all four options in detail'}
        </button>
      </div>
    </section>
  )
}
