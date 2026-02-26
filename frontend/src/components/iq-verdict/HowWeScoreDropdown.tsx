'use client'

/**
 * HowWeScoreDropdown Component
 * 
 * Collapsible section explaining the scoring methodology.
 * 
 * Design system: Dark fintech — true black base, deep navy cards,
 * Inter typography, four-tier Slate text hierarchy, semantic accent colors.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

// =============================================================================
// DESIGN TOKENS — Dark Fintech System
// =============================================================================
const T = {
  base: '#000000',
  card: '#0C1220',
  border: 'rgba(255,255,255,0.07)',
  heading: '#F1F5F9',
  body: '#CBD5E1',
  secondary: '#94A3B8',
  label: '#64748B',
  blue: '#38bdf8',
  teal: '#0EA5E9',
}

const SCORING_FACTORS = [
  {
    label: 'Deal Gap',
    weight: '50%',
    description: 'Distance between asking price and your target buy price. Smaller gaps score higher.',
  },
  {
    label: 'Motivation',
    weight: '30%',
    description: 'Seller signals like days on market, price drops, and distressed sale indicators.',
  },
  {
    label: 'Market Conditions',
    weight: '10%',
    description: 'Buyer vs seller market dynamics affecting negotiation leverage.',
  },
  {
    label: 'Returns Profile',
    weight: '10%',
    description: 'Cap rate, cash-on-cash, and other return metrics at target price.',
  },
]

interface HowWeScoreDropdownProps {
  isExpanded?: boolean
  onToggle?: () => void
}

export function HowWeScoreDropdown({ 
  isExpanded: controlledExpanded, 
  onToggle 
}: HowWeScoreDropdownProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(!internalExpanded)
    }
  }

  return (
    <div style={{ backgroundColor: T.base, borderBottom: `1px solid ${T.border}` }}>
      <button 
        className="w-full flex items-center justify-between py-4 px-6 bg-transparent border-none cursor-pointer text-left"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4" style={{ color: T.teal }} />
          <span className="text-[13px] font-semibold" style={{ color: T.secondary }}>How We Score</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color: T.label }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: T.label }} />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {SCORING_FACTORS.map((factor) => (
              <div
                key={factor.label}
                className="rounded-xl p-3.5"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.blue }}>
                    {factor.label}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: T.label, fontVariantNumeric: 'tabular-nums' }}>
                    {factor.weight}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
          
          <p className="text-[11px] text-center pt-1" style={{ color: T.label }}>
            Score updated in real-time based on your financing terms
          </p>
        </div>
      )}
    </div>
  )
}

export default HowWeScoreDropdown
