'use client'

/**
 * IQAnalyzingScreen - Loading screen shown while IQ analyzes all 6 strategies
 * Desktop/Web version with animated progress
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

  // Staggered progress animation
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setCompletedStrategies(prev => {
        if (prev < STRATEGIES.length) {
          return prev + 1
        }
        return prev
      })
    }, 400) // 400ms per strategy = ~2.4s total

    return () => clearInterval(progressInterval)
  }, [])

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
            <span 
              className="text-4xl font-extrabold"
              style={{ color: IQ_COLORS.electricCyan }}
            >
              IQ
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          IQ is Analyzing...
        </h1>
        <p className="text-sm mb-10" style={{ color: IQ_COLORS.slateLight }}>
          Evaluating 6 investment strategies
        </p>

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
            {property.address}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IQAnalyzingScreen
