'use client'

interface MotivatedSellerSignalsProps {
  keywords?: string[]
  priceReductionCount?: number
  totalPriceReductionPct?: number
}

/**
 * MotivatedSellerSignals — compact chip row surfacing investor-relevant
 * language and price-cut signals scanned from the listing description.
 * Renders nothing when there are no signals (never fabricated).
 */
export function MotivatedSellerSignals({
  keywords,
  priceReductionCount,
  totalPriceReductionPct,
}: MotivatedSellerSignalsProps) {
  const chips: string[] = []

  if (priceReductionCount && priceReductionCount > 0) {
    const pct =
      totalPriceReductionPct && totalPriceReductionPct > 0
        ? ` (${Math.round(totalPriceReductionPct * 100)}% total)`
        : ''
    chips.push(
      `${priceReductionCount} price cut${priceReductionCount > 1 ? 's' : ''}${pct}`,
    )
  }

  if (keywords && keywords.length > 0) chips.push(...keywords)

  if (chips.length === 0) return null

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Motivated Seller Signals
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: 'var(--surface-elevated)',
              color: 'var(--status-negative)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}
