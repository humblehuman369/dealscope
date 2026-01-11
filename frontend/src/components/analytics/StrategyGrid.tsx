'use client'

import React from 'react'
import { 
  Home, 
  Palmtree, 
  RefreshCw, 
  Hammer, 
  Users, 
  FileSignature 
} from 'lucide-react'
import { StrategyId } from './types'

interface Strategy {
  id: StrategyId
  name: string
  tagline: string
  color: string
  gradientFrom: string
  gradientTo: string
  icon: React.ElementType
  metric: string
  metricLabel: string
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr', 
    name: 'Long-Term Rental', 
    tagline: 'Build wealth with steady monthly cash flow',
    color: '#3b82f6',
    gradientFrom: '#3b82f6',
    gradientTo: '#1d4ed8',
    icon: Home,
    metric: '8-12%',
    metricLabel: 'Cash-on-Cash'
  },
  { 
    id: 'str', 
    name: 'Short-Term Rental', 
    tagline: 'Maximize income with vacation rentals',
    color: '#8b5cf6',
    gradientFrom: '#8b5cf6',
    gradientTo: '#6d28d9',
    icon: Palmtree,
    metric: '15-25%',
    metricLabel: 'Cash-on-Cash'
  },
  { 
    id: 'brrrr', 
    name: 'BRRRR', 
    tagline: 'Buy, Rehab, Rent, Refinance, Repeat',
    color: '#f97316',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    icon: RefreshCw,
    metric: '∞',
    metricLabel: 'Scalable'
  },
  { 
    id: 'flip', 
    name: 'Fix & Flip', 
    tagline: 'Quick profits from undervalued properties',
    color: '#ec4899',
    gradientFrom: '#ec4899',
    gradientTo: '#db2777',
    icon: Hammer,
    metric: '$50K+',
    metricLabel: 'Profit'
  },
  { 
    id: 'house_hack', 
    name: 'House Hack', 
    tagline: 'Live free while building equity',
    color: '#14b8a6',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
    icon: Users,
    metric: '100%',
    metricLabel: 'Savings'
  },
  { 
    id: 'wholesale', 
    name: 'Wholesale', 
    tagline: 'Earn fees with zero capital required',
    color: '#84cc16',
    gradientFrom: '#84cc16',
    gradientTo: '#65a30d',
    icon: FileSignature,
    metric: '$10K+',
    metricLabel: 'Per Deal'
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - 2x3 grid of strategy selection boxes
 * 
 * Each box has a colored gradient background with icon,
 * strategy name, tagline, and key metric.
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        const Icon = strategy.icon
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`
              relative overflow-hidden rounded-2xl p-4 text-left
              transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
              bg-white dark:bg-transparent
              ${isActive 
                ? 'ring-2 ring-[#4dd0e1] ring-offset-2 ring-offset-white dark:ring-offset-[#0b1426]' 
                : ''
              }
            `}
            style={{
              background: `linear-gradient(135deg, ${strategy.gradientFrom}20 0%, ${strategy.gradientTo}10 100%)`,
              border: `1px solid ${strategy.color}50`
            }}
          >
            {/* Glow effect - only on dark mode */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 opacity-0 dark:opacity-20 blur-2xl"
              style={{ background: strategy.color }}
            />
            
            {/* Icon and metric row */}
            <div className="flex items-start justify-between mb-3 relative">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${strategy.color}20` }}
              >
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: strategy.color }}
                />
              </div>
              <div className="text-right">
                <div 
                  className="text-lg font-extrabold"
                  style={{ color: strategy.color }}
                >
                  {strategy.metric}
                </div>
                <div 
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: `${strategy.color}90` }}
                >
                  {strategy.metricLabel}
                </div>
              </div>
            </div>
            
            {/* Name and tagline */}
            <h3 
              className="text-base font-bold mb-1.5"
              style={{ color: strategy.color }}
            >
              {strategy.name}
            </h3>
            <p className="text-[13px] text-gray-600 dark:text-white/70 leading-snug">
              {strategy.tagline}
            </p>
            
            {/* Active indicator */}
            {isActive && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: `linear-gradient(90deg, ${strategy.gradientFrom}, ${strategy.gradientTo})` }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

interface StrategyPromptProps {
  title?: string
  subtitle?: string
}

/**
 * StrategyPrompt - Header section above the strategy grid
 */
export function StrategyPrompt({ 
  title = '6 Ways to Profit',
  subtitle = 'Select each strategy to view IQ\'s custom-calculated breakdown for this property.'
}: StrategyPromptProps) {
  return (
    <div className="text-center mb-6 mt-2">
      <div className="inline-flex items-center gap-2 bg-[#0891b2]/10 dark:bg-[#4dd0e1]/10 px-4 py-1.5 rounded-full mb-3">
        <span className="w-2 h-2 rounded-full bg-[#0891b2] dark:bg-[#4dd0e1] animate-pulse" />
        <span className="text-xs font-semibold text-[#0891b2] dark:text-[#4dd0e1] uppercase tracking-wider">
          Analysis Complete
        </span>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-base text-gray-600 dark:text-white/70 leading-relaxed max-w-sm mx-auto">
        {subtitle}
      </p>
    </div>
  )
}
