'use client'

/**
 * Deal Gap price cards + sticky scale bar — synced with the Verdict page.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { SweetSpotZone } from '@/components/iq-verdict/SweetSpotZone'
import { MarketPriceInfoTip, IncomeValueInfoTip } from './InfoTips'
import { formatCurrency } from '../lib/shared'

export interface DealGapBarProps {
  listPrice: number
  targetPrice: number
  incomeValue: number
  listingStatus: string | null | undefined
  isRecalculating: boolean
  valuationSnap: unknown
  onWatchVideo: () => void
}

export function DealGapBar({
  listPrice,
  targetPrice,
  incomeValue,
  listingStatus,
  isRecalculating,
  valuationSnap,
  onWatchVideo,
}: DealGapBarProps) {
  if (!(listPrice > 0 && targetPrice > 0)) return null

  const incomeVal = incomeValue
  const isListedProp =
    !!listingStatus && ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(listingStatus)
  return (
    <>
      <section className="px-[1px] sm:px-5 pt-6 pb-2">
        {/* Three price metric cards */}
        <div className="flex flex-row gap-1.5 sm:gap-2.5 items-stretch mb-4">
          {[
            {
              label: 'Target Buy',
              value: targetPrice,
              sub: 'Positive Cashflow',
              color: 'var(--accent-sky)',
              dominant: true,
              showInfo: false,
            },
            {
              label: 'Income Value',
              value: incomeVal,
              sub: '$0 Cashflow Breakeven',
              color: 'var(--status-warning)',
              dominant: false,
              showInfo: false,
              incomeInfo: true,
            },
            {
              label: 'Market Price',
              value: listPrice,
              sub: 'Market Value or List Price',
              color: 'var(--status-negative)',
              dominant: false,
              showInfo: !isListedProp,
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`relative rounded-xl py-3 px-1.5 sm:px-2 text-center min-w-0 ${card.dominant ? 'flex-[1.2]' : 'flex-1'}`}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${card.color}`,
                boxShadow: card.dominant
                  ? 'var(--shadow-card-hover)'
                  : 'var(--shadow-card)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {card.showInfo && <MarketPriceInfoTip />}
              {'incomeInfo' in card && card.incomeInfo && <IncomeValueInfoTip />}
              <p
                className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wide mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                {card.label}
              </p>
              <p
                className="tabular-nums mb-0.5 font-bold text-[15px] sm:text-[20px]"
                style={{ color: card.color }}
              >
                {formatCurrency(card.value)}
              </p>
              <p
                className="text-[9px] sm:text-[12px] font-medium leading-snug"
                style={{ color: 'var(--text-secondary)' }}
              >
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start gap-1 mb-1">
          <button
            type="button"
            onClick={onWatchVideo}
            className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors"
            style={{
              color: 'var(--accent-sky)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            Watch: What is the Deal Gap?
          </button>
          <p
            className="text-[10px] sm:text-[11px] leading-snug max-w-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Income Value = max price where rent fully covers your loan payment and
            operating costs. Target Buy is ~5% below that.
          </p>
        </div>
      </section>

      {/*
    Sticky Deal Gap bar — pins directly under the property address bar
    so the user can keep watching the gaps move while editing the worksheet.
    Containing block is the page-level wrapper, so the bar stays pinned
    through the entire scroll of cards / next-steps / worksheet content.
    Income Value updates immediately from worksheet sliders; Target Buy and
    Market Price follow overrides / verdict recalc. Prior values stay visible
    while recalculating (stale-while-revalidate).
  */}
      <div
        id="strategy-deal-gap-bar"
        className="sticky z-30 px-[1px] sm:px-5"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + var(--app-address-bar-height, 0px))',
          paddingTop: 10,
          paddingBottom: 12,
          boxShadow: 'var(--shadow-sticky)',
        }}
      >
        <div
          className="deal-gap-chart-panel relative mx-0 sm:mx-0"
          style={{
            opacity: isRecalculating ? 0.55 : 1,
          }}
          aria-busy={isRecalculating}
        >
          {(() => {
            const snapPg =
              (valuationSnap as { price_gap_to_income_pct?: number } | undefined)
                ?.price_gap_to_income_pct ??
              (valuationSnap as { priceGapToIncomePct?: number } | undefined)
                ?.priceGapToIncomePct
            const markers = [
              { label: 'TARGET', price: targetPrice, dotColor: 'var(--accent-sky)' },
              { label: 'INCOME', price: incomeVal, dotColor: 'var(--status-warning)' },
              { label: 'MARKET', price: listPrice, dotColor: 'var(--status-negative)' },
            ]
              .filter((m) => m.price > 0)
              .sort((a, b) => a.price - b.price)

            const allPrices = markers.map((m) => m.price)
            const scaleMin = Math.min(...allPrices) * 0.95
            const scaleMax = Math.max(...allPrices) * 1.05
            const range = scaleMax - scaleMin
            const pos = (v: number) =>
              Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

            const targetBuyPos = targetPrice > 0 ? pos(targetPrice) : null
            const marketPos = listPrice > 0 ? pos(listPrice) : null
            const incomePos = incomeVal > 0 ? pos(incomeVal) : null

            const priceGapPct =
              typeof snapPg === 'number' && Number.isFinite(snapPg)
                ? snapPg * 100
                : listPrice > 0 && incomeVal > 0
                  ? ((incomeVal - listPrice) / listPrice) * 100
                  : 0
            const isPositiveIncomeCase = incomeVal > listPrice && priceGapPct > 0.1

            const dealBracketLeft =
              targetBuyPos != null && marketPos != null
                ? Math.min(targetBuyPos, marketPos)
                : 0
            const dealBracketPct =
              listPrice > 0 && targetPrice > 0
                ? ((listPrice - targetPrice) / listPrice) * 100
                : 0
            const effectiveDisplayPct = -dealBracketPct
            const isDealGain = dealBracketPct < 0.5 && isPositiveIncomeCase
            const dealBracketRight =
              isDealGain && incomePos != null
                ? incomePos
                : targetBuyPos != null && marketPos != null
                  ? Math.max(targetBuyPos, marketPos)
                  : 0
            const showDealBracket = isDealGain
              ? dealBracketRight - dealBracketLeft >= 3
              : dealBracketRight - dealBracketLeft >= 3 && Math.abs(dealBracketPct) > 0.1
            const dealDisplayPct = isDealGain
              ? ((incomeVal - targetPrice) / listPrice) * 100
              : effectiveDisplayPct

            const priceGapLeft =
              incomePos != null && marketPos != null ? Math.min(incomePos, marketPos) : 0
            const priceGapRight =
              incomePos != null && marketPos != null ? Math.max(incomePos, marketPos) : 0
            const priceGap =
              listPrice > 0 && incomeVal > 0
                ? ((incomeVal - listPrice) / listPrice) * 100
                : 0
            const showPriceGap =
              incomePos != null &&
              marketPos != null &&
              priceGap < -0.1 &&
              priceGapRight - priceGapLeft >= 3

            const isBuyZone = dealDisplayPct >= 0
            const bracketLabel = isBuyZone ? 'DEAL WORKS' : 'DEAL GAP'
            const bracketColor = isBuyZone
              ? 'var(--status-positive)'
              : 'var(--accent-sky)'
            const sweetSpotLeft =
              marketPos != null && incomePos != null ? Math.min(marketPos, incomePos) : 0
            const sweetSpotWidth =
              marketPos != null && incomePos != null ? Math.abs(incomePos - marketPos) : 0
            const tbMarketOverlap =
              targetBuyPos != null &&
              marketPos != null &&
              Math.abs(targetBuyPos - marketPos) < 3

            return (
              <>
                {showDealBracket && (
                  <div
                    className="relative mb-1"
                    style={{
                      marginLeft: `${dealBracketLeft}%`,
                      width: `${dealBracketRight - dealBracketLeft}%`,
                    }}
                  >
                    <p
                      className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mb-0.5"
                      style={{ color: bracketColor }}
                    >
                      {bracketLabel} &nbsp;{dealDisplayPct >= 0 ? '+' : ''}
                      {dealDisplayPct.toFixed(1)}%
                    </p>
                    <div className="flex items-start">
                      <div
                        style={{
                          width: 1,
                          height: 14,
                          background: bracketColor,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ height: 1, background: bracketColor, flex: 1 }} />
                      <div
                        style={{
                          width: 1,
                          height: 14,
                          background: bracketColor,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Bar with proportionally-positioned dots and optional Sweet Spot zone */}
                <div
                  className="relative rounded-full"
                  style={{
                    height: 26,
                    background: 'var(--deal-gap-track-bg)',
                    border: '2px solid var(--deal-gap-track-border)',
                    boxShadow: 'var(--deal-gap-track-shadow)',
                  }}
                >
                  {isPositiveIncomeCase && sweetSpotWidth > 0 && (
                    <SweetSpotZone
                      leftPercent={sweetSpotLeft}
                      widthPercent={sweetSpotWidth}
                    />
                  )}
                  {markers.map((m, i) => {
                    const isRing = tbMarketOverlap && m.label === 'TARGET'
                    return (
                      <div
                        key={i}
                        className="absolute rounded-full deal-gap-marker"
                        style={{
                          width: isRing ? 24 : 18,
                          height: isRing ? 24 : 18,
                          top: '50%',
                          left: `${pos(m.price)}%`,
                          transform: 'translate(-50%, -50%)',
                          background: isRing ? 'transparent' : m.dotColor,
                          border: isRing
                            ? `2px solid ${m.dotColor}`
                            : '2px solid var(--surface-card)',
                          color: m.dotColor,
                          boxShadow: 'var(--deal-gap-marker-shadow)',
                          zIndex: isRing ? 0 : 1,
                        }}
                      />
                    )
                  })}
                </div>

                {/* Price labels below dots (grouped when overlapping) */}
                <div className="relative" style={{ height: 18, marginTop: 4 }}>
                  {(() => {
                    const groups: {
                      labels: string[]
                      price: number
                      colors: string[]
                      left: number
                    }[] = []
                    markers.forEach((m) => {
                      const p = pos(m.price)
                      const existing = groups.find((g) => Math.abs(g.left - p) < 3)
                      if (existing) {
                        existing.labels.push(m.label)
                        existing.colors.push(m.dotColor)
                      } else {
                        groups.push({
                          labels: [m.label],
                          price: m.price,
                          colors: [m.dotColor],
                          left: p,
                        })
                      }
                    })
                    return groups.map((g, i) => (
                      <div
                        key={i}
                        className="absolute text-center"
                        style={{
                          left: `${g.left}%`,
                          transform: 'translateX(-50%)',
                          top: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {g.labels.map((l, j) => (
                            <span key={j}>
                              {j > 0 && (
                                <span style={{ color: 'var(--text-muted)' }}> / </span>
                              )}
                              <span style={{ color: g.colors[j] }}>{l}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {showPriceGap && (
                  <div
                    className="relative mt-0"
                    style={{
                      marginLeft: `${priceGapLeft}%`,
                      width: `${priceGapRight - priceGapLeft}%`,
                    }}
                  >
                    <div className="flex items-end">
                      <div
                        style={{
                          width: 1,
                          height: 14,
                          background: 'var(--status-warning)',
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          height: 1,
                          background: 'var(--status-warning)',
                          flex: 1,
                        }}
                      />
                      <div
                        style={{
                          width: 1,
                          height: 14,
                          background: 'var(--status-warning)',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <p
                      className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mt-0.5"
                      style={{ color: 'var(--status-warning)', marginBottom: 8 }}
                    >
                      PRICE GAP &nbsp;{priceGap >= 0 ? '+' : ''}
                      {priceGap.toFixed(1)}%
                    </p>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </>
  )
}
