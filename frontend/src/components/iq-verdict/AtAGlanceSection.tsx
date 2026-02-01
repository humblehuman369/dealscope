'use client'

/**
 * AtAGlanceSection Component
 * 
 * Displays performance breakdown bars for key metrics.
 */

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface PerformanceBar {
  label: string
  value: number
  tooltip?: string
}

interface AtAGlanceSectionProps {
  bars: PerformanceBar[]
  compositeScore?: number
  defaultExpanded?: boolean
}

function getBarColor(value: number): string {
  if (value >= 70) return 'linear-gradient(90deg, #0891B2, #06B6D4)'
  if (value >= 40) return 'linear-gradient(90deg, #D97706, #F59E0B)'
  return 'linear-gradient(90deg, #DC2626, #EF4444)'
}

export function AtAGlanceSection({ 
  bars, 
  compositeScore,
  defaultExpanded = true 
}: AtAGlanceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white border-b border-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <button 
        className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00D4FF" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-[#0A1628]">At-a-Glance</span>
            <span className="text-xs text-[#94A3B8]">Performance breakdown</span>
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1">
          {bars.map((bar, idx) => (
            <div key={idx} className="flex items-center mb-3 last:mb-0">
              <span className="text-sm text-[#475569] min-w-[100px]">{bar.label}</span>
              <div className="flex-1 mx-4 h-2 bg-[#E2E8F0] rounded overflow-hidden">
                <div 
                  className="h-full rounded transition-all duration-300"
                  style={{ 
                    width: `${Math.max(0, Math.min(100, bar.value))}%`, 
                    background: getBarColor(bar.value)
                  }} 
                />
              </div>
              <span className="text-sm font-bold text-[#0A1628] tabular-nums min-w-[45px] text-right">
                {Math.round(bar.value)}%
              </span>
            </div>
          ))}
          
          {compositeScore !== undefined && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <p className="text-[13px] text-[#64748B]">
                <span className="font-semibold text-[#0A1628]">Composite:</span> {compositeScore}% score across returns and risk protection.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AtAGlanceSection
