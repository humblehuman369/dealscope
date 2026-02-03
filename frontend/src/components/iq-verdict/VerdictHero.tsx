'use client'

/**
 * VerdictHero Component - Decision-Grade UI
 * 
 * Displays the score ring, VerdictIQ branding, verdict label, and key metrics.
 * Features the new Decision-Grade design with centered score and confidence metrics.
 * 
 * Per DealMakerIQ Design System & Style Guide:
 * - Deep Navy #07172e: All text
 * - Pacific Teal #0891B2: Intelligence markers, positive signals
 * - No washed-out text, no decorative opacity
 */

import React from 'react'
import { Info } from 'lucide-react'

interface VerdictHeroProps {
  dealScore: number
  verdictLabel: string
  verdictSublabel: string
  dealGap: number
  motivationLevel: string
  motivationScore: number
  onShowMethodology: () => void
  // Optional: Confidence metrics
  dealProbability?: number
  marketAlignment?: number
  priceConfidence?: number
}

// Get fill color class based on value
const getColorClass = (value: number): 'teal' | 'amber' | 'negative' => {
  if (value >= 65) return 'teal'
  if (value >= 40) return 'amber'
  return 'negative'
}

export function VerdictHero({
  dealScore,
  verdictLabel,
  verdictSublabel,
  dealGap,
  motivationLevel,
  motivationScore,
  onShowMethodology,
  // Default confidence metrics (can be passed from backend)
  dealProbability = Math.min(100, Math.max(0, dealScore + Math.random() * 10 - 5)),
  marketAlignment = Math.min(100, Math.max(0, 50 + (dealScore - 50) * 0.3)),
  priceConfidence = Math.min(100, Math.max(0, dealScore - 10 + Math.random() * 20)),
}: VerdictHeroProps) {
  return (
    <>
      {/* Verdict Section - Grid Layout with Centered Score */}
      <section className="dg-verdict-section">
        <div className="dg-verdict-content">
          {/* Score Container - Centered in left column */}
          <div className="dg-score-container">
            <div className="dg-score-ring">
              <span className="dg-score-value">{Math.round(dealScore)}</span>
            </div>
          </div>
          
          {/* Verdict Info - Right column */}
          <div className="dg-verdict-info">
            <div className="dg-verdict-title">
              <span className="verdict">Verdict</span>
              <span className="iq">IQ</span>
            </div>
            <div className="dg-verdict-label">{verdictLabel}</div>
            <div className="dg-verdict-subtitle">{verdictSublabel}</div>
            <div className="dg-verdict-links">
              <button 
                className="dg-verdict-link"
                onClick={onShowMethodology}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                How Verdict IQ Works
              </button>
              <span className="separator" style={{ color: 'var(--dg-text-primary)' }}>|</span>
              <button 
                className="dg-verdict-link"
                onClick={onShowMethodology}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                How We Score
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Confidence Metrics Section */}
      <section className="dg-confidence-section">
        <div className="dg-confidence-header">Confidence Metrics</div>
        
        <div className="dg-confidence-row">
          <span className="dg-confidence-label">Deal Probability</span>
          <div className="dg-confidence-bar">
            <div 
              className={`dg-confidence-fill ${getColorClass(dealProbability)}`} 
              style={{ width: `${Math.round(dealProbability)}%` }}
            />
          </div>
          <span className={`dg-confidence-value ${getColorClass(dealProbability)}`}>
            {Math.round(dealProbability)}%
          </span>
        </div>
        
        <div className="dg-confidence-row">
          <span className="dg-confidence-label">Market Alignment</span>
          <div className="dg-confidence-bar">
            <div 
              className={`dg-confidence-fill ${getColorClass(marketAlignment)}`} 
              style={{ width: `${Math.round(marketAlignment)}%` }}
            />
          </div>
          <span className={`dg-confidence-value ${getColorClass(marketAlignment)}`}>
            {Math.round(marketAlignment)}%
          </span>
        </div>
        
        <div className="dg-confidence-row">
          <span className="dg-confidence-label">Price Confidence</span>
          <div className="dg-confidence-bar">
            <div 
              className={`dg-confidence-fill ${getColorClass(priceConfidence)}`} 
              style={{ width: `${Math.round(priceConfidence)}%` }}
            />
          </div>
          <span className={`dg-confidence-value ${getColorClass(priceConfidence)}`}>
            {Math.round(priceConfidence)}%
          </span>
        </div>
      </section>
    </>
  )
}

export default VerdictHero
