'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Strategy, StrategyId, GradeLevel, StrategyGrade } from './types'

/**
 * StrategySelector Component
 * 
 * Horizontal scrollable pills for selecting investment strategies.
 * Shows grades next to each strategy name when available.
 * 
 * Features:
 * - Initial CTA banner that collapses after first selection
 * - Horizontal scroll with hidden scrollbar
 * - Active state with gradient background
 * - Grade badges (A, B, C, D, F) based on deal quality
 */

interface StrategySelectorProps {
  /** Currently selected strategy ID */
  activeStrategy: StrategyId | null
  /** Available strategies */
  strategies: Strategy[]
  /** Strategy grades (optional) */
  grades?: StrategyGrade[]
  /** Callback when strategy changes */
  onChange: (strategyId: StrategyId) => void
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

  const getGrade = (strategyId: StrategyId): GradeLevel | null => {
    return grades?.find(g => g.strategyId === strategyId)?.grade ?? null
  }

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

      {/* Strategy Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {strategies.map((strategy) => (
          <StrategyPill
            key={strategy.id}
            strategy={strategy}
            isActive={strategy.id === activeStrategy}
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
  isActive: boolean
  grade: GradeLevel | null
  onClick: () => void
}

function StrategyPill({ strategy, isActive, grade, onClick }: StrategyPillProps) {
  const baseClasses = "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[0.72rem] font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0"
  
  const activeClasses = isActive
    ? "bg-gradient-to-r from-teal to-blue-500 text-white shadow-[0_3px_12px_rgba(0,175,168,0.4)]"
    : "bg-white/[0.03] text-white/60 border border-white/[0.08] hover:bg-white/[0.06]"

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      <span className="text-sm">{strategy.icon}</span>
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
 * Default strategy configurations
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
        <span>{active?.icon}</span>
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
              <span>{strategy.icon}</span>
              <span>{strategy.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StrategySelector
