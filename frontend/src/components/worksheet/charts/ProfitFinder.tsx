'use client'

import { useMemo } from 'react'

interface ProfitFinderProps {
  purchasePrice: number
  listPrice: number
  incomeValue: number
  monthlyCashFlow: number
  // Optional labels for different strategies
  buyLabel?: string
  listLabel?: string
  evenLabel?: string
  cashFlowLabel?: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function ProfitFinder({
  purchasePrice,
  listPrice,
  incomeValue,
  monthlyCashFlow,
  buyLabel = 'Buy',
  listLabel = 'List',
  evenLabel = 'Even',
  cashFlowLabel = 'Monthly Cash Flow:',
}: ProfitFinderProps) {
  
  // Calculate marker positions (percentage from top)
  const positions = useMemo(() => {
    const incomeValueCenter = 50 // Income value is always at center
    
    function priceToPosition(price: number): number {
      if (!incomeValue || incomeValue <= 0) return 50
      const diffFromIncomeValue = price - incomeValue
      const rangePercent = incomeValue * 0.5 // 50% of income value = full range
      const offset = (diffFromIncomeValue / rangePercent) * 42
      const position = incomeValueCenter - offset
      return Math.max(8, Math.min(92, position))
    }
    
    return {
      purchase: priceToPosition(purchasePrice),
      list: priceToPosition(listPrice),
      incomeValue: incomeValueCenter,
    }
  }, [purchasePrice, listPrice, incomeValue])
  
  const isNegative = monthlyCashFlow < 0
  const statusText = isNegative ? 'Loss Zone' : 'Profit Zone'
  
  return (
    <div className="profit-finder">
      <div className="profit-finder-visual">
        {/* Left side: Buy price (dynamic) */}
        <div className="pf-marker-column left">
          <div 
            className="pf-marker buy"
            style={{ top: `${positions.purchase}%` }}
          >
            <div className="pf-marker-stack">
              <span className="pf-marker-name">{buyLabel}</span>
              <span className="pf-marker-val">{formatCurrency(purchasePrice)}</span>
            </div>
            <span className="pf-marker-arrow">▶</span>
          </div>
        </div>
        
        {/* Center: The gradient bar */}
        <div className="pf-scale-bar">
          <img src="/images/price-ladder-arrow.svg" alt="Profit Scale" />
        </div>
        
        {/* Right side: Even & List */}
        <div className="pf-marker-column right">
          <div 
            className="pf-marker even"
            style={{ top: `${positions.incomeValue}%` }}
          >
            <span className="pf-marker-arrow">◀</span>
            <div className="pf-marker-stack">
              <span className="pf-marker-name">{evenLabel}</span>
              <span className="pf-marker-val">{formatCurrency(incomeValue)}</span>
            </div>
          </div>
          <div 
            className="pf-marker list"
            style={{ top: `${positions.list}%` }}
          >
            <span className="pf-marker-arrow">◀</span>
            <div className="pf-marker-stack">
              <span className="pf-marker-name">{listLabel}</span>
              <span className="pf-marker-val">{formatCurrency(listPrice)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cash Flow indicator */}
      <div className={`pf-cashflow-indicator ${isNegative ? 'negative' : ''}`}>
        <span className="pf-cf-label">{cashFlowLabel}</span>
        <span className="pf-cf-amount">{formatCurrency(monthlyCashFlow)}</span>
        <span className="pf-cf-status">{statusText}</span>
      </div>
    </div>
  )
}
