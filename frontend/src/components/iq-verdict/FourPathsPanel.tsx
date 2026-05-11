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
  const noun = n === 1 ? 'Option' : 'Options'
  return { lead: `${word} ${noun}`, tail: 'to Make This Work' }
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
 * Renders a single bullet line as a clean "Label: value" pair, stripping any
 * "before → after" formula and trailing signed-% delta the backend may emit.
 * The bullet marker dot is a separate flex child so the marker color tracks
 * the family accent without relying on browser-specific `::marker` styling.
 *
 * Examples of input → rendered remainder:
 *   "Offer price: $577K → $577K"                     → "$577K"
 *   "1st mortgage: $404K → $317K @ 6.0%"             → "$317K @ 6.0%"
 *   "Target Rent: $3,510 + $555 → $4,065 +15.8%"     → "$4,065"
 *   "Monthly P&I: $2,422 → $1,925"                   → "$1,925"
 *   "Seller 2nd: $87K (0%, 5yr balloon)"             → "$87K (0%, 5yr balloon)"
 *
 * Rationale: option cards should communicate the resulting deal terms, not
 * the underlying math. The before → after formula is useful for math-savvy
 * users on the Strategy worksheet, but on the Discovery cards it adds noise.
 */
function MathBullet({ text, accent }: { text: string; accent: string }): ReactNode {
  // Detect a leading "Label:" prefix so we can render it with a lighter weight
  // than the numeric value. Keeps the eye on the dollar amount and makes the
  // labels feel like supporting context rather than competing emphasis.
  // Labels can include letters, digits, spaces and a few punctuation chars
  // (e.g. "Monthly P&I", "1st mortgage").
  const LABEL_RE = /^([A-Za-z0-9][A-Za-z0-9 &/.]*:)(\s*)([\s\S]*)$/
  const labelMatch = text.match(LABEL_RE)
  const labelPart = labelMatch ? labelMatch[1] : null
  let remainder = labelMatch ? labelMatch[3] : text

  // Strip "before → after" formula: keep only the part after the LAST arrow.
  // Using a stateful regex so multi-arrow inputs (rare but possible) collapse
  // to the final value, which is always the rightmost segment.
  const ARROW_RE = /\s+(→|->)\s+/g
  let lastArrow: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = ARROW_RE.exec(remainder)) !== null) {
    lastArrow = m
  }
  if (lastArrow) {
    remainder = remainder.substring(lastArrow.index + lastArrow[0].length)
  }

  // Strip a trailing signed-% delta (e.g. " +15.8%", " −24.4%"). These are
  // meaningful only when paired with a before-value; without the arrow they
  // become orphaned noise.
  remainder = remainder.replace(/\s[+−-]\d+(?:\.\d+)?%\s*$/, '').trim()

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
          fontSize: 11,
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
        {labelPart && (
          <span
            style={{
              fontWeight: 400,
              display: 'inline-block',
              minWidth: '11ch',
              marginRight: 6,
            }}
          >
            {labelPart}
          </span>
        )}
        {remainder}
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
  const accent = FAMILY_ACCENT[structure.family] || 'var(--accent-sky)'
  const savingsLabel = formatSavings(structure.monthlySavings)
  const showAttorneyLine =
    structure.family === 'strategy_switch' || structure.family === 'blended'
  // For the Rent Increase ("income") card, split a combined "Target Rent: <formula>"
  // bullet into two lines (label + formula) so the long arithmetic expression
  // doesn't visually compete with the label. The backend template already emits
  // the split form, but this normalizer keeps the UI working against older
  // backend builds that still emit a single concatenated bullet.
  const bullets = (() => {
    const raw = structure.bullets && structure.bullets.length > 0 ? structure.bullets : null
    if (!raw) return null
    if (structure.family === 'income' && raw.length === 1) {
      const match = raw[0].match(/^(Target Rent:)\s*\u00A0?\s*(\$.+)$/)
      if (match) return [match[1], match[2]]
    }
    return raw
  })()

  // Split "Saves $147/mo" into verb + amount so the dollar value carries
  // the visual weight on the ribbon while "SAVES" reads as a soft label.
  const savingsParts = (() => {
    if (!savingsLabel) return null
    const firstSpace = savingsLabel.indexOf(' ')
    if (firstSpace <= 0) return { verb: savingsLabel, amount: '' }
    return {
      verb: savingsLabel.slice(0, firstSpace),
      amount: savingsLabel.slice(firstSpace + 1),
    }
  })()

  return (
    <div
      role="article"
      aria-label={`Option ${index + 1}: ${structure.headline}`}
      className="rounded-xl h-full min-h-0 overflow-hidden flex flex-col"
      style={{
        background: 'var(--surface-card)',
        border: `1px solid ${accent}33`,
        minHeight: 0,
      }}
    >
      {/* RIBBON HEADER — Bold uppercase "OPTION N → SAVES $X/MO" on a
          dark band that anchors the card identity. The arrow takes the
          family accent so each option is instantly distinguishable across
          the four-card row. */}
      <div
        style={{
          background: 'var(--surface-elevated)',
          borderBottom: `2px solid ${accent}`,
          padding: '10px 16px',
        }}
      >
        <span
          className="flex items-center flex-wrap gap-x-2 gap-y-1"
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            color: 'var(--text-heading)',
          }}
        >
          <span style={{ color: accent }}>{`Option ${index + 1}`}</span>
          {savingsParts && (
            <>
              <span
                aria-hidden="true"
                style={{ color: accent, fontWeight: 900, fontSize: 15 }}
              >
                →
              </span>
              <span className="tabular-nums">
                <span style={{ fontWeight: 600, opacity: 0.85 }}>
                  {savingsParts.verb}
                </span>
                {savingsParts.amount && (
                  <span style={{ fontWeight: 800 }}>{' '}{savingsParts.amount}</span>
                )}
              </span>
            </>
          )}
        </span>
      </div>

      {/* BODY */}
      <div
        style={{
          padding: '16px 18px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* FAMILY TITLE — strategy name as the body heading
            (e.g. "Creative Finance", "Capital Stack"). */}
        <h4
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--text-heading)',
          }}
        >
          {structure.familyLabel}
        </h4>

        {/* MATH BULLETS — primary content. Each bullet carries the full
            before → after delta math so the card tells the whole story without
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
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.4,
              color: 'var(--text-heading)',
            }}
          >
            {structure.headline}
          </p>
        )}

        {/* CONTEXT — selection rationale + summary, then italic asterisk
            caveat (always visible, small/muted), then attorney CTA when
            relevant. Caveat is no longer collapsible: it's important enough
            to read at a glance, like the asterisked assumption note in the
            reference design. */}
        <div className="flex flex-1 min-h-0 flex-col gap-2">
          {structure.selectionReason && structure.family !== 'blended' && (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-heading)' }}>
              {structure.selectionReason}
            </p>
          )}
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--text-heading)',
            }}
          >
            {renderSummaryWithLinks(structure.summary)}
          </p>
          {structure.caveat && (
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
            >
              <span aria-hidden="true">* </span>
              {structure.caveat}
            </p>
          )}
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
                letterSpacing: '0.01em',
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
