'use client'

interface CashRecoveryProps {
  cashOut: number
  cashInvested: number
  recoveryPercent: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function CashRecovery({ cashOut, cashInvested, recoveryPercent }: CashRecoveryProps) {
  const recoveryWidth = Math.min(100, Math.max(0, recoveryPercent))
  const isPositive = cashOut >= 0
  
  return (
    <div className="cash-recovery-chart">
      <div className="cash-out-indicator">
        <div className={`cash-out-value ${isPositive ? 'positive' : 'negative'}`}>
          {formatCurrency(cashOut)}
        </div>
        <div className="cash-out-label">Cash Out at Refinance</div>
        <div className={`cash-out-status ${isPositive ? 'positive' : 'negative'}`}>
          {recoveryPercent.toFixed(1)}% Recovered
        </div>
      </div>
      <div className="cash-recovery-bars">
        <div className="h-bar-item">
          <div className="h-bar-header">
            <span className="h-bar-label">Cash Invested</span>
            <span className="h-bar-value">{formatCurrency(cashInvested)}</span>
          </div>
          <div className="h-bar-track">
            <div className="h-bar-fill brrrr full" style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="h-bar-item">
          <div className="h-bar-header">
            <span className="h-bar-label">Cash Returned</span>
            <span className={`h-bar-value ${isPositive ? 'positive' : 'negative'}`}>
              {formatCurrency(cashOut)}
            </span>
          </div>
          <div className="h-bar-track">
            <div 
              className={`h-bar-fill ${isPositive ? 'positive' : 'negative'}`}
              style={{ width: `${recoveryWidth}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
