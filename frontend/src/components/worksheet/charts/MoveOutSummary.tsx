'use client'

interface MoveOutSummaryProps {
  monthlyCashFlow: number
  capRate: number
  cocReturn: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function MoveOutSummary({ monthlyCashFlow, capRate, cocReturn }: MoveOutSummaryProps) {
  return (
    <div className="moveout-summary">
      <div className="moveout-header">Property becomes full rental</div>
      <div className="moveout-cashflow">{formatCurrency(monthlyCashFlow)}</div>
      <div className="moveout-subtitle">Monthly Cash Flow</div>
      <div className="moveout-metrics">
        <div className="moveout-metric">
          <div className="moveout-metric-label">Cap Rate</div>
          <div className="moveout-metric-value">{capRate.toFixed(1)}%</div>
        </div>
        <div className="moveout-metric">
          <div className="moveout-metric-label">CoC Return</div>
          <div className="moveout-metric-value positive">{cocReturn.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
