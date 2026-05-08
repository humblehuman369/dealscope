'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { trackEvent } from '@/lib/eventTracking'
import type { DealGapTier } from '@/components/iq-verdict/types'
import type { StrategyWorksheetSection } from '@/components/iq-verdict/strategyWorksheetSection'
import { FourPathsPanel, type DealStructure, type DealStructuresPayload } from '@/components/iq-verdict/FourPathsPanel'
import { DealStructuresNarrative } from '@/components/iq-verdict/DealStructuresNarrative'
import { HeadlineStructureCard } from '@/components/iq-verdict/HeadlineStructureCard'
import {
  BuildYourDealSandbox,
  type SandboxAdjustments,
  type SandboxBaseInputs,
} from '@/components/iq-verdict/BuildYourDealSandbox'
import {
  readSandbox,
  writeSandbox,
} from '@/lib/dealStructures/sandboxPersistence'
import {
  encodeScenario,
  type ScenarioPayloadV1,
} from '@/lib/dealStructures/scenarioPayload'
import { writeLastAppliedScenario } from '@/lib/dealStructures/loadScenario'
import { useRouter } from 'next/navigation'

export interface VerdictGapGuidanceProps {
  tier: DealGapTier
  dealGapPct: number
  effectiveDisplayPct: number
  isListed: boolean
  isAuthenticated: boolean
  hasDataSources: boolean
  onOpenDataSources: () => void
  onNavigateStrategy: (section?: StrategyWorksheetSection) => void
  onDealMaker: () => void
  onSignIn: () => void
  dealStructures?: DealStructuresPayload | null
  onOpenStructureInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
  /** For analytics (Three Paths) */
  propertyState?: string | null
  /**
   * Activation Arc Phase 0 (A2) — surfaced personalization. When provided,
   * a one-line summary renders above the Four Paths panel naming the
   * financing assumptions used for this analysis (down payment %, rate,
   * loan term). Pass `defaults_used.financing` from the IQVerdictResponse.
   */
  personalization?: PersonalizationAssumptions | null
  /** Click handler for the inline "Customize" link — routes to /profile. */
  onCustomizeAssumptions?: () => void
  /**
   * Activation Arc Phase 0 (B1) — base inputs for the Build Your Deal
   * sandbox. When provided, the slider sandbox renders between the
   * HeadlineStructureCard and the Four Paths panel.
   */
  sandboxBaseInputs?: SandboxBaseInputs | null
  /**
   * Property address used to key sandbox persistence (B4) and assemble the
   * Apply-in-Strategy URL handoff (B3). Optional — when absent the sandbox
   * still works in-session, just without persistence.
   */
  propertyAddress?: string | null
}

export interface PersonalizationAssumptions {
  /** 0–1 fraction (e.g. 0.20 = 20%) */
  downPaymentPct: number
  /** 0–1 fraction (e.g. 0.065 = 6.5%) */
  interestRate: number
  /** Years (typically 30) */
  loanTermYears: number
  /**
   * True when the user customized any assumption from the platform default.
   * Drives copy: customized → "your assumptions"; default → "standard
   * assumptions" with a Customize call-to-action.
   */
  isCustomized: boolean
}

/**
 * Activation Arc Phase 0 (B3) — translate sandbox adjustments into the
 * snake_case `levers` shape that `preLoadedRecordToDealMakerPatch` consumes.
 * Mirrors the keys headline_conventional_blend.py writes into pre_loaded_record
 * so the Strategy worksheet treats a sandbox handoff and a Four-Paths card
 * handoff identically.
 */
function sandboxAdjustmentsToLevers(adj: SandboxAdjustments): Record<string, unknown> {
  const levers: Record<string, unknown> = {}
  const extras: Record<string, unknown> = {}
  if (typeof adj.price === 'number') levers.custom_purchase_price = Math.round(adj.price)
  if (typeof adj.monthlyRent === 'number') levers.custom_rent_estimate = Math.round(adj.monthlyRent)
  if (typeof adj.downPaymentPct === 'number') extras.down_payment_pct_override = adj.downPaymentPct
  if (typeof adj.sellerCarryAmount === 'number' && adj.sellerCarryAmount > 0) {
    extras.seller_carry_amount = Math.round(adj.sellerCarryAmount)
    extras.seller_carry_rate = 0.0
    extras.seller_carry_term_years = 5
  }
  extras.three_paths_structure_id = 'build-your-deal'
  extras.threePathsLabel = 'Build Your Deal'
  levers.pending_extras = extras
  return levers
}

function PersonalizationLine({
  assumptions,
  onCustomize,
}: {
  assumptions: PersonalizationAssumptions
  onCustomize?: () => void
}) {
  const { downPaymentPct, interestRate, loanTermYears, isCustomized } = assumptions
  const dpLabel = `${Math.round(downPaymentPct * 100)}% down`
  const rateLabel = `${(interestRate * 100).toFixed(2).replace(/\.?0+$/, '')}% rate`
  const termLabel = `${loanTermYears}-yr`

  return (
    <p
      style={{
        margin: '10px 0 0',
        fontSize: 12,
        lineHeight: 1.5,
        color: 'var(--text-secondary)',
      }}
    >
      {isCustomized ? (
        <>
          Showing paths that fit <strong style={{ color: 'var(--text-heading)' }}>your</strong>{' '}
          {dpLabel}, {rateLabel}, {termLabel} assumptions.
          {onCustomize && (
            <>
              {' '}
              <button
                type="button"
                onClick={onCustomize}
                className="font-semibold underline-offset-2 hover:underline"
                style={{
                  color: 'var(--accent-sky)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                Adjust
              </button>
            </>
          )}
        </>
      ) : (
        <>
          Showing paths based on standard {dpLabel}, {rateLabel}, {termLabel} assumptions.
          {onCustomize && (
            <>
              {' '}
              <button
                type="button"
                onClick={onCustomize}
                className="font-semibold underline-offset-2 hover:underline"
                style={{
                  color: 'var(--accent-sky)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                Customize
              </button>
            </>
          )}
        </>
      )}
    </p>
  )
}

function LeverButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-lg px-2.5 py-2 text-[13px] leading-snug transition-colors"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-body)',
      }}
    >
      <span style={{ color: 'var(--accent-sky)', fontWeight: 700 }}>→ </span>
      {children}
    </button>
  )
}

/**
 * Expanded narrative when the deal does not clear at default terms (Target Buy below Market anchor).
 */
export function VerdictGapGuidance({
  tier,
  dealGapPct,
  effectiveDisplayPct,
  isListed,
  isAuthenticated,
  hasDataSources,
  onOpenDataSources,
  onNavigateStrategy,
  onDealMaker,
  onSignIn,
  dealStructures,
  onOpenStructureInStrategy,
  onShowPitch,
  propertyState,
  personalization,
  onCustomizeAssumptions,
  sandboxBaseInputs,
  propertyAddress,
}: VerdictGapGuidanceProps) {
  const router = useRouter()
  const anchorWord = isListed ? 'asking price' : 'estimated market value'
  const showFullLevers = dealGapPct > 5
  const hasStructures = !!dealStructures && dealStructures.hasPaths && dealStructures.paths.length > 0
  const pathsSig = dealStructures?.paths.map((p) => p.id).join('|') ?? ''

  // Activation Arc Phase 0 — headline structure card sits above the Four Paths
  // panel when present. Null is the honest-fallback signal (engine couldn't
  // find a plausible conventional blend) — the section just doesn't render.
  const headline = dealStructures?.headlineStructure ?? null
  const cashShortfall = dealStructures?.cashShortfall ?? null
  const hasCashShortfall = typeof cashShortfall === 'number' && cashShortfall > 0

  useEffect(() => {
    if (effectiveDisplayPct > 0 || dealGapPct <= 0) return
    if (!hasStructures || !dealStructures || !pathsSig) return
    const families = dealStructures.paths.map((p) => p.family)
    trackEvent('three_paths_rendered', {
      path_count: dealStructures.paths.length,
      families: families.join(','),
      top_family: families[0] ?? '',
      deal_gap_pct: dealGapPct,
      state: propertyState ?? '',
    })
  }, [
    effectiveDisplayPct,
    dealGapPct,
    hasStructures,
    dealStructures,
    pathsSig,
    propertyState,
  ])

  // Phase 0 — `headline_structure_null` telemetry. Fires when the verdict
  // would render Four Paths (negative gap, payload present) but the engine
  // returned no plausible conventional blend. Useful as a calibration signal:
  // the rate over time tells us if the price ceiling needs widening.
  useEffect(() => {
    if (effectiveDisplayPct > 0 || dealGapPct <= 0) return
    if (!dealStructures) return
    if (headline !== null) return
    trackEvent('headline_structure_null', {
      reason: 'no_plausible_conventional_blend',
      deal_gap_pct: dealGapPct,
      state: propertyState ?? '',
    })
  }, [effectiveDisplayPct, dealGapPct, dealStructures, headline, propertyState])

  // Phase 0 (E3) — `downpayment_reducer_promoted` telemetry. Fires when the
  // engine flagged a buyer cash shortfall and a financing-family card was
  // present in `paths` (the engine has already overridden its copy). The
  // event lets us measure the activation rate of the optimizer reframe.
  const promotedFinancingId = useMemo(() => {
    if (!dealStructures || !hasCashShortfall) return null
    const fin = dealStructures.paths.find((p) => p.family === 'financing')
    return fin?.id ?? null
  }, [dealStructures, hasCashShortfall])

  useEffect(() => {
    if (!promotedFinancingId || !cashShortfall || cashShortfall <= 0) return
    if (!dealStructures || dealStructures.headlineStructure == null) return
    const headlineCash = dealStructures.headlineStructure.cashRequired
    const shortfallPct = headlineCash > 0 ? cashShortfall / headlineCash : 0
    trackEvent('downpayment_reducer_promoted', {
      from_family: 'financing',
      shortfall_pct: Math.round(shortfallPct * 1000) / 1000,
      structure_id: promotedFinancingId,
    })
  }, [promotedFinancingId, cashShortfall, dealStructures])

  if (effectiveDisplayPct > 0 || dealGapPct <= 0) {
    return null
  }

  return (
    <div style={{ marginTop: 12, width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: 'var(--text-heading)' }}>
        {tier.headline}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {tier.subHeadline}
      </p>

      {/* Activation Arc Phase 0 — headline structure card sits above the
          Four Paths panel. Honest fallback: when `headline` is null the card
          region collapses entirely and the existing tier behavior renders. */}
      {headline && (
        <HeadlineStructureCard
          structure={headline}
          onOpenInStrategy={
            onOpenStructureInStrategy
              ? (s) => onOpenStructureInStrategy(s, -1)
              : undefined
          }
          onShowPitch={onShowPitch}
          hasCashShortfall={hasCashShortfall}
        />
      )}

      {/* Activation Arc Phase 0 (A2) — surfaced personalization line.
          Renders between the headline card and the Four Paths cards so the
          user always sees which assumptions drove the analysis. */}
      {personalization && (hasStructures || headline) && (
        <PersonalizationLine
          assumptions={personalization}
          onCustomize={onCustomizeAssumptions}
        />
      )}

      {/* Activation Arc Phase 0 (B1) — Build Your Deal sandbox. Renders
          between the headline card and the Four Paths panel. Sliders open
          pre-set to the headline structure (B1 doctrine), restored from
          localStorage when the user has a saved session (B4), and hand off
          to Strategy via the existing scenario URL transport (B3). */}
      {sandboxBaseInputs && (
        <BuildYourDealSandbox
          baseInputs={sandboxBaseInputs}
          headlineStructure={headline}
          initialAdjustments={
            propertyAddress ? readSandbox(propertyAddress) : null
          }
          onAdjustmentsChanged={(next) => {
            if (propertyAddress) writeSandbox(propertyAddress, next)
          }}
          onApplyInStrategy={
            propertyAddress
              ? (next) => {
                  // B3 — Apply-in-Strategy handoff. Encode the user's
                  // adjustments into a ScenarioPayloadV1 with a synthetic
                  // structureId so Strategy treats it as a one-off applied
                  // scenario rather than a saved Four-Paths card.
                  const levers = sandboxAdjustmentsToLevers(next)
                  const payload: ScenarioPayloadV1 = {
                    v: 1,
                    structureId: 'build-your-deal',
                    family: 'sandbox',
                    label: 'Build Your Deal',
                    levers,
                  }
                  writeLastAppliedScenario(payload)
                  trackEvent('sandbox_applied_in_strategy', {
                    adjustments_count: Object.values(next).filter((v) => v != null).length,
                  })
                  const params = new URLSearchParams({
                    address: propertyAddress,
                    scenario: encodeScenario(payload),
                  })
                  router.push(`/strategy?${params.toString()}`)
                }
              : undefined
          }
        />
      )}

      {hasStructures && (
        <>
          <DealStructuresNarrative paragraphs={dealStructures!.narrativeParagraphs} />
          <FourPathsPanel
            payload={dealStructures!}
            propertyState={propertyState}
            onOpenInStrategy={onOpenStructureInStrategy}
            onShowPitch={onShowPitch}
            hasHeadlineAbove={!!headline}
          />
        </>
      )}

      {!hasStructures && (
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-body)' }}>
          Your <strong style={{ color: 'var(--text-heading)' }}>Target Buy</strong> is what the model needs for cash flow
          at <strong style={{ color: 'var(--text-heading)' }}>20% down, ~6% interest, 30-year</strong> financing. The gap
          to <strong style={{ color: 'var(--text-heading)' }}>{anchorWord}</strong> does not mean the deal is dead—it
          means the <strong style={{ color: 'var(--text-heading)' }}>price, income, or structure</strong> has to change for
          the math to work.
        </p>
      )}

      {!hasStructures && showFullLevers && (
        <>
          <p
            style={{
              margin: '14px 0 8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--accent-sky)',
            }}
          >
            Ways to make the math work
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            <li>
              <LeverButton onClick={() => onNavigateStrategy('purchase')}>
                <strong style={{ color: 'var(--text-heading)' }}>Lower the buy price</strong> (negotiation, credits, or a
                lower offer)—model it under Purchase in Strategy.
              </LeverButton>
            </li>
            <li>
              <LeverButton onClick={() => onNavigateStrategy('financing')}>
                <strong style={{ color: 'var(--text-heading)' }}>Improve structure:</strong> lower rate, shorter term,
                larger down payment, paying cash, or seller financing (e.g. 0% carry)—adjust under Loan Payment in
                Strategy.
              </LeverButton>
            </li>
            <li>
              <LeverButton onClick={() => onNavigateStrategy('income')}>
                <strong style={{ color: 'var(--text-heading)' }}>Raise or verify rent</strong> (long-term, STR, or
                house-hack scenarios)—tune income in Strategy.
              </LeverButton>
            </li>
            <li>
              <LeverButton onClick={() => onNavigateStrategy('costs')}>
                <strong style={{ color: 'var(--text-heading)' }}>Tighten operating costs</strong> (taxes, insurance,
                management, vacancy)—under What It Costs in Strategy.
              </LeverButton>
            </li>
            <li>
              <LeverButton onClick={() => onNavigateStrategy('rehab')}>
                <strong style={{ color: 'var(--text-heading)' }}>Account for rehab</strong> if the property needs work—add
                a rehab budget under Purchase in Strategy.
              </LeverButton>
            </li>
            {hasDataSources && (
              <li>
                <LeverButton onClick={onOpenDataSources}>
                  <strong style={{ color: 'var(--text-heading)' }}>Wrong value or rent from the data?</strong> Open Data
                  Sources to pick another estimate (IQ, Zillow, RentCast, etc.).
                </LeverButton>
              </li>
            )}
            <li>
              <LeverButton onClick={onDealMaker}>
                <strong style={{ color: 'var(--text-heading)' }}>Change Terms</strong> here for a quick pass, or use
                Strategy after sign-in for the full interactive worksheet.
              </LeverButton>
            </li>
          </ul>
        </>
      )}

      {!isAuthenticated && (
        <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          <button
            type="button"
            onClick={onSignIn}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Sign in
          </button>{' '}
          to save scenarios and run the full Strategy worksheet with live sliders.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export interface VerdictPositiveGuidanceProps {
  effectiveDisplayPct: number
  isListed: boolean
  isAuthenticated: boolean
  onNavigateAppraiser: () => void
  onNavigateStrategy: (section?: StrategyWorksheetSection) => void
  onSignIn: () => void
  /**
   * Three Paths payload — when supplied by the backend, render the path cards
   * here too so Deal Gain / positive-gap properties don't lose access to the
   * "what would make this even better" structures.
   */
  dealStructures?: DealStructuresPayload | null
  onOpenStructureInStrategy?: (structure: DealStructure, index: number) => void
  onShowPitch?: (structure: DealStructure) => void
  propertyState?: string | null
}

function StaticTip({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full rounded-lg px-2.5 py-2 text-[13px] leading-snug"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-body)',
      }}
    >
      <span style={{ color: 'var(--accent-sky)', fontWeight: 700 }}>→ </span>
      {children}
    </div>
  )
}

/**
 * Actionable next-step guidance when the deal clears at modeled terms (positive or neutral gap).
 */
export function VerdictPositiveGuidance({
  effectiveDisplayPct,
  isListed,
  isAuthenticated,
  onNavigateAppraiser,
  onNavigateStrategy,
  onSignIn,
  dealStructures,
  onOpenStructureInStrategy,
  onShowPitch,
  propertyState,
}: VerdictPositiveGuidanceProps) {
  const isPositive = effectiveDisplayPct > 0
  const hasStructures = !!dealStructures && dealStructures.hasPaths && dealStructures.paths.length > 0

  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-body)' }}>
        {isPositive
          ? 'This deal cash flows at current terms. Here\u2019s what to do next.'
          : 'At modeled terms, target buy aligns with the market anchor. Verify your assumptions before committing.'}
      </p>

      {hasStructures && (
        <FourPathsPanel
          payload={dealStructures!}
          propertyState={propertyState}
          onOpenInStrategy={onOpenStructureInStrategy}
          onShowPitch={onShowPitch}
        />
      )}

      <p
        style={{
          margin: '14px 0 8px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--accent-sky)',
        }}
      >
        Next steps
      </p>

      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        <li>
          <LeverButton onClick={onNavigateAppraiser}>
            <strong style={{ color: 'var(--text-heading)' }}>Verify rental values</strong> — use
            the Appraiser tab to review local rental and sales comps in the neighborhood.
          </LeverButton>
        </li>
        <li>
          <LeverButton onClick={() => onNavigateStrategy('rehab')}>
            <strong style={{ color: 'var(--text-heading)' }}>Budget for rehab</strong> — does the
            property need renovation or repairs? Build a rehab budget under Purchase in Strategy.
          </LeverButton>
        </li>
        <li>
          <LeverButton onClick={() => onNavigateStrategy('purchase')}>
            <strong style={{ color: 'var(--text-heading)' }}>Review cash requirements</strong> —
            check the Strategy page for total cash needed at closing, reserves, and monthly cash
            flow.
          </LeverButton>
        </li>
        <li>
          {isListed ? (
            <StaticTip>
              <strong style={{ color: 'var(--text-heading)' }}>Prepare your offer</strong> — this
              property is actively listed. Move fast — prepare your offer terms, proof of funds, and
              any contingencies before reaching out to the listing agent.
            </StaticTip>
          ) : (
            <StaticTip>
              <strong style={{ color: 'var(--text-heading)' }}>Contact the owner</strong> — this
              property is off-market. Try to make contact with the owner of record to gauge interest
              before running full due diligence.
            </StaticTip>
          )}
        </li>
      </ul>

      {!isAuthenticated && (
        <p style={{ margin: '14px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          <button
            type="button"
            onClick={onSignIn}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Sign in
          </button>{' '}
          to save scenarios and run the full Strategy worksheet with live sliders.
        </p>
      )}
    </div>
  )
}
