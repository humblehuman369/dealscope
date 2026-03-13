'use client'

import React from 'react'
import { 
  Home, 
  Palmtree, 
  RefreshCw, 
  Hammer, 
  Users, 
  FileSignature,
  TrendingUp
} from 'lucide-react'
import { StrategyId } from './types'

interface Strategy {
  id: StrategyId
  number: number
  name: string
  tagline: string
  statValue: string
  statLabel: string
  color: string
  iconBg: string
  icon: React.ElementType
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr',
    number: 1,
    name: 'Long-Term Rental', 
    tagline: 'Steady income & build equity',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: 'var(--strategy-ltr)',
    iconBg: 'var(--color-sky-dim)',
    icon: Home
  },
  { 
    id: 'str',
    number: 2,
    name: 'Short-Term Rental', 
    tagline: 'Vacation & business rental income',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: 'var(--strategy-str)',
    iconBg: 'var(--surface-elevated)',
    icon: Palmtree
  },
  { 
    id: 'brrrr',
    number: 3,
    name: 'BRRRR', 
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    statValue: '∞',
    statLabel: 'Scale',
    color: 'var(--strategy-brrrr)',
    iconBg: 'var(--color-gold-dim)',
    icon: RefreshCw
  },
  { 
    id: 'flip',
    number: 4,
    name: 'Fix & Flip', 
    tagline: 'Buy low, fix up, sell high',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: 'var(--strategy-flip)',
    iconBg: 'var(--surface-elevated)',
    icon: Hammer
  },
  { 
    id: 'house_hack',
    number: 5,
    name: 'House Hack', 
    tagline: 'Cut your housing costs up to 100%',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: 'var(--strategy-house-hack)',
    iconBg: 'var(--color-teal-dim)',
    icon: Users
  },
  { 
    id: 'wholesale',
    number: 6,
    name: 'Wholesale', 
    tagline: 'Find deals, assign contracts, profit',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: 'var(--strategy-wholesale)',
    iconBg: 'var(--color-green-dim)',
    icon: FileSignature
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - Premium 2x3 grid of strategy cards
 * 
 * World-class design with:
 * - Numbered cards for clear identification
 * - Strategy-specific colors and icons
 * - Key metrics prominently displayed
 * - Smooth hover effects
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="strategy-grid-premium">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        const Icon = strategy.icon
        const isScale = strategy.statValue === '∞'
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`strategy-card-premium ${isActive ? 'active' : ''}`}
            style={{
              '--strategy-color': strategy.color,
              '--strategy-glow': 'var(--shadow-card)',
            } as React.CSSProperties}
          >
            {/* Number Badge */}
            <div className="strategy-number-premium">
              {strategy.number}
            </div>
            
            {/* Stat Value */}
            <div className="strategy-stat-premium">
              {isScale ? (
                <TrendingUp className="w-6 h-6" style={{ color: strategy.color }} />
              ) : (
                <span className="strategy-stat-value-premium" style={{ color: strategy.color }}>
                  {strategy.statValue}
                </span>
              )}
              <span className="strategy-stat-label-premium">{strategy.statLabel}</span>
            </div>
            
            {/* Strategy Name with Icon */}
            <div className="strategy-title-premium">
              <span className="strategy-name-premium" style={{ color: strategy.color }}>
                {strategy.name}
              </span>
              <div className="strategy-icon-premium" style={{ backgroundColor: strategy.iconBg }}>
                <Icon className="w-4 h-4" style={{ color: strategy.color }} />
              </div>
            </div>
            
            {/* Tagline */}
            <p className="strategy-tagline-premium">{strategy.tagline}</p>
            
            {/* Accent line */}
            <div className="strategy-accent-premium" style={{ backgroundColor: strategy.color }} />
          </button>
        )
      })}
    </div>
  )
}

/**
 * StrategyPrompt - Clean header with IQ branding
 */
export function StrategyPrompt() {
  return (
    <div className="strategy-prompt-premium">
      {/* Badge */}
      <div className="strategy-badge-premium">
        <span className="strategy-badge-dot" />
        <span>6 Strategies Analyzed</span>
      </div>
      
      {/* Title */}
      <h2 className="strategy-title-main">
        One Property, Multiple Opportunities
      </h2>
      
      {/* Subtitle */}
      <p className="strategy-subtitle-main">
        IQ analyzed your property and built 6 investment strategies, 
        each showing a different way to profit.
      </p>
    </div>
  )
}
