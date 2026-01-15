'use client'

interface StrRevenueBreakdownProps {
  grossRevenue: number
  nightlyRevenue: number
  cleaningFees: number
  revpar: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function StrRevenueBreakdown({
  grossRevenue,
  nightlyRevenue,
  cleaningFees,
  revpar,
}: StrRevenueBreakdownProps) {
  return (
    <div className="str-revenue-breakdown">
      <div className="revenue-gauge">
        <div className="revenue-value">{formatCurrency(grossRevenue)}</div>
        <div className="revenue-label">Annual Gross Revenue</div>
      </div>
      <div className="revenue-breakdown">
        <div className="revenue-item">
          <span className="revenue-item-label">Nightly Revenue</span>
          <span className="revenue-item-value">{formatCurrency(nightlyRevenue)}</span>
        </div>
        <div className="revenue-item">
          <span className="revenue-item-label">Cleaning Fees</span>
          <span className="revenue-item-value">{formatCurrency(cleaningFees)}</span>
        </div>
        <div className="revenue-item">
          <span className="revenue-item-label">RevPAR</span>
          <span className="revenue-item-value positive">{formatCurrency(revpar)}</span>
        </div>
      </div>
    </div>
  )
}
