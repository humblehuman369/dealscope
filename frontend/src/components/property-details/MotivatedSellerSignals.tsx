'use client'

interface MotivatedSellerSignalsProps {
  keywords?: string[]
  priceReductionCount?: number
  totalPriceReductionPct?: number
  /** `section` = titled block; `inline` = chips only (e.g. property header stats row) */
  variant?: 'section' | 'inline'
}

function buildMotivatedSellerChips(
  keywords?: string[],
  priceReductionCount?: number,
  totalPriceReductionPct?: number,
): string[] {
  const chips: string[] = []

  if (priceReductionCount && priceReductionCount > 0) {
    const pct =
      totalPriceReductionPct && totalPriceReductionPct > 0
        ? ` (${Math.round(totalPriceReductionPct * 100)}% total)`
        : ''
    chips.push(`${priceReductionCount} price cut${priceReductionCount > 1 ? 's' : ''}${pct}`)
  }

  if (keywords && keywords.length > 0) chips.push(...keywords)

  return chips
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
  variant = 'section',
}: MotivatedSellerSignalsProps) {
  const chips = buildMotivatedSellerChips(keywords, priceReductionCount, totalPriceReductionPct)

  if (chips.length === 0) return null

  const chipRow = (
    <div className={`flex flex-wrap gap-1.5 ${variant === 'inline' ? 'items-center' : ''}`}>
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
  )

  if (variant === 'inline') {
    return chipRow
  }

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Motivated Seller Signals
      </div>
      {chipRow}
    </div>
  )
}
