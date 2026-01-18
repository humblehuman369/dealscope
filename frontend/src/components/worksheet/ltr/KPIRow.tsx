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
    return `$${value.toLocaleString()}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div>
      <div className="flex gap-2">
        <KPIBox label="Purchase Price" value={formatCurrency(purchasePrice)} />
        <KPIBox label="Cash Needed" value={formatCurrency(cashNeeded)} />
        <KPIBox label="Cash Flow" value={formatCurrency(cashFlow)} />
        <KPIBox label="Cap Rate" value={formatPercent(capRate)} />
        <KPIBox label="CoC Return" value={formatPercent(cocReturn)} />
        <DealScoreBox score={dealScore} />
      </div>
      <ScaleBar score={dealScore} isDark={isDark} />
    </div>
  )
}
