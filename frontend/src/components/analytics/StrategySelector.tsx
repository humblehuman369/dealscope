'use client'

import React, { useState } from 'react'
import { ChevronDown, ArrowLeft } from 'lucide-react'
import { Strategy, StrategyId, GradeLevel, StrategyGrade } from './types'

/**
 * StrategySelector Component
 * 
 * REDESIGNED: Shows only selected strategy with back button when active.
 * When no strategy selected, shows horizontal pills.
 * 
 * Features:
 * - Single strategy view with "Back To Strategy Options" when selected
 * - Line above strategy title for visual continuity
 * - No icons for cleaner design
 * - Grade badges when available
 */

interface StrategySelectorProps {
  /** Currently selected strategy ID */
  activeStrategy: StrategyId | null
  /** Available strategies */
  strategies: Strategy[]
  /** Strategy grades (optional) */
  grades?: StrategyGrade[]
  /** Callback when strategy changes - null to go back to selection */
  onChange: (strategyId: StrategyId | null) => void
  /** Whether to show the initial CTA banner */
  showCTA?: boolean
}

export function StrategySelector({
  activeStrategy,
  strategies,
  grades,
  onChange,
  showCTA = true
}: StrategySelectorProps) {
  const [ctaDismissed, setCtaDismissed] = useState(activeStrategy !== null)

  const handleStrategyClick = (strategyId: StrategyId) => {
    setCtaDismissed(true)
    onChange(strategyId)
  }

  const handleBackClick = () => {
    onChange(null)
  }

  const getGrade = (strategyId: StrategyId): GradeLevel | null => {
    return grades?.find(g => g.strategyId === strategyId)?.grade ?? null
  }

  // When a strategy is selected, show single strategy header with back button
  if (activeStrategy) {
    const activeStrategyData = strategies.find(s => s.id === activeStrategy)
    const grade = getGrade(activeStrategy)
    
    return (
      <div className="mb-4">
        {/* Top line indicator */}
        <div className="h-[3px] bg-gradient-to-r from-teal to-blue-500 rounded-full mb-3" />
        
        {/* Strategy header with back button */}
        <div className="flex items-center justify-between">
          {/* Left side: Strategy name + grade */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {activeStrategyData?.name}
            </h2>
            {grade && <GradeBadge grade={grade} />}
          </div>

          {/* Right side: Back button */}
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-white/70 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.1] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Strategy Options</span>
          </button>
        </div>
      </div>
    )
  }

  // No strategy selected - show all strategy options
  return (
    <div className="mb-4">
      {/* CTA Banner - shows before first strategy selection */}
      {showCTA && !ctaDismissed && (
        <div className="bg-gradient-to-r from-teal to-blue-500 text-white text-center p-2.5 rounded-xl mb-3.5 relative overflow-hidden">
          <div 
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)'
            }}
          />
          <div className="relative flex items-center justify-center gap-2">
            <span className="font-semibold text-[0.75rem]">👇 Pick a Strategy to Unlock Insights</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      )}

      {/* Strategy Pills - No icons */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {strategies.map((strategy) => (
          <StrategyPill
            key={strategy.id}
            strategy={strategy}
            grade={getGrade(strategy.id)}
            onClick={() => handleStrategyClick(strategy.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface StrategyPillProps {
  strategy: Strategy
  grade: GradeLevel | null
  onClick: () => void
}

function StrategyPill({ strategy, grade, onClick }: StrategyPillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 bg-gray-100 dark:bg-white/[0.03] text-gray-700 dark:text-white/80 border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.15]"
    >
      <span>{strategy.shortName}</span>
      {grade && <GradeBadge grade={grade} />}
    </button>
  )
}

interface GradeBadgeProps {
  grade: GradeLevel
}

function GradeBadge({ grade }: GradeBadgeProps) {
  const getGradeClasses = () => {
    switch (grade) {
      case 'A':
        return 'bg-green-500/30 text-green-500 border-green-500/40'
      case 'B':
        return 'bg-blue-500/30 text-blue-400 border-blue-500/40'
      case 'C':
        return 'bg-yellow-500/30 text-yellow-500 border-yellow-500/40'
      case 'D':
        return 'bg-orange-500/30 text-orange-500 border-orange-500/40'
      case 'F':
        return 'bg-red-500/30 text-red-500 border-red-500/40'
    }
  }

  return (
    <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded border ${getGradeClasses()}`}>
      {grade}
    </span>
  )
}

/**
 * Default strategy configurations - No icons
 */

export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'ltr',
    name: 'Long-Term Rental',
    shortName: 'Long Rental',
    description: 'Buy and hold for steady monthly income',
    icon: '🏠',
    color: '#22c55e',
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    id: 'str',
    name: 'Short-Term Rental',
    shortName: 'Short Rental',
    description: 'Vacation rental on Airbnb or VRBO',
    icon: '🏖️',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    shortName: 'BRRRR',
    description: 'Buy, Rehab, Rent, Refinance, Repeat',
    icon: '🔄',
    color: '#8b5cf6',
    gradient: 'from-purple-500 to-violet-600'
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    shortName: 'Fix & Flip',
    description: 'Renovate and sell for profit',
    icon: '🔨',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    id: 'house_hack',
    name: 'House Hack',
    shortName: 'House Hack',
    description: 'Live in one unit, rent the others',
    icon: '🏡',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-teal-600'
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    shortName: 'Wholesale',
    description: 'Assign contract to end buyer',
    icon: '📋',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-600'
  }
]

/**
 * StrategySelectorCompact Component
 * 
 * A dropdown version for mobile headers.
 */

interface StrategySelectorCompactProps {
  activeStrategy: StrategyId
  strategies: Strategy[]
  onChange: (strategyId: StrategyId) => void
}

export function StrategySelectorCompact({
  activeStrategy,
  strategies,
  onChange
}: StrategySelectorCompactProps) {
  const [isOpen, setIsOpen] = useState(false)
  const active = strategies.find(s => s.id === activeStrategy)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-[0.75rem]"
      >
        <span className="text-white font-medium">{active?.shortName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-navy-800 border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => {
                onChange(strategy.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[0.72rem] hover:bg-white/[0.05] transition-colors ${
                strategy.id === activeStrategy ? 'bg-teal/10 text-teal' : 'text-white/80'
              }`}
            >
              <span>{strategy.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StrategySelector
