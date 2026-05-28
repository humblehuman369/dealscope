'use client'

import type { ReactNode } from 'react'
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

export const FAMILY_ACCENT: Record<StructureFamily, string> = {
  price: '#84cc16',
  capital_stack: '#22c55e',
  financing: 'var(--accent-sky)',
  income: '#a78bfa',
  strategy_switch: '#f97316',
  blended: '#8b5cf6',
}

// In-summary tokens that should be rendered as clickable links to the matching
// in-app tool. Keeps copy-side wording stable while letting product link to the
// right surface (e.g. "Appraiser page" → /price-intel).
const SUMMARY_LINKS: Array<{ token: string; href: string }> = [
  { token: 'Appraiser page', href: '/price-intel' },
  { token: 'Appraiser', href: '/price-intel' },
  { token: 'Strategy worksheet', href: '/strategy' },
]

export function renderSummaryWithLinks(summary: string): ReactNode {
  if (!summary) return summary
  const sorted = [...SUMMARY_LINKS].sort((a, b) => b.token.length - a.token.length)
  const pattern = new RegExp(
    `(${sorted.map((l) => l.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g',
  )
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

function MathBullet({ text, accent }: { text: string; accent: string }): ReactNode {
  const LABEL_RE = /^([A-Za-z0-9][A-Za-z0-9 &/.]*:)(\s*)([\s\S]*)$/
  const labelMatch = text.match(LABEL_RE)
  const labelPart = labelMatch ? labelMatch[1] : null
  let remainder = labelMatch ? labelMatch[3] : text

  const ARROW_RE = /\s+(→|->)\s+/g
  let lastArrow: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = ARROW_RE.exec(remainder)) !== null) {
    lastArrow = m
  }
  if (lastArrow) {
    remainder = remainder.substring(lastArrow.index + lastArrow[0].length)
  }

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

function formatSavings(monthlySavings: number): string | null {
  if (!Number.isFinite(monthlySavings) || monthlySavings <= 0) return null
  const rounded = Math.round(monthlySavings)
  return `Saves $${rounded.toLocaleString('en-US')}/mo`
}

export interface PathOptionCardProps {
  structure: DealStructure
  index: number
  propertyState?: string | null
  onOpenInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
  onDismiss?: (structure: DealStructure) => void
  /** Strategy page: worksheet already reflects this option */
  applied?: boolean
}

export function PathOptionCard({
  structure,
  index,
  propertyState,
  onOpenInStrategy,
  onShowPitch,
  onDismiss,
  applied = false,
}: PathOptionCardProps): ReactNode {
  const accent = FAMILY_ACCENT[structure.family] || 'var(--accent-sky)'
  const savingsLabel = formatSavings(structure.monthlySavings)
  const showAttorneyLine = structure.family === 'strategy_switch' || structure.family === 'blended'
  const bullets = structure.bullets && structure.bullets.length > 0 ? structure.bullets : null

  const savingsParts = (() => {
    if (!savingsLabel) return null
    const firstSpace = savingsLabel.indexOf(' ')
    if (firstSpace <= 0) return { verb: savingsLabel, amount: '' }
    return {
      verb: savingsLabel.slice(0, firstSpace),
      amount: savingsLabel.slice(firstSpace + 1),
    }
  })()

  const showActions = Boolean(
    onOpenInStrategy || (structure.pitchScript && onShowPitch) || onDismiss || applied,
  )

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
        <span
          className="flex items-center flex-wrap gap-x-2 gap-y-1"
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text-heading)',
          }}
        >
          <span style={{ color: accent }}>{`Option ${index + 1}`}</span>
          {savingsParts && (
            <>
              <span aria-hidden="true" style={{ color: accent, fontWeight: 800, fontSize: 17 }}>
                →
              </span>
              <span className="tabular-nums">
                <span style={{ fontWeight: 500, opacity: 0.85 }}>{savingsParts.verb}</span>
                {savingsParts.amount && (
                  <span style={{ fontWeight: 700 }}> {savingsParts.amount}</span>
                )}
              </span>
            </>
          )}
        </span>

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
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-body)',
              }}
            >
              <span aria-hidden="true">* </span>
              {structure.caveat}
            </p>
          )}
          {showAttorneyLine && (
            <p
              style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}
            >
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

        {showActions && (
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
            {applied && (
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--accent-sky)',
                  color: '#FFFFFF',
                }}
              >
                Applied to worksheet
              </span>
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
        )}
      </div>
    </div>
  )
}
