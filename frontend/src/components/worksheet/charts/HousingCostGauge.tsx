'use client'

interface HousingCostGaugeProps {
  housingCost: number
  rentingEquivalent: number
  savings: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function HousingCostGauge({ housingCost, rentingEquivalent, savings }: HousingCostGaugeProps) {
  const max = Math.max(housingCost, rentingEquivalent, 1)
  const housingPct = Math.min(100, (housingCost / max) * 100)

  return (
    <div className="housing-cost-gauge">
      <div className="housing-cost-value">{formatCurrency(housingCost)}</div>
      <div className="housing-cost-label">Per month to live here</div>
      <div className="housing-cost-compare">
        <div className="comparison-bar">
          <div className="comparison-bar-label">
            <span>House Hack</span>
            <span className="comparison-bar-value accent">{formatCurrency(housingCost)}</span>
          </div>
          <div className="comparison-bar-track">
            <div className="comparison-bar-fill accent" style={{ width: `${housingPct}%` }}></div>
          </div>
        </div>
        <div className="comparison-bar">
          <div className="comparison-bar-label">
            <span>Renting Equivalent</span>
            <span className="comparison-bar-value">{formatCurrency(rentingEquivalent)}</span>
          </div>
          <div className="comparison-bar-track">
            <div className="comparison-bar-fill neutral" style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="comparison-savings">
          <div className="comparison-savings-label">You Save</div>
          <div className="comparison-savings-value">{formatCurrency(savings)}/mo</div>
        </div>
      </div>
    </div>
  )
}
