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
    id: 'house_hack', 
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
              relative bg-white dark:bg-[#0d1e38]
              border-2 rounded-[14px] p-4 pt-5 text-center
              transition-all duration-200 hover:-translate-y-0.5
              ${isActive 
                ? 'border-brand-500 dark:border-[#4dd0e1] bg-brand-500/5 dark:bg-[#4dd0e1]/10' 
                : 'border-gray-200 dark:border-[#007ea7]/40 hover:border-brand-500/60 dark:hover:border-[#4dd0e1]/60'
              }
            `}
          >
            {/* Color indicator bar */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b"
              style={{ backgroundColor: strategy.color }}
            />
            
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1 mt-1">
              {strategy.name}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
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
      <h2 className="text-xl font-extrabold text-brand-500 dark:text-[#4dd0e1] mb-1">
        {title}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-0.5">
        {subtitle}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {action}
      </p>
    </div>
  )
}
