'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
  defaultAdvice,
  describeCashToClose,
  describePlay,
  explainPlay,
  findPathForFamily,
  needsBlend,
  openingLine,
  pickBackupPath,
  pickLeadPath,
  situationSub,
  situationTitle,
  unavailableLine,
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
      className="inline-flex shrink-0 items-center rounded-full text-[11px] sm:text-[12px] font-bold uppercase tracking-wide"
      style={{
        padding: '3px 8px',
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
      className="inline-flex items-center gap-1 text-[12px] sm:text-[14px] font-bold uppercase tracking-wide"
      style={{
        margin: '0 0 8px',
        color: color ?? 'var(--text-label)',
      }}
    >
      {children}
    </p>
  )
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

function unavailableChip(reason: WayUnavailable['reason']): string {
  switch (reason) {
    case 'not_needed':
      return 'Skip'
    case 'insufficient':
      return 'Won’t get you there'
    case 'no_data':
      return 'No data'
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
  isLead: boolean
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
  isLead,
  expanded,
  onToggle,
  onBuildPlan,
}: RowProps): ReactNode {
  const fact = structure?.breakeven ?? null
  const play = fact ? describePlay(family, fact) : structure?.headline ?? null
  const cash = structure
    ? describeCashToClose(structure.cashRequired, summary?.baselineCashRequired)
    : null
  const rating = structure?.negotiability?.rating ?? null
  const reasons = (structure?.negotiability?.reasons ?? []).slice(0, 2)
  const available = Boolean(structure)
  const reason = unavailable?.reason ?? 'insufficient'
  const skippedLine = unavailableLine(family, reason, unavailable?.message ?? null)
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
            ? `${name}: ${play}. ${cash ? `${cash.amount} to close.` : ''} ${rating ? `${RATING_LABEL[rating]} with this seller.` : ''} ${isLead ? 'Start here. ' : ''}Show details.`
            : `${name}: ${skippedLine}`
        }
        className="flex w-full items-start justify-between gap-4 text-left transition-colors focus:outline-none focus-visible:ring-2"
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: '16px 0',
        }}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              className="text-[14px] sm:text-[16px] font-bold uppercase tracking-wide"
              style={{
                color: available ? 'var(--text-heading)' : 'var(--text-secondary)',
              }}
            >
              {name}
            </span>
            {isLead && available && (
              <span
                className="text-[12px] sm:text-[14px] font-bold"
                style={{ color: 'var(--accent-sky)' }}
              >
                Start here
              </span>
            )}
            {rating && <LikelihoodChip rating={rating} />}
            {!available && (
              <span
                className="text-[12px] sm:text-[14px] font-bold"
                style={{ color: UNAVAILABLE_COLOR[reason] }}
              >
                {unavailableChip(reason)}
              </span>
            )}
          </span>
          <span
            className="block text-[13px] sm:text-[16px] font-semibold"
            style={{
              marginTop: 6,
              lineHeight: 1.45,
              color: available ? 'var(--text-body)' : 'var(--text-secondary)',
            }}
          >
            {available ? play : skippedLine}
          </span>
          {available && cash?.delta && (
            <span
              className="block text-[12px] sm:text-[14px] font-semibold"
              style={{ marginTop: 4, color: 'var(--text-secondary)' }}
            >
              {cash.delta}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-start gap-2">
          {available && cash ? (
            <span className="w-[4.75rem] text-right sm:w-auto">
              <span
                className="tabular-nums block text-[15px] sm:text-[18px] font-bold"
                style={{ color: 'var(--text-heading)' }}
              >
                {cash.amount}
              </span>
              <span
                className="block text-[11px] sm:text-[12px] font-bold uppercase tracking-wide"
                style={{ color: 'var(--text-label)' }}
              >
                to close
              </span>
            </span>
          ) : null}
          <ChevronDown
            size={18}
            aria-hidden="true"
            style={{
              marginTop: 3,
              color: 'var(--text-secondary)',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 160ms ease',
            }}
          />
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="flex flex-col gap-3.5" style={{ padding: '0 0 18px' }}>
          {available && (
            <p
              className="text-[14px] sm:text-[17px] font-bold"
              style={{ margin: 0, lineHeight: 1.45, color: 'var(--text-heading)' }}
            >
              {openingLine(family, fact)}
            </p>
          )}

          <p
            className="text-[13px] sm:text-[16px]"
            style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-body)' }}
          >
            {structure
              ? explainPlay(family, structure.breakeven?.closesGapAlone !== false)
              : skippedLine}
          </p>

          {rating && rating !== 'your_call' && reasons.length > 0 && (
            <p
              className="text-[12px] sm:text-[14px] font-semibold"
              style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}
            >
              {reasons.join(' · ')}
            </p>
          )}

          {structure?.caveat && (
            <p
              className="text-[12px] sm:text-[14px]"
              style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}
            >
              Watch for: {structure.caveat}
            </p>
          )}

          {available && (
            <button
              type="button"
              onClick={onBuildPlan}
              className="self-start text-[13px] sm:text-[16px] font-bold underline-offset-2 hover:underline"
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
 * Four ways to cash flow — an offer memo, not a glossary.
 *
 * Header states the gap in dollars and the recommended play. Each row is a
 * trade (ask vs cash to close). Expand adds the trade-off and the opening
 * line, never the same number again. The blend box only appears when a
 * single lever is unlikely to close it.
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

  const lead = pickLeadPath(payload.paths)
  const backup = pickBackupPath(payload.paths, lead)
  const showBlend = needsBlend(summary, payload.paths)
  const advice = narrative?.move ?? defaultAdvice(summary, lead, backup)

  return (
    <section
      aria-labelledby="breakeven-heading"
      className="w-full min-w-0"
      style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div>
        <h3
          id="breakeven-heading"
          className="text-[20px] sm:text-[24px] font-bold"
          style={{ margin: 0, lineHeight: 1.2, color: 'var(--text-heading)' }}
        >
          {situationTitle(summary?.gapAmount)}
        </h3>
        <p
          className="text-[13px] sm:text-[16px]"
          style={{ margin: '8px 0 0', lineHeight: 1.5, color: 'var(--text-body)' }}
        >
          {situationSub(summary?.gapPct, summary?.monthlyShortfall)}
        </p>
      </div>

      <div
        className="rounded-xl"
        style={{
          padding: '16px 18px',
          background: 'var(--surface-card)',
          border: '1px solid color-mix(in srgb, var(--accent-sky) 45%, transparent)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <EyebrowLabel color="var(--accent-sky)">Your move</EyebrowLabel>
        {narrativeLoading && !narrative ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Writing your move">
            <SkeletonLine width="94%" />
            <SkeletonLine width="72%" />
          </div>
        ) : (
          <>
            <p
              className="text-[13px] sm:text-[16px] font-semibold"
              style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-heading)' }}
            >
              {advice}
            </p>
            {narrative?.walk_away && (
              <p
                className="text-[12px] sm:text-[15px]"
                style={{ margin: '10px 0 0', lineHeight: 1.55, color: 'var(--text-secondary)' }}
              >
                Walk away if: {narrative.walk_away}
              </p>
            )}
          </>
        )}
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
            isLead={lead?.family === way.family}
            expanded={expanded === way.family}
            onToggle={() => toggleRow(way.family)}
            onBuildPlan={() => onMakeItWork(way.family)}
          />
        ))}
      </div>

      {showBlend && payload.blendRecommendation && (
        <div
          className="rounded-xl"
          style={{
            padding: '16px 18px',
            background: 'var(--surface-card)',
            border: '1px solid color-mix(in srgb, var(--accent-sky) 45%, transparent)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <EyebrowLabel color="var(--accent-sky)">Most likely close: a blend</EyebrowLabel>
          <p
            className="text-[13px] sm:text-[16px] font-semibold"
            style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-heading)' }}
          >
            {payload.blendRecommendation}
          </p>
        </div>
      )}

      <div className="flex flex-col items-stretch gap-3">
        <button
          type="button"
          onClick={() => onMakeItWork()}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] sm:text-[17px] font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Build my plan
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={onToggleDetail}
          aria-expanded={detailOpen}
          className="self-start text-[12px] sm:text-[14px] font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: 0 }}
        >
          {detailOpen ? 'Hide the full math' : 'See the full math'}
        </button>
      </div>
    </section>
  )
}
