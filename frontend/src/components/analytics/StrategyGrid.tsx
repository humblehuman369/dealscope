'use client'

import React from 'react'
import { StrategyId } from './types'

interface Strategy {
  id: StrategyId
  number: number
  name: string
  tagline: string
  color: string
  lightColor: string
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr',
    number: 1,
    name: 'Long-Term Rental', 
    tagline: 'Steady monthly cash flow',
    color: '#0465f2',
    lightColor: 'rgba(4, 101, 242, 0.15)'
  },
  { 
    id: 'str',
    number: 2,
    name: 'Short-Term Rental', 
    tagline: 'Vacation rental income',
    color: '#8b5cf6',
    lightColor: 'rgba(139, 92, 246, 0.15)'
  },
  { 
    id: 'brrrr',
    number: 3,
    name: 'BRRRR', 
    tagline: 'Infinite scaling potential',
    color: '#f97316',
    lightColor: 'rgba(249, 115, 22, 0.15)'
  },
  { 
    id: 'flip',
    number: 4,
    name: 'Fix & Flip', 
    tagline: 'Quick profit opportunity',
    color: '#ec4899',
    lightColor: 'rgba(236, 72, 153, 0.15)'
  },
  { 
    id: 'house_hack',
    number: 5,
    name: 'House Hack', 
    tagline: 'Live free, build wealth',
    color: '#14b8a6',
    lightColor: 'rgba(20, 184, 166, 0.15)'
  },
  { 
    id: 'wholesale',
    number: 6,
    name: 'Wholesale', 
    tagline: 'Zero capital required',
    color: '#84cc16',
    lightColor: 'rgba(132, 204, 22, 0.15)'
  },
]

interface StrategyGridProps {
  activeStrategy: StrategyId | null
  onSelectStrategy: (id: StrategyId) => void
}

/**
 * StrategyGrid - Fresh design with large numbers as focal points
 */
export function StrategyGrid({ activeStrategy, onSelectStrategy }: StrategyGridProps) {
  return (
    <div className="iq-strategy-grid">
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`iq-strategy-box ${isActive ? 'active' : ''}`}
            style={{
              '--strategy-color': strategy.color,
              '--strategy-light': strategy.lightColor,
            } as React.CSSProperties}
          >
            {/* Large number */}
            <div className="iq-strategy-number">
              {strategy.number}
            </div>
            
            {/* Strategy info */}
            <div className="iq-strategy-info">
              <h3 className="iq-strategy-name">{strategy.name}</h3>
              <p className="iq-strategy-tagline">{strategy.tagline}</p>
            </div>
            
            {/* Hover glow effect */}
            <div className="iq-strategy-glow" />
          </button>
        )
      })}
    </div>
  )
}

/**
 * StrategyPrompt - Personal message from IQ
 */
export function StrategyPrompt() {
  return (
    <div className="iq-strategy-prompt">
      {/* IQ Avatar */}
      <div className="iq-prompt-avatar">
        <img 
          src="/images/iq-brain-dark.png" 
          alt="IQ" 
          className="iq-prompt-icon"
        />
      </div>
      
      {/* Personal message */}
      <div className="iq-prompt-message">
        <p className="iq-prompt-greeting">
          Hey, I'm <span className="iq-highlight">IQ</span> — your real estate analyst.
        </p>
        <p className="iq-prompt-text">
          I've analyzed your property and created <span className="iq-highlight">6 investment strategies</span>, 
          each showing a different path to profit. Tap any strategy to see the full breakdown.
        </p>
      </div>
    </div>
  )
}
