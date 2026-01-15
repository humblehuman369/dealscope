'use client'

interface LoanComparisonProps {
  purchaseLoan: number
  purchaseRate: number
  purchaseType: string
  refinanceLoan: number
  refinanceRate: number
  refinanceType: string
}

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${Math.round(value / 1000)}K`
  return `$${value}`
}

export function LoanComparison({
  purchaseLoan,
  purchaseRate,
  purchaseType,
  refinanceLoan,
  refinanceRate,
  refinanceType,
}: LoanComparisonProps) {
  return (
    <div className="loan-comparison-grid">
      <div className="loan-comparison-card">
        <div className="loan-comparison-label">PURCHASE</div>
        <div className="loan-comparison-value">{formatCompact(purchaseLoan)}</div>
        <div className="loan-comparison-subtext">{purchaseRate}% / {purchaseType}</div>
      </div>
      <div className="loan-comparison-card refi">
        <div className="loan-comparison-label refi">REFINANCE</div>
        <div className="loan-comparison-value refi">{formatCompact(refinanceLoan)}</div>
        <div className="loan-comparison-subtext refi">{refinanceRate}% / {refinanceType}</div>
      </div>
    </div>
  )
}
