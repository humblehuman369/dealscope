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
import { IQ_COLORS, IQProperty } from './types'

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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: IQ_COLORS.deepNavy }}>
      <div className="flex flex-col items-center px-8 max-w-md">
        {/* Animated progress ring with IQ logo */}
        <div className="relative mb-8" style={{ width: size, height: size }}>
          {/* Background ring */}
          <svg width={size} height={size} className="absolute inset-0">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(148,163,184,0.1)"
              strokeWidth={strokeWidth}
            />
          </svg>
          {/* Progress ring */}
          <svg width={size} height={size} className="absolute inset-0 -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={IQ_COLORS.electricCyan}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
            />
          </svg>
          {/* Center logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${IQ_COLORS.electricCyan}15` }}
            >
              <img
                src="/images/IQ-Logo.svg"
                alt="IQ"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Analyzing Property
        </h1>
        <p className="text-sm mb-8 text-center" style={{ color: IQ_COLORS.slateLight }}>
          Just a moment while IQ evaluates this deal...
        </p>

        {/* Rotating Micro-tip */}
        <div
          className="mb-6 px-5 py-3 rounded-xl text-center max-w-xs"
          style={{ backgroundColor: `${IQ_COLORS.electricCyan}10`, border: `1px solid ${IQ_COLORS.electricCyan}20` }}
        >
          <p
            className="text-xs font-medium transition-opacity duration-300"
            style={{ color: IQ_COLORS.electricCyan }}
          >
            {MICRO_TIPS[currentTipIndex]}
          </p>
        </div>

        {/* Property Reference */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: IQ_COLORS.slate }}>
            {fullAddress}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IQAnalyzingScreen
