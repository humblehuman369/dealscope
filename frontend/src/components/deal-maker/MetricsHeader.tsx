/**
 * MetricsHeader - Deal Maker IQ header
 * EXACT implementation from design files
 * 
 * Design specs:
 * - Header bg: #0A1628
 * - Address: 11px, color #94A3B8, letter-spacing 0.02em
 * - Title: 22px, font-weight 800, letter-spacing 0.05em
 *   - DEAL: white, MAKER: #00D4FF, PRO: white
 * - Metrics grid: 2 columns, gap 6px 24px
 * - Metric label: 12px, color #94A3B8
 * - Metric value: 13px, font-weight 600, white
 *   - Deal Gap: #00D4FF, Annual Profit: #06B6D4
 * - NO score badges
 */

'use client'

import React from 'react'
import { formatCurrency, formatPercent } from '@/utils/formatters'

interface MetricsHeaderProps {
  state: {
    buyPrice: number
  }
  metrics: {
    cashNeeded: number
    dealGap: number
    annualProfit: number
    capRate: number
    cocReturn: number
  }
  listPrice?: number
  propertyAddress?: string
}

export function MetricsHeader({ 
  state, 
  metrics,
  propertyAddress,
}: MetricsHeaderProps) {
  return (
    <div className="bg-[#0A1628]" style={{ padding: '16px 20px 20px' }}>
      {/* Title Area - centered */}
      <div className="text-center">
        {/* Address */}
        {propertyAddress && (
          <p 
            className="text-[#94A3B8] truncate"
            style={{ fontSize: '11px', marginBottom: '2px', letterSpacing: '0.02em' }}
          >
            {propertyAddress}
          </p>
        )}
        
        {/* DEAL MAKER IQ Title */}
        <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.05em' }}>
          <span className="text-white">DEAL </span>
          <span style={{ color: '#00D4FF' }}>MAKER </span>
          <span className="text-white">IQ</span>
        </div>
      </div>

      {/* Metrics Grid - 2 columns, 3 rows */}
      <div 
        className="grid grid-cols-2 mt-3"
        style={{ gap: '6px 24px' }}
      >
        {/* Row 1 */}
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Buy Price</span>
          <span className="text-white tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
            {formatCurrency(state.buyPrice)}
          </span>
        </div>
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Cash Needed</span>
          <span className="text-white tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
            {formatCurrency(metrics.cashNeeded)}
          </span>
        </div>
        
        {/* Row 2 */}
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Deal Gap</span>
          <span 
            className="tabular-nums" 
            style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: metrics.dealGap < 0 ? '#E11D48' : '#00D4FF' 
            }}
          >
            {formatPercent(metrics.dealGap * 100, { decimals: 0, showSign: true })}
          </span>
        </div>
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Annual Profit</span>
          <span 
            className="tabular-nums" 
            style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: metrics.annualProfit < 0 ? '#E11D48' : '#06B6D4' 
            }}
          >
            {formatCurrency(metrics.annualProfit)}
          </span>
        </div>
        
        {/* Row 3 */}
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>CAP Rate</span>
          <span className="text-white tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
            {formatPercent(metrics.capRate * 100)}
          </span>
        </div>
        <div className="flex justify-between items-center py-[3px]">
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>COC Return</span>
          <span className="text-white tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
            {formatPercent(metrics.cocReturn * 100)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MetricsHeader
