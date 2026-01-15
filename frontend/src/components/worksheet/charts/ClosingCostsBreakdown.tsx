'use client'

interface ClosingCostsBreakdownProps {
  titleEscrow: number
  transferTax: number
  other: number
}

const formatCompact = (value: number) => {
  if (value >= 1000) return `$${Math.round(value / 100) / 10}K`
  return `$${Math.round(value)}`
}

export function ClosingCostsBreakdown({ titleEscrow, transferTax, other }: ClosingCostsBreakdownProps) {
  const total = titleEscrow + transferTax + other
  const titlePct = total > 0 ? (titleEscrow / total) * 100 : 0
  const transferPct = total > 0 ? (transferTax / total) * 100 : 0
  const otherPct = Math.max(0, 100 - titlePct - transferPct)
  const gradient = `conic-gradient(var(--strategy-accent, #2563eb) 0% ${titlePct}%, #64748b ${titlePct}% ${titlePct + transferPct}%, #94a3b8 ${titlePct + transferPct}% 100%)`

  return (
    <div className="closing-costs">
      <div className="mini-donut" style={{ background: gradient }}>
        <div className="mini-donut-center">
          <span className="mini-donut-value">{formatCompact(total)}</span>
          <span className="mini-donut-label">Total</span>
        </div>
      </div>
      <div className="closing-costs-details">
        <div className="closing-costs-row">
          <span className="closing-costs-swatch accent"></span>
          <span className="closing-costs-label">Title & Escrow</span>
          <span className="closing-costs-value">{formatCompact(titleEscrow)}</span>
        </div>
        <div className="closing-costs-row">
          <span className="closing-costs-swatch transfer"></span>
          <span className="closing-costs-label">Transfer Tax</span>
          <span className="closing-costs-value">{formatCompact(transferTax)}</span>
        </div>
        <div className="closing-costs-row">
          <span className="closing-costs-swatch other"></span>
          <span className="closing-costs-label">Other</span>
          <span className="closing-costs-value">{formatCompact(other)}</span>
        </div>
      </div>
    </div>
  )
}
