'use client'

import React from 'react'
import { KPIBox } from './KPIBox'
import { DealScoreBox } from './DealScoreBox'
import { ScaleBar } from './ScaleBar'

export interface KPIRowProps {
  purchasePrice: number
  cashNeeded: number
  cashFlow: number
  capRate: number
  cocReturn: number
  dealScore: number
  isDark?: boolean
}

export function KPIRow({ 
  purchasePrice, 
  cashNeeded, 
  cashFlow, 
  capRate, 
  cocReturn, 
  dealScore, 
  isDark = false 
}: KPIRowProps) {
  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  const isProfit = cashFlow >= 0

  return (
    <div>
      {/* KPI Strip - 6 metrics in colored pills matching InvestIQ style */}
      <div className="grid grid-cols-6 gap-3">
        <KPIBox 
          label="List Price" 
          value={formatCurrency(purchasePrice)} 
          variant="teal" 
        />
        <KPIBox 
          label="Cash Needed" 
          value={formatCurrency(cashNeeded)} 
          variant="navy" 
        />
        <KPIBox 
          label="Annual Profit" 
          value={`${isProfit ? '+' : ''}${formatCurrency(cashFlow)}`} 
          variant={isProfit ? 'teal' : 'danger'} 
        />
        <KPIBox 
          label="Cap Rate" 
          value={formatPercent(capRate)} 
          variant="neutral" 
        />
        <KPIBox 
          label="CoC Return" 
          value={formatPercent(cocReturn)} 
          variant="neutral" 
        />
        <DealScoreBox score={dealScore} />
      </div>
      <ScaleBar score={dealScore} isDark={isDark} />
    </div>
  )
}
