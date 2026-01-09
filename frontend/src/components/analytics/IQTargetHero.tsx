'use client'

import React from 'react'
import { Target } from 'lucide-react'

/**
 * IQTargetHero Component
 * 
 * The hero element displaying the IQ Target Price - the recommended entry point
 * for a profitable investment. Features animated gradients and glowing effects.
 * 
 * This is the "crown jewel" of the analytics redesign, showing users exactly
 * what price they should target for their chosen strategy.
 */

interface IQTargetHeroProps {
  /** The calculated target price */
  targetPrice: number
  /** Amount below list price */
  discountAmount: number
  /** Percentage below list price */
  discountPercent: number
  /** Strategy-specific rationale text */
  rationale: string
  /** Highlighted metric in rationale (e.g., "$486/mo cash flow") */
  highlightedMetric?: string
  /** Secondary highlighted metric (e.g., "12.4% Cash-on-Cash") */
  secondaryMetric?: string
  /** Custom badge text (defaults to "IQ Target Price") */
  badgeText?: string
  /** Custom label above price (defaults to "Your Profitable Entry Point") */
  labelText?: string
}

export function IQTargetHero({
  targetPrice,
  discountAmount,
  discountPercent,
  rationale,
  highlightedMetric,
  secondaryMetric,
  badgeText = 'IQ Target Price',
  labelText = 'Your Profitable Entry Point'
}: IQTargetHeroProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const formatCompact = (value: number) => 
    Math.abs(value) >= 1000 
      ? `$${Math.round(value / 1000).toLocaleString()}K` 
      : formatCurrency(value)

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-center mb-4 bg-gradient-to-br from-green-500/[0.15] to-teal-500/[0.1] border border-green-500/40">
      {/* Animated Radial Glow Background */}
      <div 
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-target-glow pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)'
        }}
      />

      {/* Badge */}
      <div className="relative inline-flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1 mb-2.5">
        <Target className="w-3 h-3 text-green-500" />
        <span className="text-[0.6rem] font-bold text-green-500 uppercase tracking-wider">
          {badgeText}
        </span>
      </div>

      {/* Label */}
      <div className="relative text-[0.7rem] text-neutral-500 dark:text-white/60 mb-1">
        {labelText}
      </div>

      {/* Target Price */}
      <div className="relative text-[2.4rem] font-extrabold text-green-600 dark:text-green-500 leading-none mb-1.5 tracking-tight">
        {formatCurrency(targetPrice)}
      </div>

      {/* Discount Info */}
      <div className="relative text-[0.85rem] text-brand-500 dark:text-teal font-semibold mb-3">
        {formatCompact(discountAmount)} below list ({Math.round(discountPercent)}%)
      </div>

      {/* Rationale */}
      <div className="relative text-[0.72rem] text-neutral-600 dark:text-white/70 leading-relaxed max-w-[280px] mx-auto">
        {rationale}
        {highlightedMetric && (
          <>
            {' '}
            <strong className="text-green-500">{highlightedMetric}</strong>
          </>
        )}
        {secondaryMetric && (
          <>
            {' with '}
            <strong className="text-green-500">{secondaryMetric}</strong>
            {' return'}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * IQTargetHeroCompact Component
 * 
 * A more compact version for use in comparison views or smaller spaces.
 */

interface IQTargetHeroCompactProps {
  targetPrice: number
  discountPercent: number
  primaryMetric: string
  primaryLabel: string
}

export function IQTargetHeroCompact({
  targetPrice,
  discountPercent,
  primaryMetric,
  primaryLabel
}: IQTargetHeroCompactProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="relative overflow-hidden rounded-xl p-4 text-center bg-gradient-to-br from-green-500/[0.12] to-teal-500/[0.08] border border-green-500/30">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Target className="w-3.5 h-3.5 text-green-500" />
        <span className="text-[0.65rem] font-bold text-green-500 uppercase tracking-wider">
          IQ Target
        </span>
      </div>
      
      <div className="text-xl font-bold text-green-500 mb-0.5">
        {formatCurrency(targetPrice)}
      </div>
      
      <div className="text-[0.65rem] text-neutral-500 dark:text-white/50 mb-2">
        {Math.round(discountPercent)}% below list
      </div>
      
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-200 dark:border-white/10">
        <div>
          <div className="text-sm font-bold text-green-600 dark:text-green-500">{primaryMetric}</div>
          <div className="text-[0.6rem] text-neutral-500 dark:text-white/50 uppercase">{primaryLabel}</div>
        </div>
      </div>
    </div>
  )
}

export default IQTargetHero
