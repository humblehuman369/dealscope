'use client'

interface LtrCashFlowBreakdownProps {
  annualDebtService: number
  annualExpenses: number
  annualCashFlow: number
}

const formatCompact = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${Math.round(value / 1000)}K`
  return `$${Math.round(value)}`
}

export function LtrCashFlowBreakdown({
  annualDebtService,
  annualExpenses,
  annualCashFlow,
}: LtrCashFlowBreakdownProps) {
  const loan = Math.abs(annualDebtService)
  const expenses = Math.abs(annualExpenses)
  const cashFlow = Math.max(0, annualCashFlow)
  const total = Math.max(loan + expenses + cashFlow, 1)

  const loanPct = (loan / total) * 100
  const expPct = (expenses / total) * 100
  const cfPct = Math.max(0, 100 - loanPct - expPct)

  return (
    <div className="stacked-bar-container">
      <div className="stacked-bar">
        <div className="stacked-bar-segment loan" style={{ width: `${loanPct}%` }}>Loan</div>
        <div className="stacked-bar-segment expenses" style={{ width: `${expPct}%` }}>Exp</div>
        <div className="stacked-bar-segment cashflow" style={{ width: `${cfPct}%` }}>CF</div>
      </div>
      <div className="stacked-legend">
        <div className="stacked-legend-item">
          <span className="stacked-legend-dot loan"></span>
          Loan {formatCompact(loan)}
        </div>
        <div className="stacked-legend-item">
          <span className="stacked-legend-dot expenses"></span>
          Expenses {formatCompact(expenses)}
        </div>
        <div className="stacked-legend-item">
          <span className="stacked-legend-dot cashflow"></span>
          Cash Flow {formatCompact(cashFlow)}
        </div>
      </div>
    </div>
  )
}
