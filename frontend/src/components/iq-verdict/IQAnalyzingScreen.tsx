'use client'

/**
 * IQAnalyzingScreen - Loading screen shown while IQ analyzes all 6 strategies
 * Desktop/Web version with animated progress
 * Includes time estimate and rotating micro-tips to reduce perceived wait time
 */

import React, { useEffect, useState } from 'react'
import { IQ_COLORS, STRATEGY_INFO, IQStrategyId, IQProperty } from './types'

// Strategy list for progress display
const STRATEGIES: { id: IQStrategyId; name: string }[] = [
  { id: 'long-term-rental', name: 'Long-Term Rental' },
  { id: 'short-term-rental', name: 'Short-Term Rental' },
  { id: 'brrrr', name: 'BRRRR' },
  { id: 'fix-and-flip', name: 'Fix & Flip' },
  { id: 'house-hack', name: 'House Hack' },
  { id: 'wholesale', name: 'Wholesale' },
]

// Rotating micro-tips to show during analysis
const MICRO_TIPS = [
  'IQ checks 47 data points per strategy...',
  'Comparing against 12 recent sales nearby...',
  'Calculating cash-on-cash for 3 financing scenarios...',
  'Analyzing rental comps within 1 mile...',
  'Evaluating expense ratios for your market...',
  'Running DSCR calculations for loan qualification...',
]

interface IQAnalyzingScreenProps {
  property: IQProperty
  onAnalysisComplete: () => void
  minimumDisplayTime?: number
}

export function IQAnalyzingScreen({
  property,
  onAnalysisComplete,
  minimumDisplayTime = 2800,
}: IQAnalyzingScreenProps) {
  const [completedStrategies, setCompletedStrategies] = useState<number>(0)
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [showSlowMessage, setShowSlowMessage] = useState<boolean>(false)
  
  // Build full address with city, state, zip
  const fullAddress = [
    property.address,
    [property.city, property.state, property.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ')

  // Staggered progress animation with irregular intervals for better psychology
  useEffect(() => {
    const intervals = [300, 500, 350, 600, 400, 450] // Irregular intervals
    let currentIndex = 0
    
    const runProgress = () => {
      if (currentIndex < STRATEGIES.length) {
        setCompletedStrategies(currentIndex + 1)
        currentIndex++
        if (currentIndex < STRATEGIES.length) {
          setTimeout(runProgress, intervals[currentIndex] || 400)
        }
      }
    }
    
    setTimeout(runProgress, intervals[0])
    
    return () => {}
  }, [])

  // Rotate micro-tips every 2.5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % MICRO_TIPS.length)
    }, 2500)

    return () => clearInterval(tipInterval)
  }, [])

  // Track elapsed time
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  // Show slow connection message after 15 seconds
  useEffect(() => {
    if (elapsedTime >= 15) {
      setShowSlowMessage(true)
    }
  }, [elapsedTime])

  // Auto-transition after minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnalysisComplete()
    }, minimumDisplayTime)

    return () => clearTimeout(timer)
  }, [minimumDisplayTime, onAnalysisComplete])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: IQ_COLORS.deepNavy }}>
      <div className="flex flex-col items-center px-8 max-w-md">
        {/* Animated IQ Icon */}
        <div 
          className="w-32 h-32 rounded-full flex items-center justify-center mb-8 animate-pulse"
          style={{ backgroundColor: `${IQ_COLORS.electricCyan}25` }}
        >
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${IQ_COLORS.electricCyan}40` }}
          >
            <img 
              src="/images/IQ-Logo.svg"
              alt="IQ"
              className="w-14 h-14 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          IQ is Analyzing...
        </h1>
        <p className="text-sm mb-3" style={{ color: IQ_COLORS.slateLight }}>
          Evaluating 6 investment strategies
        </p>
        
        {/* Time Estimate */}
        <p className="text-xs mb-6" style={{ color: IQ_COLORS.slate }}>
          Usually takes 8-12 seconds
        </p>

        {/* Rotating Micro-tip */}
        <div 
          className="mb-8 px-4 py-2 rounded-lg text-center"
          style={{ backgroundColor: `${IQ_COLORS.electricCyan}15` }}
        >
          <p 
            className="text-xs transition-opacity duration-300"
            style={{ color: IQ_COLORS.electricCyan }}
          >
            {MICRO_TIPS[currentTipIndex]}
          </p>
        </div>

        {/* Progress List */}
        <div className="w-full max-w-xs space-y-3">
          {STRATEGIES.map((strategy, index) => {
            const isComplete = index < completedStrategies
            const isCurrent = index === completedStrategies

            return (
              <div
                key={strategy.id}
                className="flex items-center gap-3 transition-opacity duration-300"
                style={{ opacity: isComplete ? 1 : isCurrent ? 0.7 : 0.4 }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300"
                  style={{
                    backgroundColor: isComplete ? IQ_COLORS.success : '#1E293B',
                  }}
                >
                  {isComplete && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm font-medium transition-colors duration-300"
                  style={{ color: isComplete ? '#FFFFFF' : IQ_COLORS.slateLight }}
                >
                  {strategy.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Property Reference */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-sm" style={{ color: IQ_COLORS.slate }}>
            {fullAddress}
          </p>
          {showSlowMessage && (
            <p 
              className="text-xs mt-2 animate-fade-in"
              style={{ color: IQ_COLORS.slateLight }}
            >
              Taking longer than usual — complex property. Almost done...
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

export default IQAnalyzingScreen
