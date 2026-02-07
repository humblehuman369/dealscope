'use client'

import { formatCompactCurrency } from '@/utils/formatters'

interface LtrCashBreakdownProps {
  downPayment: number
  closingCosts: number
  rehabCosts: number
  ltvPercent: number
}

export function LtrCashBreakdown({
  downPayment,
  closingCosts,
  rehabCosts,
  ltvPercent,
}: LtrCashBreakdownProps) {
  const totalCash = downPayment + closingCosts + rehabCosts
  const dpPct = totalCash > 0 ? (downPayment / totalCash) * 100 : 0
  const ccPct = totalCash > 0 ? (closingCosts / totalCash) * 100 : 0
  const rehabPct = Math.max(0, 100 - dpPct - ccPct)

  const gradient = `conic-gradient(var(--iq-teal) 0% ${dpPct}%, #f97316 ${dpPct}% ${dpPct + ccPct}%, #64748b ${dpPct + ccPct}% 100%)`

  return (
    <div className="cash-breakdown">
      <div className="cash-breakdown-main">
        <div className="mini-donut" style={{ background: gradient }}>
          <div className="mini-donut-center">
            <span className="mini-donut-value">{formatCompactCurrency(totalCash)}</span>
            <span className="mini-donut-label">Total Cash</span>
          </div>
        </div>
        <div className="cash-breakdown-details">
          <div className="cash-breakdown-row">
            <span className="cash-breakdown-swatch down"></span>
            <span className="cash-breakdown-label">Down Payment</span>
            <span className="cash-breakdown-value">{formatCompactCurrency(downPayment)}</span>
          </div>
          <div className="cash-breakdown-row">
            <span className="cash-breakdown-swatch costs"></span>
            <span className="cash-breakdown-label">Closing Costs</span>
            <span className="cash-breakdown-value">{formatCompactCurrency(closingCosts)}</span>
          </div>
          <div className="cash-breakdown-row">
            <span className="cash-breakdown-swatch rehab"></span>
            <span className="cash-breakdown-label">Rehab</span>
            <span className="cash-breakdown-value">{formatCompactCurrency(rehabCosts)}</span>
          </div>
        </div>
      </div>
      <div className="cash-breakdown-ltv">
        <div className="cash-breakdown-ltv-header">
          <span>Loan to Value</span>
          <span className="cash-breakdown-ltv-value">{ltvPercent.toFixed(0)}%</span>
        </div>
        <div className="h-bar-track">
          <div className="h-bar-fill ltr" style={{ width: `${Math.min(100, ltvPercent)}%` }}></div>
        </div>
      </div>
    </div>
  )
}
