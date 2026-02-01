'use client'

/**
 * SummarySnapshot Component
 * 
 * Displays key financial metrics summary in a compact format.
 */

import React from 'react'
import { formatPrice } from './types'

interface SummarySnapshotProps {
  capRate: number
  cashOnCash: number
  dscr: number
  monthlyCashFlow: number
  noi: number
  totalInvestment: number
  targetBuyPrice?: number
  strategy?: string
}

export function SummarySnapshot({
  capRate,
  cashOnCash,
  dscr,
  monthlyCashFlow,
  noi,
  totalInvestment,
  targetBuyPrice,
  strategy = 'Long-term Rental',
}: SummarySnapshotProps) {
  // Format the strategy name for display
  const strategyLabel = strategy.toUpperCase().replace(/-/g, ' ')
  
  return (
    <div className="bg-white px-5 pb-4 border-b border-[#E2E8F0]">
      
      <div className="grid grid-cols-3 gap-2">
        {/* Cap Rate */}
        <div className="bg-white rounded-lg p-3 text-center border border-[#0891B2]">
          <div className="text-base font-bold text-[#0891B2]">{capRate.toFixed(1)}%</div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wide">Cap Rate</div>
        </div>
        
        {/* Cash on Cash */}
        <div className="bg-white rounded-lg p-3 text-center border border-[#0891B2]">
          <div className="text-base font-bold text-[#0891B2]">
            {cashOnCash.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wide">Cash-on-Cash</div>
        </div>
        
        {/* DSCR */}
        <div className="bg-white rounded-lg p-3 text-center border border-[#0891B2]">
          <div className="text-base font-bold text-[#0891B2]">
            {dscr.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wide">DSCR</div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {/* Monthly Cash Flow */}
        <div className="flex flex-col items-center">
          <div className={`text-sm font-semibold ${monthlyCashFlow >= 0 ? 'text-[#10B981]' : 'text-[#E11D48]'}`}>
            {formatPrice(Math.abs(monthlyCashFlow))}/mo
          </div>
          <div className="text-[10px] text-[#94A3B8] uppercase">
            {monthlyCashFlow >= 0 ? 'Cash Flow' : 'Negative'}
          </div>
        </div>
        
        {/* NOI */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold text-[#0A1628]">
            {formatPrice(noi)}
          </div>
          <div className="text-[10px] text-[#94A3B8] uppercase">Annual NOI</div>
        </div>
        
        {/* Total Investment */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold text-[#0A1628]">
            {formatPrice(totalInvestment)}
          </div>
          <div className="text-[10px] text-[#94A3B8] uppercase">Cash Needed</div>
        </div>
      </div>
    </div>
  )
}

export default SummarySnapshot
