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
  defaultExpanded = false 
}: AtAGlanceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white border-b border-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <button 
        className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-[#0A1628]">At-a-Glance</span>
          <span className="text-xs text-[#94A3B8]">Performance breakdown</span>
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
