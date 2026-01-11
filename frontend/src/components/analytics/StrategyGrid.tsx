'use client'

import React from 'react'
import { StrategyId } from './types'

interface Strategy {
  id: StrategyId
  number: number
  name: string
  tagline: string
  description: string
  statValue: string
  statLabel: string
  color: string
  cssClass: string
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr',
    number: 1,
    name: 'Long-Term Rental', 
    tagline: 'Steady income & build equity',
    description: 'Buy and hold properties for consistent monthly rental income. Build long-term wealth through appreciation and mortgage paydown.',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: '#0465f2',
    cssClass: 'long'
  },
  { 
    id: 'str',
    number: 2,
    name: 'Short-Term Rental', 
    tagline: 'Vacation & business rental income',
    description: 'Maximize income through Airbnb or VRBO rentals. Higher returns with more active management and seasonal demand.',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: '#8b5cf6',
    cssClass: 'short'
  },
  { 
    id: 'brrrr',
    number: 3,
    name: 'BRRRR', 
    tagline: 'Buy-Rehab-Rent-Refi-Repeat wealth builder',
    description: 'Buy distressed property, renovate, rent, refinance to pull out capital, then repeat. Build a portfolio with the same initial investment.',
    statValue: '∞',
    statLabel: 'Scale',
    color: '#f97316',
    cssClass: 'brrrr'
  },
  { 
    id: 'flip',
    number: 4,
    name: 'Fix & Flip', 
    tagline: 'Buy low, fix up, sell high',
    description: 'Purchase undervalued properties, renovate strategically, and sell for profit. Quick returns with active project management.',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
    cssClass: 'flip'
  },
  { 
    id: 'house_hack',
    number: 5,
    name: 'House Hack', 
    tagline: 'Cut your housing costs up to 100%',
    description: 'Live in one unit while renting others. Eliminate your housing payment and start building wealth from day one.',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: '#14b8a6',
    cssClass: 'hack'
  },
  { 
    id: 'wholesale',
    number: 6,
    name: 'Wholesale', 
    tagline: 'Find deals, assign contracts, profit',
    description: 'Find properties under market value, get them under contract, then assign to other investors for a fee. Zero capital required.',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: '#84cc16',
    cssClass: 'wholesale'
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - Matches homepage strategy cards styling exactly
 * 6 strategy cards in a responsive grid with numbers 1-6
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="analytics-strategy-grid">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        const isScale = strategy.statValue === '∞'
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`analytics-strategy-card ${strategy.cssClass} ${isActive ? 'active' : ''}`}
          >
            {/* Left color bar */}
            <div className="analytics-strategy-bar" style={{ background: strategy.color }} />
            
            {/* Card header with number, name, and stat */}
            <div className="analytics-strategy-header">
              <div className="analytics-strategy-left">
                <span className="analytics-strategy-number" style={{ color: strategy.color }}>
                  {strategy.number}
                </span>
                <span className="analytics-strategy-name">{strategy.name}</span>
              </div>
              <div className="analytics-strategy-stat">
                {isScale ? (
                  <>
                    <svg 
                      className="analytics-growth-icon" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke={strategy.color}
                      strokeWidth="2.5"
                    >
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    <div className="analytics-stat-label">{strategy.statLabel}</div>
                  </>
                ) : (
                  <>
                    <div className="analytics-stat-value" style={{ color: strategy.color }}>
                      {strategy.statValue}
                    </div>
                    <div className="analytics-stat-label">{strategy.statLabel}</div>
                  </>
                )}
              </div>
            </div>
            
            {/* Tagline */}
            <div className="analytics-strategy-tagline">{strategy.tagline}</div>
            
            {/* Description */}
            <div className="analytics-strategy-description">{strategy.description}</div>
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
 * StrategyPrompt - Header section matching homepage "6 Investment Strategies" section
 */
export function StrategyPrompt({ 
  title = 'One Property, Multiple Opportunities',
  subtitle = 'IQ analyzed your property and built 6 investment strategies, each showing a different way to profit.'
}: StrategyPromptProps) {
  return (
    <div className="analytics-strategy-prompt">
      <div className="analytics-prompt-label">6 Investment Strategies</div>
      <h2 className="analytics-prompt-title">{title}</h2>
      <p className="analytics-prompt-subtitle">{subtitle}</p>
    </div>
  )
}
