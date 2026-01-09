'use client'

import React from 'react'
import { StrategyId } from './types'

interface Strategy {
  id: StrategyId
  name: string
  tagline: string
  color: string
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr', 
    name: 'Long-Term Rental', 
    tagline: 'Steady income & equity',
    color: '#3b82f6'
  },
  { 
    id: 'str', 
    name: 'Short-Term Rental', 
    tagline: 'Vacation & Airbnb income',
    color: '#8b5cf6'
  },
  { 
    id: 'brrrr', 
    name: 'BRRRR', 
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    color: '#f97316'
  },
  { 
    id: 'flip', 
    name: 'Fix & Flip', 
    tagline: 'Buy low, sell high',
    color: '#ec4899'
  },
  { 
    id: 'house-hack', 
    name: 'House Hack', 
    tagline: 'Live free, rent rooms',
    color: '#14b8a6'
  },
  { 
    id: 'wholesale', 
    name: 'Wholesale', 
    tagline: 'Assign contracts for profit',
    color: '#84cc16'
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - 2x3 grid of strategy selection boxes
 * 
 * Each box has a colored top indicator bar and displays
 * strategy name + tagline. Active selection is highlighted.
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`
              relative bg-[#0d1e38] dark:bg-[#0d1e38] bg-white
              border-2 rounded-[14px] p-4 pt-5 text-center
              transition-all duration-200 hover:-translate-y-0.5
              ${isActive 
                ? 'border-[#4dd0e1] dark:border-[#4dd0e1] border-brand-500 bg-[#4dd0e1]/10 dark:bg-[#4dd0e1]/10 bg-brand-500/5' 
                : 'border-[#007ea7]/40 dark:border-[#007ea7]/40 border-gray-200 hover:border-[#4dd0e1]/60 dark:hover:border-[#4dd0e1]/60 hover:border-brand-500/60'
              }
            `}
          >
            {/* Color indicator bar */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b"
              style={{ backgroundColor: strategy.color }}
            />
            
            <h3 className="text-[15px] font-bold text-white dark:text-white text-gray-900 mb-1 mt-1">
              {strategy.name}
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 text-gray-500 leading-tight">
              {strategy.tagline}
            </p>
          </button>
        )
      })}
    </div>
  )
}

interface StrategyPromptProps {
  title?: string
  subtitle?: string
  action?: string
}

/**
 * StrategyPrompt - Header section above the strategy grid
 */
export function StrategyPrompt({ 
  title = 'Compare 6 Profit Models',
  subtitle = 'Which model is best for you?',
  action = 'Select & review'
}: StrategyPromptProps) {
  return (
    <div className="text-center mb-4">
      <h2 className="text-xl font-extrabold text-[#4dd0e1] dark:text-[#4dd0e1] text-brand-500 mb-1">
        {title}
      </h2>
      <p className="text-sm text-gray-300 dark:text-gray-300 text-gray-600 mb-0.5">
        {subtitle}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 text-gray-400">
        {action}
      </p>
    </div>
  )
}
