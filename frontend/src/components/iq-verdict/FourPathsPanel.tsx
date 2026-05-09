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
  { token: 'Strategy worksheet', href: '/strategy' },
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

/**
 * Renders a single math-carrying bullet line with inline accent coloring on the
 * arrow ("→") and any trailing percentage delta ("+0.5%", "−4.4%"). The bullet
 * marker dot is a separate flex child so the marker color tracks the family
 * accent without relying on browser-specific `::marker` styling.
 */
function MathBullet({ text, accent }: { text: string; accent: string }): ReactNode {
  // Split on tokens we want to color: the arrow and any signed % delta at the
  // end of the string. Capturing groups keep the matched delimiters in the
  // resulting array so we can render them as styled spans.
  // Match either Unicode → / -> with surrounding whitespace, or a signed %
  // with optional + / − / - prefix.
  const PARTS_RE = /(\s+→\s+|\s+->\s+|\s[+−-]\d+(?:\.\d+)?%)/g
  const segments = text.split(PARTS_RE).filter((s) => s !== '')
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        margin: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          color: accent,
          fontSize: 16,
          lineHeight: 1,
          transform: 'translateY(1px)',
        }}
      >
        ●
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: 14.5,
          fontWeight: 600,
          lineHeight: 1.45,
          color: 'var(--text-heading)',
          minWidth: 0,
          flex: 1,
        }}
      >
        {segments.map((seg, i) => {
          if (/^\s+(→|->)\s+$/.test(seg)) {
            return (
              <span key={i} style={{ color: accent, fontWeight: 700 }}>
                {' → '}
              </span>
            )
          }
          if (/^\s[+−-]\d+(?:\.\d+)?%$/.test(seg)) {
            return (
              <span key={i} style={{ color: accent, fontWeight: 700, marginLeft: 4 }}>
                {seg.trim()}
              </span>
            )
          }
          return <span key={i}>{seg}</span>
        })}
      </span>
    </li>
  )
}

/** Format the savings KPI for the header pill (e.g. "Saves $562/mo"). */
function formatSavings(monthlySavings: number): string | null {
  if (!Number.isFinite(monthlySavings) || monthlySavings <= 0) return null
  const rounded = Math.round(monthlySavings)
  return `Saves $${rounded.toLocaleString('en-US')}/mo`
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
  const savingsLabel = formatSavings(structure.monthlySavings)
  const showAttorneyLine =
    structure.family === 'strategy_switch' || structure.family === 'blended'
  const bullets = structure.bullets && structure.bullets.length > 0 ? structure.bullets : null

  return (
    <div
      role="article"
      aria-label={`Path ${index + 1}: ${structure.headline}`}
      className="rounded-xl h-full min-h-0"
      style={{
        background: 'var(--surface-card)',
        border: `1px solid ${accent}33`,
        boxShadow: `inset 4px 0 0 0 ${accent}`,
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 0,
      }}
    >
      {/* HEADER ROW — Path # · TITLE on the left, Savings KPI pill on the right.
          The KPI is the highest-impact at-a-glance number and earns the visual
          weight on the right edge of the header. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            minWidth: 0,
          }}
        >
          <span style={{ color: accent }}>{`Path ${index + 1}`}</span>
          <span style={{ color: 'var(--text-heading)' }}>
            {` · ${structure.familyLabel}`}
          </span>
        </span>
        {savingsLabel && (
          <span
            className="tabular-nums"
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              color: accent,
              background: `${accent}1A`,
              border: `1px solid ${accent}40`,
            }}
          >
            {savingsLabel}
          </span>
        )}
      </div>

      {/* MATH BULLETS — primary content. Each bullet carries the full
          before → after  delta math so the card tells the whole story without
          a separate lever block. Falls back to the plain headline when the
          template doesn't supply bullets. */}
      {bullets ? (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {bullets.map((b, i) => (
            <MathBullet key={i} text={b} accent={accent} />
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

      {/* CONTEXT — combines the selection rationale and the supporting
          summary into a single muted paragraph block. Selection reason is
          suppressed for blended-plan cards because the summary already
          carries the same thesis (data still in the structure for downstream
          consumers). */}
      <div className="flex flex-1 min-h-0 flex-col gap-2">
        {structure.selectionReason && structure.family !== 'blended' && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {structure.selectionReason}
          </p>
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
        {showAttorneyLine && (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
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

      {/* ACTIONS ROW — primary CTA on the left, secondary CTA next to it,
          Important caveat as a small inline disclosure (not a bulky block),
          and the dismissal link tucked to the right edge. */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2"
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle, var(--border-default))',
        }}
      >
        {onOpenInStrategy && (
          <button
            type="button"
            onClick={() => onOpenInStrategy(structure, index)}
            className="rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
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
            className="rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--accent-sky)',
              border: '1px solid var(--accent-sky)',
            }}
          >
            How to pitch this
          </button>
        )}
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
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--accent-sky)',
              }}
            >
              Important caveat ▾
            </summary>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                maxWidth: '100%',
              }}
            >
              {structure.caveat}
            </p>
          </details>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(structure)}
            className="ml-auto cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            aria-label={`Hide ${structure.familyLabel} cards for 30 days`}
          >
            Not interested
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
