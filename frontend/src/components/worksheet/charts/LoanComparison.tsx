'use client'

import { formatCompactCurrency } from '@/utils/formatters'

interface LoanComparisonProps {
  purchaseLoan: number
  purchaseRate: number
  purchaseType: string
  refinanceLoan: number
  refinanceRate: number
  refinanceType: string
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
        <div className="loan-comparison-value">{formatCompactCurrency(purchaseLoan)}</div>
        <div className="loan-comparison-subtext">{purchaseRate}% / {purchaseType}</div>
      </div>
      <div className="loan-comparison-card refi">
        <div className="loan-comparison-label refi">REFINANCE</div>
        <div className="loan-comparison-value refi">{formatCompactCurrency(refinanceLoan)}</div>
        <div className="loan-comparison-subtext refi">{refinanceRate}% / {refinanceType}</div>
      </div>
    </div>
  )
}
