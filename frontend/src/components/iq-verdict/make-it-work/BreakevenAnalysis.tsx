'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'

import type {
  BreakevenSummary,
  DealStructure,
  DealStructuresPayload,
  NegotiabilityRating,
} from '@/components/iq-verdict/PathOptionCard'
import {
  requestBreakevenNarrative,
  type BreakevenNarrative,
  type BreakevenWayInput,
} from '@/lib/api/plans'
import { trackEvent } from '@/lib/eventTracking'
import {
  FOUR_WAYS,
  describeBreakevenChange,
  describeBreakevenResult,
  findPathForFamily,
  formatMoney,
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

const RATING_LABEL: Record<NegotiabilityRating, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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

/**
 * The teaching paragraph for each way. Every number is the engine's own; the
 * prose only explains what the number means.
 */
function explain(
  family: BreakevenFamily,
  structure: DealStructure,
  summary: BreakevenSummary | null | undefined,
): string {
  const fact = structure.breakeven
  if (!fact) return structure.summary
  const result = formatMoney(fact.resultAmount) ?? ''
  const change = formatMoney(fact.changeAmount)
  const pct = fact.changePct != null ? `${fact.changePct.toFixed(1)}%` : null

  switch (family) {
    case 'price': {
      const incomeValue = summary ? formatMoney(summary.incomeValue) : null
      const lead = incomeValue
        ? `Breakeven is the price where the rent covers every bill and the mortgage — about ${incomeValue} here. Target Buy sits 5% under that as a cushion: ${result}.`
        : `Target Buy is the price where the rent covers every bill and the mortgage, with a 5% cushion: ${result}.`
      const ask = pct && change ? ` Getting there means the seller comes down ${pct} (${change}).` : ''
      return `${lead}${ask} A lower price also means a smaller loan and less cash to close.`
    }
    case 'income': {
      const lift = pct && change ? ` — ${pct} (${change}/mo) above today's estimate —` : ''
      return `Hold the asking price and lift the income instead. Rent has to reach ${result}/mo${lift} for the property to carry itself. Small lifts are usually a verification win (two property managers confirm it); big ones mean rehab or a strategy change.`
    }
    case 'financing': {
      const base = `Pay the asking price, but the seller carries ${result} as a second note at 0% interest with a short balloon. Your bank loan shrinks by that amount, so the monthly payment drops enough to break even. The seller gets their number today and the note paid off when you refinance.`
      if (fact.closesGapAlone) return base
      const paired = fact.termsNote?.split(';').slice(1).join(';').trim()
      return `${base} On this property even a maximum carry only closes part of the gap${paired ? ` — the numbers assume it is paired with ${paired}` : ''}.`
    }
    case 'capital_stack': {
      const to = fact.termsNote ? ` (${fact.termsNote})` : ''
      const extra = change ? `, about ${change} more than the standard plan` : ''
      return `Put more of your own cash down — ${result}${to}${extra}. The loan is smaller, so the payment breaks even without asking the seller for anything. The trade is a lower return on your cash and more capital tied up in one property.`
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

interface RowProps {
  family: BreakevenFamily
  name: string
  meaning: string
  structure: DealStructure | null
  summary: BreakevenSummary | null | undefined
  expanded: boolean
  onToggle: () => void
  recommendation: string | null
  recommendationLoading: boolean
  onBuildPlan: () => void
}

function Row({
  family,
  name,
  meaning,
  structure,
  summary,
  expanded,
  onToggle,
  recommendation,
  recommendationLoading,
  onBuildPlan,
}: RowProps): ReactNode {
  const fact = structure?.breakeven ?? null
  // Older backend payloads carry no structured fact; fall back to the engine's
  // own headline rather than claiming the way is unavailable.
  const change = fact ? describeBreakevenChange(family, fact) : structure?.headline ?? null
  const result = fact ? describeBreakevenResult(fact) : null
  const rating = structure?.negotiability?.rating ?? null
  const reasons = structure?.negotiability?.reasons ?? []
  const available = Boolean(structure)
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
            ? `${name}: ${change}. ${result ? `${result.label} ${result.amount}.` : ''} ${rating ? `Likelihood ${RATING_LABEL[rating]}.` : ''} Show details.`
            : `${name}: ${meaning}. Not enough lift on this property.`
        }
        className="flex w-full items-start justify-between gap-3 text-left transition-colors focus:outline-none focus-visible:ring-2"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: '12px 0',
          opacity: available ? 1 : 0.6,
        }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-heading)' }}>{name}</span>
            {rating && <LikelihoodChip rating={rating} />}
          </span>
          <span
            className="block"
            style={{ marginTop: 2, fontSize: 13.5, lineHeight: 1.4, color: 'var(--text-body)' }}
          >
            {available ? change : 'Not enough lift here'}
          </span>
        </span>
        <span className="flex shrink-0 items-start gap-2">
          {available && result ? (
            <span className="text-right">
              <span
                className="tabular-nums block"
                style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-heading)' }}
              >
                {result.amount}
              </span>
              <span
                className="block"
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                {result.label}
              </span>
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
            {structure ? explain(family, structure, summary) : meaning}
          </p>

          {rating && (
            <div>
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                {rating === 'your_call' ? 'Who decides' : 'Likelihood with this seller'}
              </p>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: RATING_COLOR[rating] }}>
                {RATING_LABEL[rating]}
              </p>
              {reasons.length > 0 && (
                <ul
                  className="m-0 flex flex-col gap-1 p-0"
                  style={{ marginTop: 4, listStyle: 'none', fontSize: 13, lineHeight: 1.5, color: 'var(--text-body)' }}
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
              )}
            </div>
          )}

          {(recommendation || recommendationLoading) && (
            <div
              className="rounded-xl"
              style={{
                padding: '10px 12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle, var(--border-default))',
              }}
            >
              <p
                className="inline-flex items-center gap-1"
                style={{
                  margin: '0 0 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                }}
              >
                <Sparkles size={11} aria-hidden="true" /> Recommendation
              </p>
              {recommendation ? (
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>
                  {recommendation}
                </p>
              ) : (
                <div className="flex flex-col gap-2" aria-busy="true" aria-label="Writing the recommendation">
                  <SkeletonLine width="94%" />
                  <SkeletonLine width="72%" />
                </div>
              )}
            </div>
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
 * Breakeven Analysis — the four single-lever ways to cash flow as an accordion,
 * each with the engine's exact change and result, the seller-likelihood chip,
 * and (on first expand) an AI recommendation. The blend note sits under the
 * rows because a small concession on several levers is the probable close.
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
        ways,
        blend_recommendation: payload.blendRecommendation ?? null,
      })
      setNarrative(result)
      trackEvent('breakeven_narrative_loaded', { source: result.source, way_count: ways.length })
    } catch {
      // The deterministic reasons and explanations are already on screen; the
      // recommendation box simply does not appear.
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

  const gapPct = summary && summary.gapPct > 0 ? `${summary.gapPct.toFixed(1)}%` : null
  const shortfall = summary && summary.monthlyShortfall > 0 ? formatMoney(summary.monthlyShortfall) : null
  const blendText = narrative?.blend ?? payload.blendRecommendation ?? null

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
        <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)' }}>
          The current price is more than today’s rent can support. That is normal. Here are four ways
          investors get to cash flow.
        </p>
        {(gapPct || shortfall) && (
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {gapPct ? `Asking is ${gapPct} above Target Buy` : null}
            {gapPct && shortfall ? ' · ' : null}
            {shortfall ? `about ${shortfall}/mo short at asking` : null}
          </p>
        )}
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
          Breakeven requires one of the following, or a partial blend of each
        </p>
      </div>

      <div className="w-full min-w-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {FOUR_WAYS.map((way) => (
          <Row
            key={way.family}
            family={way.family}
            name={way.name}
            meaning={way.meaning}
            structure={findPathForFamily(payload.paths, way.family)}
            summary={summary}
            expanded={expanded === way.family}
            onToggle={() => toggleRow(way.family)}
            recommendation={narrative?.ways[way.family] ?? null}
            recommendationLoading={narrativeLoading && !narrative}
            onBuildPlan={() => onMakeItWork(way.family)}
          />
        ))}
      </div>

      {blendText && (
        <div
          className="rounded-xl"
          style={{
            padding: '12px 14px',
            background: 'var(--surface-card)',
            border: '1px solid color-mix(in srgb, var(--accent-sky) 35%, transparent)',
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--accent-sky)',
            }}
          >
            Most likely close: a blend
          </p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-body)' }}>{blendText}</p>
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
