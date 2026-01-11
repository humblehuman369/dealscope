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
  number: number
  name: string
  personalizedTitle: string
  tagline: string
  color: string
  borderColor: string
  icon: React.ElementType
  statValue: string
  statLabel: string
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr', 
    number: 1,
    name: 'Long-Term Rental', 
    personalizedTitle: "IQ's Long-Term Rental profit strategy for your property",
    tagline: 'Steady income & build equity',
    color: '#0465f2',
    borderColor: 'rgba(4, 101, 242, 0.3)',
    icon: Home,
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash'
  },
  { 
    id: 'str', 
    number: 2,
    name: 'Short-Term Rental', 
    personalizedTitle: "IQ's Short-Term Rental income strategy for your property",
    tagline: 'Vacation & business rental income',
    color: '#8b5cf6',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    icon: Palmtree,
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash'
  },
  { 
    id: 'brrrr', 
    number: 3,
    name: 'BRRRR', 
    personalizedTitle: "IQ's BRRRR wealth-building strategy for your property",
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    color: '#f97316',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    icon: RefreshCw,
    statValue: '∞',
    statLabel: 'Scale'
  },
  { 
    id: 'flip', 
    number: 4,
    name: 'Fix & Flip', 
    personalizedTitle: "IQ's Fix & Flip profit strategy for your property",
    tagline: 'Buy low, fix up, sell high',
    color: '#ec4899',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    icon: Hammer,
    statValue: '$50K+',
    statLabel: 'Profit'
  },
  { 
    id: 'house_hack', 
    number: 5,
    name: 'House Hack', 
    personalizedTitle: "IQ's House Hack savings strategy for your property",
    tagline: 'Cut your housing costs up to 100%',
    color: '#14b8a6',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    icon: Users,
    statValue: '75%',
    statLabel: 'Cost Savings'
  },
  { 
    id: 'wholesale', 
    number: 6,
    name: 'Wholesale', 
    personalizedTitle: "IQ's Wholesale deal strategy for your property",
    tagline: 'Find deals, assign contracts, profit',
    color: '#84cc16',
    borderColor: 'rgba(132, 204, 22, 0.3)',
    icon: FileSignature,
    statValue: '$10K+',
    statLabel: 'Per Deal'
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - 2x3 grid of strategy selection boxes
 * Matches homepage styling with numbered strategies and personalized titles
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="strategy-grid-analytics">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        const Icon = strategy.icon
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`strategy-card-analytics ${isActive ? 'active' : ''}`}
            style={{
              '--strategy-color': strategy.color,
              '--strategy-border': strategy.borderColor,
            } as React.CSSProperties}
          >
            {/* Color accent bar on left */}
            <div 
              className="strategy-accent-bar"
              style={{ backgroundColor: strategy.color }}
            />
            
            {/* Header with number and stat */}
            <div className="strategy-card-header">
              <div className="strategy-number-badge" style={{ backgroundColor: `${strategy.color}20`, color: strategy.color }}>
                {strategy.number}
              </div>
              <div className="strategy-stat">
                <div className="strategy-stat-value" style={{ color: strategy.color }}>
                  {strategy.statValue}
                </div>
                <div className="strategy-stat-label">
                  {strategy.statLabel}
                </div>
              </div>
            </div>
            
            {/* Strategy name and icon */}
            <div className="strategy-title-row">
              <h3 className="strategy-name" style={{ color: strategy.color }}>
                {strategy.name}
              </h3>
              <div className="strategy-icon" style={{ backgroundColor: `${strategy.color}15` }}>
                <Icon size={18} style={{ color: strategy.color }} />
              </div>
            </div>
            
            {/* Personalized tagline */}
            <p className="strategy-tagline">
              {strategy.tagline}
            </p>
            
            {/* Active indicator */}
            {isActive && (
              <div className="strategy-active-indicator" style={{ backgroundColor: strategy.color }} />
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
 * Styled to match homepage section headers
 */
export function StrategyPrompt({ 
  title = 'One Property, Multiple Opportunities',
  subtitle = 'IQ analyzed your property and built 6 investment strategies, each showing a different way to profit.'
}: StrategyPromptProps) {
  return (
    <div className="strategy-prompt">
      <div className="strategy-prompt-badge">
        <span className="strategy-prompt-dot" />
        <span className="strategy-prompt-label">6 Strategies Analyzed</span>
      </div>
      <h2 className="strategy-prompt-title">
        {title}
      </h2>
      <p className="strategy-prompt-subtitle">
        {subtitle}
      </p>
    </div>
  )
}
