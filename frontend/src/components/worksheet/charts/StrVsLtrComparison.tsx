'use client'

interface StrVsLtrComparisonProps {
  strCashFlow: number
  ltrCashFlow: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function StrVsLtrComparison({ strCashFlow, ltrCashFlow }: StrVsLtrComparisonProps) {
  const strValue = Math.max(strCashFlow, 0)
  const ltrValue = Math.max(ltrCashFlow, 0)
  const max = Math.max(strValue, ltrValue, 1)
  const strWidth = (strValue / max) * 100
  const ltrWidth = (ltrValue / max) * 100
  const premiumPct = ltrValue > 0 ? ((strValue - ltrValue) / ltrValue) * 100 : 0

  return (
    <div className="str-vs-ltr">
      <div className="comparison-row">
        <div className="comparison-header">
          <span className="comparison-label">STR Cash Flow</span>
          <span className="comparison-value str">{formatCurrency(strCashFlow)}/mo</span>
        </div>
        <div className="comparison-bar-track">
          <div className="comparison-bar str" style={{ width: `${strWidth}%` }}></div>
        </div>
      </div>
      <div className="comparison-row">
        <div className="comparison-header">
          <span className="comparison-label">Est. LTR Cash Flow</span>
          <span className="comparison-value ltr">{formatCurrency(ltrCashFlow)}/mo</span>
        </div>
        <div className="comparison-bar-track">
          <div className="comparison-bar ltr" style={{ width: `${ltrWidth}%` }}></div>
        </div>
      </div>
      <div className="comparison-premium">
        <div className="comparison-premium-label">STR Premium</div>
        <div className="comparison-premium-value">{premiumPct.toFixed(0)}%</div>
      </div>
    </div>
  )
}
