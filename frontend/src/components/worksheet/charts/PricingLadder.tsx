'use client'

interface PricingLadderItem {
  label: string
  value: number
  hint?: string
  type: 'arv' | 'refi' | 'current' | 'target' | 'mao' | 'list' | 'coc' | 'profit-target'
  highlight?: boolean
}

interface PricingLadderProps {
  items: PricingLadderItem[]
  recoveryPercent?: number
  indicatorLabel?: string
  indicatorClass?: string
  indicatorValue?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function PricingLadder({
  items,
  recoveryPercent,
  indicatorLabel = 'cash recovered',
  indicatorClass = 'brrrr',
  indicatorValue,
}: PricingLadderProps) {
  return (
    <div className="pricing-ladder-container">
      <div className="pricing-ladder">
        <div className="pricing-ladder-track"></div>
        
        {items.map((item, index) => (
          <div 
            key={index} 
            className={`pricing-ladder-item ${item.highlight ? 'highlight' : ''}`}
          >
            <div className="pricing-ladder-label">{item.label}</div>
            <div className={`pricing-ladder-marker ${item.type}`}>
              {item.type === 'current' && (
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="4" fill="var(--strategy-accent, #7c3aed)"/>
                </svg>
              )}
            </div>
            <div className={`pricing-ladder-value ${item.type}`}>
              {formatCurrency(item.value)}
              {item.hint && (
                <span className="pricing-ladder-hint">{item.hint}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {recoveryPercent !== undefined && (
        <div className="pricing-discount-indicator">
          <div className="pricing-discount-bar">
            <div
              className={`pricing-discount-fill ${indicatorClass}`}
              style={{ width: `${Math.min(100, recoveryPercent)}%` }}
            ></div>
          </div>
          <div className="pricing-discount-label">
            <span>{indicatorValue ?? `${recoveryPercent.toFixed(1)}%`}</span> {indicatorLabel}
          </div>
        </div>
      )}
    </div>
  )
}
