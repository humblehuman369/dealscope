'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import { trackEvent } from '@/lib/eventTracking'
import {
  dismissFamily,
  dismissedCount,
  getDismissedFamilies,
  resetDismissedFamilies,
} from '@/lib/dealStructures/userPreferences'

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
  /** Optional 2-3 short action bullets shown at the top of the card; replaces headline when present. */
  bullets?: string[]
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

interface FourPathsPanelProps {
  payload: DealStructuresPayload
  /** Two-letter state for analytics context (T14). */
  propertyState?: string | null
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
  /** T17 — fired when a card is dismissed (after localStorage write).
   *  Use to refetch / re-render so the next verdict has the lower ranking applied. */
  onDismissFamily?: (family: StructureFamily) => void
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

// In-summary tokens that should be rendered as clickable links to the matching
// in-app tool. Keeps copy-side wording stable while letting product link to the
// right surface (e.g. "Appraiser page" → /price-intel).
const SUMMARY_LINKS: Array<{ token: string; href: string }> = [
  { token: 'Appraiser page', href: '/price-intel' },
  { token: 'Appraiser', href: '/price-intel' },
  { token: 'Strategy worksheet', href: '/app/strategy' },
]

function renderSummaryWithLinks(summary: string): React.ReactNode {
  if (!summary) return summary
  // Compile a single regex that matches any known token (longest first so
  // "Appraiser page" wins over "Appraiser").
  const sorted = [...SUMMARY_LINKS].sort((a, b) => b.token.length - a.token.length)
  const pattern = new RegExp(`(${sorted.map((l) => l.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const parts = summary.split(pattern)
  return parts.map((part, idx) => {
    const link = sorted.find((l) => l.token === part)
    if (!link) return <span key={idx}>{part}</span>
    return (
      <Link
        key={idx}
        href={link.href}
        className="font-semibold underline-offset-2 hover:underline"
        style={{ color: 'var(--accent-sky)' }}
      >
        {part}
      </Link>
    )
  })
}

function PathCard({
  structure,
  index,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
  onDismiss,
}: {
  structure: DealStructure
  index: number
  propertyState?: string | null
  onOpenInStrategy?: (s: DealStructure, i: number) => void
  onShowPitch?: (s: DealStructure) => void
  onDismiss?: (s: DealStructure) => void
}) {
  const caveatOpenedRef = useRef(false)
  const accent = FAMILY_ACCENT[structure.family] || 'var(--accent-sky)'
  return (
    <div
      role="article"
      aria-label={`Path ${index + 1}: ${structure.headline}`}
      className="rounded-xl h-full min-h-0"
      style={{
        background: 'linear-gradient(0deg, var(--sky-tint-fill, transparent), var(--sky-tint-fill, transparent)), var(--surface-card)',
        border: '1px solid var(--sky-tint-border, var(--border-default))',
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
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          <span style={{ color: accent }}>{`Path ${index + 1}`}</span>
          <span style={{ color: '#FFFFFF' }}>{` · ${structure.familyLabel}`}</span>
        </span>
      </div>

      {structure.bullets && structure.bullets.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            listStyleType: 'disc',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {structure.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.4,
                color: 'var(--text-heading)',
              }}
            >
              {b}
            </li>
          ))}
        </ul>
      ) : (
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
      )}

      {structure.selectionReason && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          {structure.selectionReason}
        </p>
      )}

      {structure.levers.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto auto auto',
            columnGap: 6,
            rowGap: 4,
            alignItems: 'baseline',
            paddingTop: 8,
            paddingBottom: 8,
            borderTop: '1px solid var(--border-subtle, var(--border-default))',
            borderBottom: '1px solid var(--border-subtle, var(--border-default))',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {structure.levers.map((lever, i) => {
            // Treat an em-dash placeholder as "no before value" — hide the dash and arrow.
            const hasBefore =
              !!lever.beforeLabel && lever.beforeLabel.trim() !== '—' && lever.beforeLabel.trim() !== '-'
            return (
              <div key={i} style={{ display: 'contents' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, minWidth: 0 }}>
                  {lever.label}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                >
                  {hasBefore ? lever.beforeLabel : ''}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  {hasBefore ? '→' : ''}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    color: 'var(--text-heading)',
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                >
                  {lever.afterLabel}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    color: accent,
                    fontWeight: 700,
                    textAlign: 'right',
                    minWidth: lever.deltaLabel ? undefined : 0,
                  }}
                >
                  {lever.deltaLabel ?? ''}
                </span>
              </div>
            )
          })}
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
        {renderSummaryWithLinks(structure.summary)}
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

      {/* T13: attorney disclaimer renders on financing, strategy_switch, AND blended.
          The blended plan is structurally financing-inclusive (always carries a seller 2nd
          lever), so the contract review concern applies the same as a pure financing card. */}
      {(structure.family === 'financing' ||
        structure.family === 'strategy_switch' ||
        structure.family === 'blended') && (
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
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(structure)}
            className="ml-auto cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
            aria-label={`Hide ${structure.familyLabel} cards for 30 days`}
          >
            Not interested in this kind of deal
          </button>
        )}
      </div>
    </div>
  )
}

export function FourPathsPanel({
  payload,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
  onDismissFamily,
}: FourPathsPanelProps): ReactNode {
  const lastAssumableSigRef = useRef('')
  const lastMorbySigRef = useRef('')

  // T17 — local mirror of the dismissed list so the UI updates without a refetch.
  // Initialized from localStorage on mount; mutations write through and refresh state.
  const [sessionDismissed, setSessionDismissed] = useState<string[]>([])
  useEffect(() => {
    setSessionDismissed(getDismissedFamilies())
  }, [])

  const visiblePaths = useMemo(
    () => payload.paths.filter((p) => !sessionDismissed.includes(p.family)),
    [payload.paths, sessionDismissed],
  )

  const handleDismiss = (s: DealStructure) => {
    dismissFamily(s.family)
    const next = getDismissedFamilies()
    setSessionDismissed(next)
    trackEvent('path_family_dismissed', {
      family: s.family,
      structure_id: s.id,
      dismissed_count: dismissedCount(s.family),
      state: propertyState ?? undefined,
    })
    onDismissFamily?.(s.family)
  }

  const handleReset = () => {
    resetDismissedFamilies()
    setSessionDismissed([])
  }

  const pathsSig = visiblePaths.map((p) => p.id).join('|')

  useEffect(() => {
    if (visiblePaths.length === 0) return
    const hasAssumable = visiblePaths.some((p) => p.id === 'assumable')
    if (!hasAssumable) return
    const dedupe = `${pathsSig}|${propertyState ?? ''}`
    if (lastAssumableSigRef.current === dedupe) return
    lastAssumableSigRef.current = dedupe
    trackEvent('assumable_pv_displayed', {
      path_count: visiblePaths.length,
      state: propertyState ?? undefined,
    })
  }, [visiblePaths, pathsSig, propertyState])

  // T14: Morby Method substitution event — fires when the Morby card is in the lineup.
  // The selector substitutes Sub2 + seller-2nd with this combined card; surfacing as a
  // distinct event lets us measure how often the substitution actually triggers in the wild.
  useEffect(() => {
    if (visiblePaths.length === 0) return
    const hasMorby = visiblePaths.some((p) => p.id === 'morby-method')
    if (!hasMorby) return
    const dedupe = `${pathsSig}|${propertyState ?? ''}`
    if (lastMorbySigRef.current === dedupe) return
    lastMorbySigRef.current = dedupe
    trackEvent('morby_method_substituted', {
      path_count: visiblePaths.length,
      state: propertyState ?? undefined,
    })
  }, [visiblePaths, pathsSig, propertyState])

  if (!payload.hasPaths || visiblePaths.length === 0) {
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
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        {(() => {
          const { lead, tail } = pathCountWords(visiblePaths.length)
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
        {sessionDismissed.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
          >
            Reset preferences ({sessionDismissed.length})
          </button>
        )}
      </div>
      <div
        className="w-full min-w-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
          alignItems: 'stretch',
        }}
      >
        {visiblePaths.map((path, idx) => (
          <PathCard
            key={path.id}
            structure={path}
            index={idx}
            propertyState={propertyState}
            onOpenInStrategy={onOpenInStrategy}
            onShowPitch={onShowPitch}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}
