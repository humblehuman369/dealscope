'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'

import type {
  BreakevenSummary,
  DealStructure,
  DealStructuresPayload,
  NegotiabilityRating,
  WayUnavailable,
} from '@/components/iq-verdict/PathOptionCard'
import {
  requestBreakevenNarrative,
  type BreakevenNarrative,
  type BreakevenWayInput,
} from '@/lib/api/plans'
import { trackEvent } from '@/lib/eventTracking'
import {
  FOUR_WAYS,
  describeCashToClose,
  describeChangeDetail,
  describePlay,
  findPathForFamily,
  formatMoney,
  formatMoneyCompact,
  type BreakevenFamily,
  type FourWayFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'

export interface BreakevenAnalysisProps {
  payload: DealStructuresPayload
  /** Full property address — keys the cached AI recommendation. */
  address: string
  /** Opens the wizard; `family` is set when the user tapped a specific row. */
  onMakeItWork: (family?: FourWayFamily) => void
  detailOpen: boolean
  onToggleDetail: () => void
}

/**
 * Likelihood in the words an investor would use about a seller, not a grade.
 * "High" invites the question "high what?"; "Likely" answers it.
 */
const RATING_LABEL: Record<NegotiabilityRating, string> = {
  high: 'Likely',
  medium: 'Possible',
  low: 'Long shot',
  your_call: 'Your call',
}

const RATING_COLOR: Record<NegotiabilityRating, string> = {
  high: 'var(--status-positive)',
  medium: 'var(--status-warning)',
  low: 'var(--status-negative)',
  your_call: 'var(--status-info)',
}

function LikelihoodChip({ rating }: { rating: NegotiabilityRating }): ReactNode {
  const color = RATING_COLOR[rating]
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full"
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color,
        border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {RATING_LABEL[rating]}
    </span>
  )
}

function EyebrowLabel({ children, color }: { children: ReactNode; color?: string }): ReactNode {
  return (
    <p
      className="inline-flex items-center gap-1"
      style={{
        margin: '0 0 4px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: color ?? 'var(--text-label)',
      }}
    >
      {children}
    </p>
  )
}

/**
 * How the lever works and what it costs you, in one short paragraph. Every
 * number is the engine's own; the prose only explains the mechanism and the
 * trade-off, which is the part the row itself cannot show.
 */
function explain(
  family: BreakevenFamily,
  structure: DealStructure,
  summary: BreakevenSummary | null | undefined,
): string {
  const fact = structure.breakeven
  if (!fact) return structure.summary
  const result = formatMoney(fact.resultAmount) ?? ''

  switch (family) {
    case 'price': {
      const incomeValue = summary ? formatMoney(summary.incomeValue) : null
      const lead = incomeValue
        ? `Rent covers every bill and the mortgage at ${incomeValue}. Target Buy sits 5% under that so a surprise repair does not put you underwater: ${result}.`
        : `Target Buy is the price where rent covers every bill and the mortgage, with a 5% cushion: ${result}.`
      return `${lead} It is the cleanest of the four — a lower price shrinks the loan, the payment, and the cash you bring, all at once. What you give up is nothing but the seller's agreement.`
    }
    case 'income': {
      return `Leave the price alone and fix the income instead. At ${result}/mo the property carries itself at asking. A small lift is usually a verification win — the listing rent is stale and two local property managers will confirm the real number. A large one means rehab, a unit conversion, or short-term rental, and that is a different deal with different risk.`
    }
    case 'financing': {
      const base = `The seller gets their asking price on paper; you just do not pay all of it at closing. They carry ${result} as a second note at 0% with a short balloon, so your bank loan is smaller and the payment breaks even. You keep cash in your pocket and the note gets retired when you refinance. Sellers who own free and clear say yes to this far more often than sellers who need every dollar to pay off their own mortgage.`
      if (fact.closesGapAlone) return base
      const paired = fact.termsNote?.split(';').slice(1).join(';').trim()
      return `${base} On this property even a maximum carry only closes part of the gap${paired ? `, so the numbers assume it is paired with ${paired}` : ''}.`
    }
    case 'capital_stack': {
      return `The one lever that needs nobody's permission. Put ${result} down and the loan is small enough that rent covers the payment. Nothing is negotiated and nothing can fall through. The cost is real though: that extra cash earns a thinner return here than it would as the down payment on a property that already cash flows, and it is capital you cannot get back without selling or refinancing.`
    }
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

function SkeletonLine({ width }: { width: string }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="block animate-pulse rounded"
      style={{ height: 11, width, background: 'var(--surface-elevated)' }}
    />
  )
}

const UNAVAILABLE_COLOR: Record<WayUnavailable['reason'], string> = {
  not_needed: 'var(--status-positive)',
  insufficient: 'var(--text-secondary)',
  no_data: 'var(--text-secondary)',
}

/** The short version shown on a collapsed row that has no structure. */
function unavailableHeadline(reason: WayUnavailable['reason']): string {
  switch (reason) {
    case 'not_needed':
      return 'Not needed here'
    case 'insufficient':
      return 'Cannot close it alone'
    case 'no_data':
      return 'Not enough data'
    default: {
      const exhaustive: never = reason
      return exhaustive
    }
  }
}

interface RowProps {
  family: BreakevenFamily
  name: string
  structure: DealStructure | null
  unavailable: WayUnavailable | null
  summary: BreakevenSummary | null | undefined
  expanded: boolean
  onToggle: () => void
  onBuildPlan: () => void
}

function Row({
  family,
  name,
  structure,
  unavailable,
  summary,
  expanded,
  onToggle,
  onBuildPlan,
}: RowProps): ReactNode {
  const fact = structure?.breakeven ?? null
  // Older backend payloads carry no structured fact; fall back to the engine's
  // own headline rather than claiming the way is unavailable.
  const play = fact ? describePlay(family, fact) : structure?.headline ?? null
  const changeDetail = fact ? describeChangeDetail(family, fact) : null
  const cash = structure
    ? describeCashToClose(structure.cashRequired, summary?.baselineCashRequired)
    : null
  const rating = structure?.negotiability?.rating ?? null
  const reasons = structure?.negotiability?.reasons ?? []
  const available = Boolean(structure)
  const reason = unavailable?.reason ?? 'insufficient'
  const panelId = `breakeven-${family}-panel`

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={
          available
            ? `${name}: ${play}. ${cash ? `${cash.amount} to close.` : ''} ${rating ? `${RATING_LABEL[rating]} with this seller.` : ''} Show details.`
            : `${name}: ${unavailable?.message ?? unavailableHeadline(reason)}`
        }
        className="flex w-full items-start justify-between gap-3 text-left transition-colors focus:outline-none focus-visible:ring-2"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: '12px 0',
        }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: available ? 'var(--text-heading)' : 'var(--text-secondary)',
              }}
            >
              {name}
            </span>
            {rating && <LikelihoodChip rating={rating} />}
            {!available && (
              <span style={{ fontSize: 11, fontWeight: 700, color: UNAVAILABLE_COLOR[reason] }}>
                {unavailableHeadline(reason)}
              </span>
            )}
          </span>
          <span
            className="block"
            style={{
              marginTop: 2,
              fontSize: 13.5,
              lineHeight: 1.4,
              color: available ? 'var(--text-body)' : 'var(--text-secondary)',
            }}
          >
            {available ? play : unavailable?.message ?? 'This lever does not apply to this property.'}
          </span>
        </span>
        <span className="flex shrink-0 items-start gap-2">
          {available && cash ? (
            <span className="text-right">
              <span
                className="tabular-nums block"
                style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-heading)' }}
              >
                {cash.amount}
              </span>
              <span className="block" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                to close
              </span>
              {cash.delta && (
                <span className="block" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {cash.delta}
                </span>
              )}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{
              marginTop: 2,
              color: 'var(--text-secondary)',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="flex flex-col gap-3" style={{ padding: '0 0 14px' }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
            {structure
              ? explain(family, structure, summary)
              : unavailable?.message ?? 'This lever does not apply to this property.'}
          </p>

          {changeDetail && (
            <p
              className="tabular-nums"
              style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              The ask: {changeDetail}
            </p>
          )}

          {rating && rating !== 'your_call' && reasons.length > 0 && (
            <div>
              <EyebrowLabel>Your leverage</EyebrowLabel>
              <ul
                className="m-0 flex flex-col gap-1 p-0"
                style={{ listStyle: 'none', fontSize: 13, lineHeight: 1.5, color: 'var(--text-body)' }}
              >
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
                      •
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The negotiation script is the most differentiated thing the engine
              produces. It used to sit two clicks down behind "See the full
              math"; the row is where someone about to make the call will look. */}
          {structure?.pitchScript && (
            <div
              className="rounded-xl"
              style={{
                padding: '10px 12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle, var(--border-default))',
              }}
            >
              <EyebrowLabel>How to ask for it</EyebrowLabel>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  color: 'var(--text-body)',
                }}
              >
                {structure.pitchScript}
              </p>
            </div>
          )}

          {structure?.caveat && (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--status-warning)' }}>Watch for:</strong> {structure.caveat}
            </p>
          )}

          {available && (
            <button
              type="button"
              onClick={onBuildPlan}
              className="self-start text-[13px] font-bold underline-offset-2 hover:underline"
              style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
            >
              Build a plan around {name.toLowerCase()} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Breakeven Analysis — the four single-lever ways to cash flow as an accordion.
 *
 * Each row is a trade, not a measurement: the ask on the left, what it costs
 * you at close on the right. Cash to close is the figure that carries the
 * comparison because every lever solves to the same breakeven cash flow, so
 * showing resulting cash flow would make all four rows look identical.
 *
 * The section-level "Your move" gives sequencing and a walk-away — the only
 * things the rows cannot show. Per-lever AI prose was removed deliberately:
 * it could only restate numbers already on screen.
 */
export function BreakevenAnalysis({
  payload,
  address,
  onMakeItWork,
  detailOpen,
  onToggleDetail,
}: BreakevenAnalysisProps): ReactNode {
  const [expanded, setExpanded] = useState<BreakevenFamily | null>(null)
  const [narrative, setNarrative] = useState<BreakevenNarrative | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const narrativeRequested = useRef(false)

  const summary = payload.breakevenSummary
  const unavailableByFamily = new Map(
    (payload.unavailableWays ?? []).map((w) => [w.family, w] as const),
  )

  const loadNarrative = useCallback(async () => {
    if (narrativeRequested.current) return
    narrativeRequested.current = true
    const ways: BreakevenWayInput[] = []
    for (const way of FOUR_WAYS) {
      const s = findPathForFamily(payload.paths, way.family)
      const f = s?.breakeven
      if (!s || !f) continue
      ways.push({
        family: way.family,
        name: way.name,
        change_pct: f.changePct,
        change_amount: f.changeAmount,
        result_amount: f.resultAmount,
        result_label: f.resultLabel,
        closes_gap_alone: f.closesGapAlone,
        terms_note: f.termsNote,
        rating: s.negotiability?.rating ?? null,
        reasons: s.negotiability?.reasons ?? [],
        cash_required: Number.isFinite(s.cashRequired) ? s.cashRequired : null,
      })
    }
    if (ways.length === 0) return
    setNarrativeLoading(true)
    try {
      const result = await requestBreakevenNarrative({
        address,
        list_price: summary?.listPrice ?? null,
        target_buy_price: summary?.targetBuyPrice ?? null,
        income_value: summary?.incomeValue ?? null,
        gap_amount: summary?.gapAmount ?? null,
        gap_pct: summary?.gapPct ?? null,
        monthly_shortfall: summary?.monthlyShortfall ?? null,
        baseline_cash_required: summary?.baselineCashRequired ?? null,
        ways,
        blend_recommendation: payload.blendRecommendation ?? null,
      })
      setNarrative(result)
      trackEvent('breakeven_narrative_loaded', { source: result.source, way_count: ways.length })
    } catch {
      // The deterministic explanations, leverage, and scripts are already on
      // screen; the "Your move" block simply does not appear.
    } finally {
      setNarrativeLoading(false)
    }
  }, [payload.paths, payload.blendRecommendation, address, summary])

  const toggleRow = (family: BreakevenFamily) => {
    setExpanded((prev) => {
      const next = prev === family ? null : family
      if (next) {
        trackEvent('breakeven_row_expanded', { family })
        void loadNarrative()
      }
      return next
    })
  }

  const shortfall = summary && summary.monthlyShortfall > 0 ? formatMoney(summary.monthlyShortfall) : null
  const gap = summary && summary.gapAmount > 0 ? formatMoneyCompact(summary.gapAmount) : null
  const showMove = Boolean(narrative || narrativeLoading)

  return (
    <section
      aria-labelledby="breakeven-heading"
      className="w-full min-w-0"
      style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div>
        <h3
          id="breakeven-heading"
          style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.2, color: 'var(--text-heading)' }}
        >
          Breakeven Analysis
        </h3>
        {/* Stakes first: the monthly loss is the reason any of this matters, and
            it is the one number that makes the four rows feel consequential. */}
        <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)' }}>
          {shortfall ? (
            <>
              At the asking price this property loses{' '}
              <strong style={{ color: 'var(--text-heading)' }}>{shortfall} a month</strong>. Closing{' '}
              {gap ? <strong style={{ color: 'var(--text-heading)' }}>{gap}</strong> : 'the gap'} turns it into a
              deal.
            </>
          ) : (
            <>Today’s rent does not quite cover what this property costs to own. That is normal at asking.</>
          )}{' '}
          Four ways get you there — each one asks something different of you and the seller.
        </p>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-label)',
          }}
        >
          Pick your lever, or blend them
        </p>
      </div>

      <div className="w-full min-w-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {FOUR_WAYS.map((way) => (
          <Row
            key={way.family}
            family={way.family}
            name={way.name}
            structure={findPathForFamily(payload.paths, way.family)}
            unavailable={unavailableByFamily.get(way.family) ?? null}
            summary={summary}
            expanded={expanded === way.family}
            onToggle={() => toggleRow(way.family)}
            onBuildPlan={() => onMakeItWork(way.family)}
          />
        ))}
      </div>

      {payload.blendRecommendation && (
        <div
          className="rounded-xl"
          style={{
            padding: '12px 14px',
            background: 'var(--surface-card)',
            border: '1px solid color-mix(in srgb, var(--accent-sky) 35%, transparent)',
          }}
        >
          <EyebrowLabel color="var(--accent-sky)">Most likely close: a blend</EyebrowLabel>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
            {payload.blendRecommendation}
          </p>
        </div>
      )}

      {showMove && (
        <div
          className="rounded-xl"
          style={{
            padding: '12px 14px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle, var(--border-default))',
          }}
        >
          <EyebrowLabel>
            <Sparkles size={11} aria-hidden="true" /> Your move
          </EyebrowLabel>
          {narrative ? (
            <>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                {narrative.move}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}
              >
                <strong style={{ color: 'var(--status-warning)' }}>Walk away if:</strong>{' '}
                {narrative.walk_away}
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Writing your move">
              <SkeletonLine width="94%" />
              <SkeletonLine width="88%" />
              <SkeletonLine width="61%" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-2">
        <button
          type="button"
          onClick={() => onMakeItWork()}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Build my plan
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={onToggleDetail}
          aria-expanded={detailOpen}
          className="self-start text-[12px] font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
        >
          {detailOpen ? 'Hide the full math' : 'See the full math'}
        </button>
      </div>
    </section>
  )
}
