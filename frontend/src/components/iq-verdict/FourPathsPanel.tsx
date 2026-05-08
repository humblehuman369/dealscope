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
import { AskIQ } from '@/components/iq-verdict/AskIQ'
import { IQIcon } from '@/lib/iq/iqIcon'

export type StructureFamily =
  | 'price'
  | 'capital_stack'
  | 'financing'
  | 'income'
  | 'strategy_switch'
  | 'blended'
  // Activation Arc Phase 0 — conventional headline blend rendered above the
  // Four Paths panel via HeadlineStructureCard. Never appears in the cards
  // grid below; included in the union so payload typing stays exhaustive.
  | 'conventional_headline'

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
  // Activation Arc Phase 0 (E2 + E3). See docs/feature-plans/ACTIVATION_ARC.md §3.
  /**
   * Recommended starting structure for this property — a conventional blend
   * of price, rent, and down-payment levers. Null when no plausible
   * conventional structure cashflows; the verdict UI then falls back to the
   * existing motivating-tier behavior (honest gating, no fabricated card).
   */
  headlineStructure?: DealStructure | null
  /**
   * Gap between buyer's profile cash and what the headline structure
   * requires at close, in dollars. Null when buyer cash is unknown or no
   * headline structure exists. When > 0, the engine has already promoted
   * one financing-family card with downpayment-reducer copy in `paths`.
   */
  cashShortfall?: number | null
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
  /**
   * Activation Arc Phase 0 (A1) — when a HeadlineStructureCard renders above
   * this panel (i.e. `payload.headlineStructure != null`), the panel header
   * reframes from "Four paths to make this work" to "Other ways to close this
   * gap on this property." Pass true from the verdict page once the headline
   * is known to be present.
   */
  hasHeadlineAbove?: boolean
}

const FAMILY_ACCENT: Record<StructureFamily, string> = {
  price: '#84cc16',
  capital_stack: '#22c55e',
  financing: 'var(--accent-sky)',
  income: '#a78bfa',
  strategy_switch: '#f97316',
  blended: '#8b5cf6',
  // conventional_headline never renders inside this panel — it sits above the
  // Four Paths grid in HeadlineStructureCard. The entry is required for type
  // exhaustiveness; falling back to the brand accent keeps any defensive
  // rendering visually coherent.
  conventional_headline: 'var(--accent-sky)',
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
            fontSize: 18,
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
            color: '#FFFFFF',
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
  hasHeadlineAbove,
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
          // Activation Arc Phase 0 (A1) — when a HeadlineStructureCard sits
          // above this panel, the cards below are *alternatives to the
          // recommended structure*, not the answer. Reframing the header
          // copy is the smallest possible change with the largest meaning
          // shift: the cards stop reading as "the answer" and start reading
          // as "other ways investors approach properties like this."
          if (hasHeadlineAbove) {
            return (
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-heading)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* D3 — IQ icon attributes the alternatives to IQ.
                    With the headline structure (also IQ-attributed) above,
                    the icon here creates continuity. */}
                <IQIcon size={20} ariaLabel="" />
                <span style={{ color: 'var(--accent-sky-light)' }}>Other ways</span>{' '}
                to close this gap
              </p>
            )
          }
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

      {/* Activation Arc Phase 3 (C1) — Ask IQ chip lives below the path
          cards. Opens a modal with curated negotiation Q&A. Curated content
          only in v1; freeform LLM responses are explicitly out of scope per
          ACTIVATION_ARC.md §9 non-goals. */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
        <AskIQ fromPanel="four_paths" />
      </div>
    </div>
  )
}
