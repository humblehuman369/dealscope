'use client'

import React from 'react'

/**
 * DesktopIQTargetHero Component
 * 
 * Enhanced desktop version of the IQ Target Hero with larger text,
 * animated glow effect, and improved visual hierarchy.
 */

interface DesktopIQTargetHeroProps {
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

export function DesktopIQTargetHero({
  targetPrice,
  discountAmount,
  discountPercent,
  rationale,
  highlightedMetric,
  secondaryMetric,
  badgeText = 'IQ Target Price',
  labelText = 'Your Profitable Entry Point'
}: DesktopIQTargetHeroProps) {
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
    <div className="desktop-iq-target-hero">
      {/* Badge */}
      <div className="desktop-iq-target-badge">
        <span>🎯</span>
        {badgeText}
      </div>

      {/* Label */}
      <div className="desktop-iq-target-label">
        {labelText}
      </div>

      {/* Target Price */}
      <div className="desktop-iq-target-price">
        {formatCurrency(targetPrice)}
      </div>

      {/* Discount Info */}
      <div className="desktop-iq-target-discount">
        {formatCompact(discountAmount)} below list ({Math.round(discountPercent)}%)
      </div>

      {/* Rationale */}
      <div className="desktop-iq-target-rationale">
        {rationale}
        {highlightedMetric && (
          <>
            {' '}
            <strong>{highlightedMetric}</strong>
          </>
        )}
        {secondaryMetric && (
          <>
            {' with '}
            <strong>{secondaryMetric}</strong>
            {' return'}
          </>
        )}
      </div>
    </div>
  )
}

export default DesktopIQTargetHero
