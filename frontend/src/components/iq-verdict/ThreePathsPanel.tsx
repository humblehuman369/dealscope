'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

import { trackEvent } from '@/lib/eventTracking'

export type StructureFamily =
  | 'price'
  | 'capital_stack'
  | 'financing'
  | 'income'
  | 'strategy_switch'
  | 'blended'

export interface DealStructureLever {
  label: string
  beforeLabel: string
  afterLabel: string
  deltaLabel?: string | null
}

export interface DealStructure {
  id: string
  family: StructureFamily
  familyLabel: string
  realismLabel: string
  headline: string
  summary: string
  levers: DealStructureLever[]
  monthlySavings: number
  cashRequired: number
  rankingScore: number
  pitchScript?: string | null
  caveat?: string | null
  selectionReason?: string | null
  preLoadedRecord?: Record<string, unknown> | null
}

export interface DealStructuresPayload {
  paths: DealStructure[]
  narrativeParagraphs: string[]
  hasPaths: boolean
}

interface ThreePathsPanelProps {
  payload: DealStructuresPayload
  /** Two-letter state for analytics context (T14). */
  propertyState?: string | null
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
}

const FAMILY_ACCENT: Record<StructureFamily, string> = {
  price: '#84cc16',
  capital_stack: '#22c55e',
  financing: 'var(--accent-sky)',
  income: '#a78bfa',
  strategy_switch: '#f97316',
  blended: '#8b5cf6',
}

const PATH_COUNT_WORD = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']
function pathCountWords(n: number): { lead: string; tail: string } {
  const word = PATH_COUNT_WORD[n] ?? String(n)
  const noun = n === 1 ? 'path' : 'paths'
  return { lead: `${word} ${noun}`, tail: 'to make this work' }
}

function PathCard({
  structure,
  index,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
}: {
  structure: DealStructure
  index: number
  propertyState?: string | null
  onOpenInStrategy?: (s: DealStructure, i: number) => void
  onShowPitch?: (s: DealStructure) => void
}) {
  const caveatOpenedRef = useRef(false)
  const accent = FAMILY_ACCENT[structure.family] || 'var(--accent-sky)'
  return (
    <div
      role="article"
      aria-label={`Path ${index + 1}: ${structure.headline}`}
      className="rounded-xl h-full min-h-0"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          Path {index + 1}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          · {structure.familyLabel}
        </span>
        <span
          className="ml-auto"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {structure.realismLabel}
        </span>
      </div>

      <h4
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.35,
          color: 'var(--text-heading)',
        }}
      >
        {structure.headline}
      </h4>

      {structure.selectionReason && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          {structure.selectionReason}
        </p>
      )}

      {structure.levers.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingTop: 8,
            paddingBottom: 8,
            borderTop: '1px solid var(--border-subtle, var(--border-default))',
            borderBottom: '1px solid var(--border-subtle, var(--border-default))',
          }}
        >
          {structure.levers.map((lever, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2"
              style={{ fontSize: 13, lineHeight: 1.45 }}
            >
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{lever.label}</span>
              <span className="tabular-nums" style={{ color: 'var(--text-body)', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{lever.beforeLabel}</span>
                {' → '}
                <span style={{ color: 'var(--text-heading)' }}>{lever.afterLabel}</span>
                {lever.deltaLabel && (
                  <span style={{ marginLeft: 6, color: accent, fontWeight: 700 }}>
                    {lever.deltaLabel}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--text-body)',
        }}
      >
        {structure.summary}
      </p>

      {structure.caveat && (
        <details
          style={{ margin: 0 }}
          onToggle={(e) => {
            const open = (e.target as HTMLDetailsElement).open
            if (open && !caveatOpenedRef.current) {
              caveatOpenedRef.current = true
              trackEvent('path_card_caveat_viewed', {
                structure_id: structure.id,
                state: propertyState ?? undefined,
              })
            }
          }}
        >
          <summary
            className="cursor-pointer select-none [&::-webkit-details-marker]:hidden"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--accent-sky)',
            }}
          >
            Important caveat ▾
          </summary>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}
          >
            {structure.caveat}
          </p>
        </details>
      )}

      {(structure.family === 'financing' || structure.family === 'strategy_switch') && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          Get this contract reviewed by a creative-finance attorney —{' '}
          <Link
            href="/legal/find-attorney"
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)' }}
            onClick={() =>
              trackEvent('path_attorney_link_clicked', {
                structure_id: structure.id,
                state: propertyState ?? undefined,
              })
            }
          >
            Find one
          </Link>
        </p>
      )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 pt-3">
        {onOpenInStrategy && (
          <button
            type="button"
            onClick={() => onOpenInStrategy(structure, index)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
            }}
          >
            Open in Strategy
          </button>
        )}
        {structure.pitchScript && onShowPitch && (
          <button
            type="button"
            onClick={() => onShowPitch(structure)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--accent-sky)',
              border: '1px solid var(--accent-sky)',
            }}
          >
            How to pitch this
          </button>
        )}
      </div>
    </div>
  )
}

export function ThreePathsPanel({
  payload,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
}: ThreePathsPanelProps): ReactNode {
  const lastAssumableSigRef = useRef('')

  const pathsSig = payload.paths.map((p) => p.id).join('|')

  useEffect(() => {
    if (!payload.hasPaths || payload.paths.length === 0) return
    const hasAssumable = payload.paths.some((p) => p.id === 'assumable')
    if (!hasAssumable) return
    const dedupe = `${pathsSig}|${propertyState ?? ''}`
    if (lastAssumableSigRef.current === dedupe) return
    lastAssumableSigRef.current = dedupe
    trackEvent('assumable_pv_displayed', {
      path_count: payload.paths.length,
      state: propertyState ?? undefined,
    })
  }, [payload.hasPaths, pathsSig, propertyState])

  if (!payload.hasPaths || payload.paths.length === 0) {
    return null
  }

  return (
    <div
      className="w-full min-w-0"
      style={{
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {(() => {
        const { lead, tail } = pathCountWords(payload.paths.length)
        return (
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-heading)',
            }}
          >
            <span style={{ color: 'var(--accent-sky-light)' }}>{lead}</span>{' '}
            {tail}
          </p>
        )
      })()}
      <div
        className="w-full min-w-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {payload.paths.map((path, idx) => (
          <PathCard
            key={path.id}
            structure={path}
            index={idx}
            propertyState={propertyState}
            onOpenInStrategy={onOpenInStrategy}
            onShowPitch={onShowPitch}
          />
        ))}
      </div>
    </div>
  )
}
