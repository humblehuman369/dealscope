'use client'

import React, { useMemo } from 'react'
import { Target } from 'lucide-react'
import { PriceRung, PriceRungType } from './types'
import { getPriceLabel } from '@/lib/priceUtils'

/**
 * PriceLadder Component
 * 
 * A visual "ladder" showing the price spectrum from List Price (high/red) 
 * down to IQ Target (low/green) with a gradient arrow visualization.
 * Designed to fit in narrow card containers.
 */

interface PriceLadderProps {
  title?: string
  rungs: PriceRung[]
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value)

export function PriceLadder({ title = 'PRICING SCALE', rungs }: PriceLadderProps) {
  const listRung = rungs.find(r => r.type === 'list')
  const breakevenRung = rungs.find(r => r.type === 'breakeven')
  const targetRung = rungs.find(r => r.type === 'target')

  return (
    <div className="border-2 border-teal dark:border-accent-500 rounded-2xl p-3 mb-4 bg-white dark:bg-slate-900/50">
      {/* Header */}
      <h4 className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-wide mb-3">
        {title}
      </h4>

      {/* Compact Layout */}
      <div className="flex gap-2">
        {/* Left: Labels Column */}
        <div className="flex flex-col justify-between text-[9px] text-slate-400 dark:text-white/40 font-semibold w-12 shrink-0 py-1">
          <span className="leading-tight">SELLER<br/>PRICING</span>
          <span className="leading-tight">INVESTOR<br/>OPPORTUNITY</span>
        </div>

        {/* Center: Gradient + Markers */}
        <div className="flex flex-col items-center shrink-0">
          <div 
            className="w-8 rounded-t-full relative"
            style={{ 
              height: 200,
              background: `linear-gradient(to bottom,
                #e53935 0%, #ff5722 15%, #ff9800 30%,
                #ffc107 40%, #8bc34a 55%, #4caf50 65%,
                #26a69a 75%, #00acc1 85%, #1e88e5 100%)`
            }}
          >
            {/* List marker - top right */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-red-500 top-[5%] right-[-5px]" />
            {/* Breakeven marker - middle right */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-orange-500 top-[30%] right-[-5px]" />
            {/* Target marker - lower left */}
            <div className="absolute w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] top-[55%] left-[-5px]" />
          </div>
          {/* Arrow */}
          <div style={{
            width: 0, height: 0,
            borderLeft: '16px solid transparent',
            borderRight: '16px solid transparent',
            borderTop: '28px solid #1565c0',
          }} />
        </div>

        {/* Right: Price Info */}
        <div className="flex flex-col justify-between min-w-0 flex-1 py-1">
          {/* Target - Top */}
          {targetRung && (
            <div>
              <div className="flex items-center gap-0.5 text-green-500 font-bold text-xs">
                <Target className="w-3 h-3 shrink-0" />
                <span>Target</span>
              </div>
              <div className="text-[9px] text-green-500/80 truncate">{targetRung.description}</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(targetRung.price)}</div>
            </div>
          )}

          {/* Breakeven - Middle */}
          {breakevenRung && (
            <div>
              <div className="text-xs font-bold text-orange-500">Breakeven</div>
              <div className="text-[9px] text-slate-500 dark:text-white/50">$0 Cash Flow</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(breakevenRung.price)}</div>
              <div className="text-[9px] text-slate-500 dark:text-white/50">{Math.round(breakevenRung.percentOfList)}%</div>
            </div>
          )}

          {/* List Price - Bottom */}
          {listRung && (
            <div>
              <div className="text-xs font-bold text-red-500">List Price</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(listRung.price)}</div>
              <div className="text-[9px] text-slate-500 dark:text-white/50">{Math.round(listRung.percentOfList)}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Helper function to generate standard price ladder rungs
 */
export function generatePriceLadder(
  listPrice: number,
  targetPrice: number,
  targetName: string,
  targetDescription: string,
  breakevenPrice: number,
  breakevenName: string = 'Breakeven',
  breakevenDescription: string = '$0 monthly cash flow',
  openingOfferPercent: number = 0.70
): PriceRung[] {
  const ninetyPercent = listPrice * 0.90
  const openingOffer = listPrice * openingOfferPercent

  const rungs: PriceRung[] = [
    { type: 'list', name: 'List Price', description: 'Current asking price', price: listPrice, percentOfList: 100 },
    { type: 'ninety', name: '90% of List', description: 'Common investor threshold', price: ninetyPercent, percentOfList: 90 },
    { type: 'breakeven', name: breakevenName, description: breakevenDescription, price: breakevenPrice, percentOfList: (breakevenPrice / listPrice) * 100 },
    { type: 'target', name: `🎯 ${targetName}`, description: targetDescription, price: targetPrice, percentOfList: (targetPrice / listPrice) * 100, isHighlighted: true },
    { type: 'offer', name: 'Offer', description: 'Initial offer starting point', price: openingOffer, percentOfList: openingOfferPercent * 100 }
  ]
  
  return rungs.sort((a, b) => b.price - a.price)
}

/**
 * PriceLadderCompact - Horizontal version
 */
interface PriceLadderCompactProps {
  listPrice: number
  targetPrice: number
  openingOffer: number
}

export function PriceLadderCompact({ listPrice, targetPrice, openingOffer }: PriceLadderCompactProps) {
  const formatCompact = (value: number) => 
    Math.abs(value) >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` :
    Math.abs(value) >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`

  const targetPercent = Math.round((targetPrice / listPrice) * 100)

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-gray-600 dark:text-white/60">{formatCompact(listPrice)}</span>
      </div>
      <span className="text-gray-400 dark:text-white/30">→</span>
      <div className="flex items-center gap-1">
        <Target className="w-3 h-3 text-green-500" />
        <span className="text-green-500 font-semibold">{formatCompact(targetPrice)}</span>
        <span className="text-gray-500 dark:text-white/40">({targetPercent}%)</span>
      </div>
      <span className="text-gray-400 dark:text-white/30">→</span>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-teal" />
        <span className="text-gray-600 dark:text-white/60">{formatCompact(openingOffer)}</span>
      </div>
    </div>
  )
}

export default PriceLadder
