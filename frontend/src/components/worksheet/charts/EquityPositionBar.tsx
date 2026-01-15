'use client'

interface EquityPositionBarProps {
  equity: number
  loan: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function EquityPositionBar({ equity, loan }: EquityPositionBarProps) {
  const total = Math.max(equity + loan, 1)
  const equityPct = (equity / total) * 100
  const loanPct = Math.max(0, 100 - equityPct)

  return (
    <div className="stacked-bar-container">
      <div className="stacked-bar">
        <div className="stacked-bar-segment equity" style={{ width: `${equityPct}%` }}>Equity</div>
        <div className="stacked-bar-segment loan" style={{ width: `${loanPct}%` }}>Loan</div>
      </div>
      <div className="equity-summary">
        <div className="equity-item">
          <div className="equity-amount">{formatCurrency(equity)}</div>
          <div className="equity-subtext">{Math.round(equityPct)}% Equity</div>
        </div>
        <div className="equity-item right">
          <div className="equity-amount loan">{formatCurrency(loan)}</div>
          <div className="equity-subtext">{Math.round(loanPct)}% Financed</div>
        </div>
      </div>
    </div>
  )
}
