'use client'

/**
 * HowWeScoreDropdown Component
 * 
 * Collapsible section explaining the scoring methodology.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

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
    <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
      <button 
        className="w-full flex items-center justify-between p-4 px-6 bg-transparent border-none cursor-pointer text-left"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#0891B2]" />
          <span className="text-[13px] font-medium text-[#475569]">How We Score</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
              <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide mb-1">
                Deal Gap (50%)
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Distance between asking price and your target buy price. Smaller gaps score higher.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
              <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide mb-1">
                Motivation (30%)
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Seller signals like days on market, price drops, and distressed sale indicators.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
              <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide mb-1">
                Market Conditions (10%)
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Buyer vs seller market dynamics affecting negotiation leverage.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
              <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide mb-1">
                Returns Profile (10%)
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Cap rate, cash-on-cash, and other return metrics at target price.
              </p>
            </div>
          </div>
          
          <div className="text-[11px] text-[#94A3B8] text-center pt-2">
            Score updated in real-time based on your financing terms
          </div>
        </div>
      )}
    </div>
  )
}

export default HowWeScoreDropdown
