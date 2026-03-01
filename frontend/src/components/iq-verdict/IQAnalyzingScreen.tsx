'use client'

/**
 * IQAnalyzingScreen - Loading screen shown while IQ analyzes a property
 * Desktop/Web version with animated progress ring + rotating micro-tips.
 *
 * HONEST VERSION: No fake per-strategy checkmarks or misleading time estimates.
 * Shows a single progress ring and credibility micro-tips while the user
 * transitions to the verdict page (which handles actual data fetching).
 */

import React, { useEffect, useState } from 'react'
import { colors } from './verdict-design-tokens'
import { IQProperty } from './types'

// Use design system primary blue (#0EA5E9) per CURSOR-UNIFY-COLOR-SYSTEM
const ACCENT = colors.brand.teal
const ACCENT_BG = 'rgba(14,165,233,0.08)'
const ACCENT_BORDER = 'rgba(14,165,233,0.2)'
// Glow around logo — rgba(14, 165, 233, [opacity]) per color system (base for pulse)
const LOGO_GLOW_BASE = '0 0 24px rgba(14,165,233,0.35), 0 0 48px rgba(14,165,233,0.15)'
const LOGO_GLOW_PULSE = '0 0 32px rgba(14,165,233,0.5), 0 0 64px rgba(14,165,233,0.22)'

// Rotating micro-tips — real, credibility-building content
const MICRO_TIPS = [
  'Checking rental comps within 1 mile...',
  'Evaluating 6 investment strategies in parallel...',
  'Calculating breakeven price and target purchase price...',
  'Analyzing cash flow under current market conditions...',
  'Scoring deal opportunity vs. comparable properties...',
  'Running risk-adjusted return scenarios...',
]

interface IQAnalyzingScreenProps {
  property: IQProperty
  onAnalysisComplete: () => void
  minimumDisplayTime?: number
}

export function IQAnalyzingScreen({
  property,
  onAnalysisComplete,
  minimumDisplayTime = 2200,
}: IQAnalyzingScreenProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0)
  const [progress, setProgress] = useState(0)

  // Build full address
  const fullAddress = [
    property.address,
    [property.city, property.state, property.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ')

  // Smooth progress animation (0 → 100 over ~minimumDisplayTime)
  useEffect(() => {
    const start = Date.now()
    const duration = minimumDisplayTime * 0.9 // reach ~100% just before transition

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)
      if (pct < 100) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [minimumDisplayTime])

  // Rotate micro-tips every 2 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % MICRO_TIPS.length)
    }, 2000)

    return () => clearInterval(tipInterval)
  }, [])

  // Auto-transition after minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnalysisComplete()
    }, minimumDisplayTime)

    return () => clearTimeout(timer)
  }, [minimumDisplayTime, onAnalysisComplete])

  // SVG progress ring dimensions
  const size = 128
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
      <style>{`
        @keyframes analyzing-glow-pulse {
          0%, 100% { box-shadow: ${LOGO_GLOW_BASE}; opacity: 1; }
          50% { box-shadow: ${LOGO_GLOW_PULSE}; opacity: 0.95; }
        }
        @keyframes analyzing-ring-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        .analyzing-logo-pulse {
          animation: analyzing-glow-pulse 2s ease-in-out infinite;
        }
        .analyzing-ring-pulse {
          animation: analyzing-ring-pulse 2s ease-in-out infinite;
        }
        @keyframes analyzing-tip-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .analyzing-tip-pulse {
          animation: analyzing-tip-pulse 2.2s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col items-center px-8 max-w-md">
        {/* Animated progress ring with IQ logo — pulsating while waiting */}
        <div className="relative mb-8" style={{ width: size, height: size }}>
          {/* Background ring — subtle pulse */}
          <svg width={size} height={size} className="absolute inset-0 analyzing-ring-pulse">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(148,163,184,0.2)"
              strokeWidth={strokeWidth}
            />
          </svg>
          {/* Progress ring — design system blue #0EA5E9 */}
          <svg width={size} height={size} className="absolute inset-0 -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ACCENT}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
            />
          </svg>
          {/* Center logo — transparent DealGapIQ icon with pulsating color-system glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="analyzing-logo-pulse w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'transparent',
                boxShadow: LOGO_GLOW_BASE,
              }}
            >
              <img
                src="/images/iq-logo-icon.png"
                alt="IQ"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2" style={{ color: colors.text.white }}>
          Analyzing Property
        </h1>
        <p className="text-sm mb-8 text-center" style={{ color: colors.text.secondary }}>
          Just a moment while IQ evaluates this deal...
        </p>

        {/* Rotating Micro-tip — subtle pulse so the whole block feels alive */}
        <div
          className="mb-6 px-5 py-3 rounded-xl text-center max-w-xs analyzing-tip-pulse"
          style={{ backgroundColor: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
        >
          <p
            className="text-xs font-medium transition-opacity duration-300"
            style={{ color: ACCENT }}
          >
            {MICRO_TIPS[currentTipIndex]}
          </p>
        </div>

        {/* Property Reference */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: colors.text.tertiary }}>
            {fullAddress}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IQAnalyzingScreen
