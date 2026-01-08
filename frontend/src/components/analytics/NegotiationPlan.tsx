'use client'

import React from 'react'
import { NegotiationPlanData, OfferCard, LeveragePoint } from './types'

/**
 * NegotiationPlan Component
 * 
 * Displays a game plan for negotiating the purchase price, including:
 * - Three offer cards: Opening Offer, Target Price, Walk-Away
 * - Leverage points to use in negotiation
 * 
 * This component helps investors understand the negotiation range
 * and provides talking points for discussions with sellers.
 */

interface NegotiationPlanProps {
  /** Title for the section */
  title?: string
  /** Negotiation plan data */
  data: NegotiationPlanData
}

export function NegotiationPlan({
  title = 'Negotiation Game Plan',
  data
}: NegotiationPlanProps) {
  return (
    <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-2xl p-4 mb-4">
      {/* Header */}
      <h4 className="text-[0.75rem] font-bold text-teal flex items-center gap-1.5 mb-3.5">
        {title}
      </h4>

      {/* Offer Cards Row */}
      <div className="flex gap-2 mb-3.5">
        <OfferCardComponent offer={data.openingOffer} />
        <OfferCardComponent offer={data.targetPrice} isRecommended />
        <OfferCardComponent offer={data.walkAway} />
      </div>

      {/* Leverage Points */}
      {data.leveragePoints.length > 0 && (
        <LeverageSection points={data.leveragePoints} />
      )}
    </div>
  )
}

interface OfferCardComponentProps {
  offer: OfferCard
  isRecommended?: boolean
}

function OfferCardComponent({ offer, isRecommended = false }: OfferCardComponentProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const baseClasses = "flex-1 rounded-xl p-2.5 text-center"
  const cardClasses = isRecommended
    ? `${baseClasses} bg-green-500/10 border border-green-500/30`
    : `${baseClasses} bg-white/[0.03] border border-white/[0.06]`

  const labelClasses = isRecommended
    ? "text-green-500"
    : "text-white/50"

  const valueClasses = isRecommended
    ? "text-green-500"
    : "text-white"

  return (
    <div className={cardClasses}>
      <div className={`text-[0.55rem] uppercase tracking-wide mb-1 ${labelClasses}`}>
        {offer.label}
      </div>
      <div className={`text-[0.95rem] font-bold ${valueClasses}`}>
        {formatCurrency(offer.price)}
      </div>
      <div className="text-[0.6rem] text-white/40">
        {Math.round(offer.percentOfList)}% of list
      </div>
    </div>
  )
}

interface LeverageSectionProps {
  points: LeveragePoint[]
}

function LeverageSection({ points }: LeverageSectionProps) {
  return (
    <div className="border-t border-white/[0.06] pt-3">
      <h5 className="text-[0.65rem] font-semibold text-white/50 uppercase tracking-wide mb-2">
        Leverage Points
      </h5>
      <div className="space-y-1.5">
        {points.map((point, index) => (
          <div key={index} className="flex items-center gap-2 text-[0.72rem] text-white/70">
            <div className="w-[18px] h-[18px] bg-teal/15 rounded flex items-center justify-center text-[0.65rem] flex-shrink-0">
              {point.icon}
            </div>
            <span>{point.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Helper function to generate negotiation plan from prices
 */
export function generateNegotiationPlan(
  listPrice: number,
  targetPrice: number,
  openingOfferPercent: number = 0.70,
  walkAwayPercent?: number,
  leveragePoints: LeveragePoint[] = []
): NegotiationPlanData {
  const openingOffer = listPrice * openingOfferPercent
  const walkAway = walkAwayPercent 
    ? listPrice * walkAwayPercent 
    : targetPrice * 1.08 // Default to 8% above target

  return {
    openingOffer: {
      label: 'Opening Offer',
      price: openingOffer,
      percentOfList: openingOfferPercent * 100
    },
    targetPrice: {
      label: 'Target Price',
      price: targetPrice,
      percentOfList: (targetPrice / listPrice) * 100,
      isRecommended: true
    },
    walkAway: {
      label: 'Walk-Away',
      price: walkAway,
      percentOfList: (walkAway / listPrice) * 100
    },
    leveragePoints
  }
}

/**
 * Common leverage points by category
 */
export const LEVERAGE_POINTS = {
  daysOnMarket: (days: number, avgDays: number = 28): LeveragePoint => ({
    icon: '📅',
    text: `${days} days on market (avg: ${avgDays} days)`
  }),
  priceReduced: (times: number): LeveragePoint => ({
    icon: '📉',
    text: `Price reduced ${times}x already`
  }),
  comparables: (percentLess: number): LeveragePoint => ({
    icon: '🏘️',
    text: `${Math.abs(percentLess).toFixed(0)} similar sold for ${percentLess}% less`
  }),
  cashOffer: (): LeveragePoint => ({
    icon: '💰',
    text: 'Cash offer, quick close = seller appeal'
  }),
  rehabNeeded: (amount: number): LeveragePoint => ({
    icon: '🔧',
    text: `Property needs $${Math.round(amount / 1000)}K+ rehab — limits buyers`
  }),
  noHOA: (): LeveragePoint => ({
    icon: '✓',
    text: 'No HOA restrictions on strategy'
  }),
  touristArea: (): LeveragePoint => ({
    icon: '🏖️',
    text: 'Strong STR demand — tourist area'
  }),
  activeBuyerList: (): LeveragePoint => ({
    icon: '👥',
    text: 'Active buyer list ready to assign'
  }),
  motivatedSeller: (): LeveragePoint => ({
    icon: '📅',
    text: 'Extended time on market — motivated seller'
  })
}

/**
 * NegotiationPlanCompact Component
 * 
 * A compact inline version showing just the key offers.
 */

interface NegotiationPlanCompactProps {
  openingOffer: number
  targetPrice: number
  walkAway: number
  listPrice: number
}

export function NegotiationPlanCompact({ 
  openingOffer, 
  targetPrice, 
  walkAway, 
  listPrice 
}: NegotiationPlanCompactProps) {
  const formatCompact = (value: number) => 
    Math.abs(value) >= 1000 
      ? `$${Math.round(value / 1000)}K` 
      : `$${value}`

  return (
    <div className="flex items-center justify-between bg-blue-500/[0.06] border border-blue-500/15 rounded-xl p-3">
      <div className="text-center">
        <div className="text-[0.6rem] text-white/50 uppercase">Open</div>
        <div className="text-sm font-semibold text-white">{formatCompact(openingOffer)}</div>
        <div className="text-[0.55rem] text-white/40">{Math.round((openingOffer / listPrice) * 100)}%</div>
      </div>
      <div className="text-white/30">→</div>
      <div className="text-center">
        <div className="text-[0.6rem] text-green-500 uppercase font-semibold">Target</div>
        <div className="text-sm font-bold text-green-500">{formatCompact(targetPrice)}</div>
        <div className="text-[0.55rem] text-green-500/70">{Math.round((targetPrice / listPrice) * 100)}%</div>
      </div>
      <div className="text-white/30">→</div>
      <div className="text-center">
        <div className="text-[0.6rem] text-white/50 uppercase">Walk</div>
        <div className="text-sm font-semibold text-white">{formatCompact(walkAway)}</div>
        <div className="text-[0.55rem] text-white/40">{Math.round((walkAway / listPrice) * 100)}%</div>
      </div>
    </div>
  )
}

export default NegotiationPlan
