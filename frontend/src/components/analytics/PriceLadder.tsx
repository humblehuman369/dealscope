'use client'

import React from 'react'
import { Target } from 'lucide-react'
import { PriceRung, PriceRungType } from './types'

/**
 * PriceLadder Component
 * 
 * Displays a visual "ladder" of price points from List Price down to Opening Offer.
 * Highlights the IQ Target Price as the recommended entry point.
 * 
 * Price rungs typically include:
 * - List Price (100%)
 * - 90% of List (common investor threshold)
 * - Breakeven (strategy-specific)
 * - IQ Target (highlighted - profitable entry)
 * - Opening Offer (negotiation starting point)
 */

interface PriceLadderProps {
  /** Title for the ladder section */
  title?: string
  /** Array of price rungs to display */
  rungs: PriceRung[]
}

// Color mappings for different rung types
const rungMarkerColors: Record<PriceRungType, string> = {
  list: 'bg-red-500',
  ninety: 'bg-orange-500',
  breakeven: 'bg-yellow-500',
  target: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  offer: 'bg-teal'
}

const rungValueColors: Record<PriceRungType, string> = {
  list: 'text-red-500',
  ninety: 'text-orange-500',
  breakeven: 'text-gray-800 dark:text-white',
  target: 'text-green-500',
  offer: 'text-gray-800 dark:text-white'
}

export function PriceLadder({ title = 'Price Position Ladder', rungs }: PriceLadderProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 mb-4">
      {/* Header */}
      <h4 className="text-[0.7rem] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide mb-3.5">
        {title}
      </h4>

      {/* Rungs */}
      <div className="space-y-0">
        {rungs.map((rung, index) => (
          <PriceRungRow 
            key={rung.type} 
            rung={rung}
            isLast={index === rungs.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

interface PriceRungRowProps {
  rung: PriceRung
  isLast: boolean
}

function PriceRungRow({ rung, isLast }: PriceRungRowProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const isTarget = rung.type === 'target'
  
  // Wrapper classes for highlighted (target) row
  const wrapperClasses = isTarget
    ? 'bg-green-500/[0.08] -mx-4 px-4 rounded-lg'
    : ''

  return (
    <div 
      className={`flex items-center py-2.5 ${!isLast ? 'border-b border-gray-200 dark:border-white/[0.04]' : ''} ${wrapperClasses}`}
    >
      {/* Marker Dot */}
      <div 
        className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${rungMarkerColors[rung.type]}`}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-[0.75rem] font-semibold flex items-center gap-1.5 ${isTarget ? 'text-green-500' : 'text-gray-800 dark:text-white/90'}`}>
          {isTarget && <Target className="w-3 h-3" />}
          {rung.name}
        </div>
        <div className="text-[0.65rem] text-gray-500 dark:text-white/40">
          {rung.description}
        </div>
      </div>

      {/* Price */}
      <div className={`text-[0.85rem] font-bold ${rungValueColors[rung.type]}`}>
        {formatCurrency(rung.price)}
      </div>

      {/* Percentage */}
      <div className="text-[0.65rem] text-gray-500 dark:text-white/40 ml-2 w-10 text-right">
        {Math.round(rung.percentOfList)}%
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

  return [
    {
      type: 'list',
      name: 'List Price',
      description: 'Current asking price',
      price: listPrice,
      percentOfList: 100
    },
    {
      type: 'ninety',
      name: '90% of List',
      description: 'Common investor threshold',
      price: ninetyPercent,
      percentOfList: 90
    },
    {
      type: 'breakeven',
      name: breakevenName,
      description: breakevenDescription,
      price: breakevenPrice,
      percentOfList: (breakevenPrice / listPrice) * 100
    },
    {
      type: 'target',
      name: `🎯 ${targetName}`,
      description: targetDescription,
      price: targetPrice,
      percentOfList: (targetPrice / listPrice) * 100,
      isHighlighted: true
    },
    {
      type: 'offer',
      name: 'Offer',
      description: 'Initial offer starting point',
      price: openingOffer,
      percentOfList: openingOfferPercent * 100
    }
  ]
}

/**
 * PriceLadderCompact Component
 * 
 * A horizontal compact version showing just key prices.
 */

interface PriceLadderCompactProps {
  listPrice: number
  targetPrice: number
  openingOffer: number
}

export function PriceLadderCompact({ listPrice, targetPrice, openingOffer }: PriceLadderCompactProps) {
  const formatCompact = (value: number) => 
    Math.abs(value) >= 1000000
      ? `$${(value / 1000000).toFixed(1)}M`
      : Math.abs(value) >= 1000
        ? `$${Math.round(value / 1000)}K`
        : `$${value}`

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
