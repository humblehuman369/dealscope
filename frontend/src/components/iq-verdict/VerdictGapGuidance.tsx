'use client'

import type { ReactNode } from 'react'
import type { DealGapTier } from '@/components/iq-verdict/types'
import type { StrategyWorksheetSection } from '@/components/iq-verdict/strategyWorksheetSection'

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
}: VerdictGapGuidanceProps) {
  if (effectiveDisplayPct > 0 || dealGapPct <= 0) {
    return null
  }

  const anchorWord = isListed ? 'asking price' : 'estimated market value'
  const showFullLevers = dealGapPct > 5

  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: 'var(--text-heading)' }}>
        {tier.headline}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {tier.subHeadline}
      </p>
      <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-body)' }}>
        Your <strong style={{ color: 'var(--text-heading)' }}>Target Buy</strong> is what the model needs for cash flow
        at <strong style={{ color: 'var(--text-heading)' }}>20% down, ~6% interest, 30-year</strong> financing. The gap
        to <strong style={{ color: 'var(--text-heading)' }}>{anchorWord}</strong> does not mean the deal is dead—it
        means the <strong style={{ color: 'var(--text-heading)' }}>price, income, or structure</strong> has to change for
        the math to work.
      </p>

      {showFullLevers && (
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
}: VerdictPositiveGuidanceProps) {
  const isPositive = effectiveDisplayPct > 0

  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-body)' }}>
        {isPositive
          ? 'This deal cash flows at current terms. Here\u2019s what to do next.'
          : 'At modeled terms, target buy aligns with the market anchor. Verify your assumptions before committing.'}
      </p>

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
