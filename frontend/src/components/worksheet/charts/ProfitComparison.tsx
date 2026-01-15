'use client'

interface ProfitComparisonProps {
  yourProfit: number
  investorProfit: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function ProfitComparison({ yourProfit, investorProfit }: ProfitComparisonProps) {
  const total = yourProfit + investorProfit
  const share = total > 0 ? (yourProfit / total) * 100 : 0

  return (
    <div className="profit-comparison">
      <div className="quick-compare">
        <div className="compare-card">
          <div className="compare-label">Your Profit</div>
          <div className="compare-value you">{formatCurrency(yourProfit)}</div>
        </div>
        <div className="compare-card">
          <div className="compare-label">Investor Profit</div>
          <div className="compare-value investor">{formatCurrency(investorProfit)}</div>
        </div>
      </div>
      <div className="compare-footnote">
        You make <strong>{share.toFixed(0)}%</strong> of deal profits with <strong>$0 investment</strong>
      </div>
    </div>
  )
}
