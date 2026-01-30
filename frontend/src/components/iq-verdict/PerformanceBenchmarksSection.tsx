'use client'

/**
 * PerformanceBenchmarksSection Component
 * 
 * Displays national benchmark comparisons with visual spectrum bars.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

interface BenchmarkRange {
  low: number
  avg: number
  high: number
  unit: string
  higherIsBetter: boolean
  format?: (v: number) => string
}

interface BenchmarkMetric {
  key: string
  label: string
  value: number
  displayValue: string
  range: BenchmarkRange
}

interface PerformanceBenchmarksSectionProps {
  metrics: BenchmarkMetric[]
  defaultExpanded?: boolean
}

// Calculate position on the gradient benchmark bar (0-100%)
function getRangePosition(value: number, range: BenchmarkRange): { position: number; segment: 'low' | 'avg' | 'high' } {
  const { low, avg, high, higherIsBetter } = range
  
  let segment: 'low' | 'avg' | 'high'
  let position: number
  
  if (higherIsBetter) {
    if (value <= low) {
      segment = 'low'
      position = 15
    } else if (value >= high) {
      segment = 'high'
      position = 85
    } else if (value < avg) {
      const t = (value - low) / (avg - low)
      segment = t < 0.5 ? 'low' : 'avg'
      position = 15 + t * 35
    } else {
      const t = (value - avg) / (high - avg)
      segment = t > 0.5 ? 'high' : 'avg'
      position = 50 + t * 35
    }
  } else {
    if (value <= low) {
      segment = 'high'
      position = 85
    } else if (value >= high) {
      segment = 'low'
      position = 15
    } else if (value < avg) {
      const t = (value - low) / (avg - low)
      segment = t < 0.5 ? 'high' : 'avg'
      position = 85 - t * 35
    } else {
      const t = (value - avg) / (high - avg)
      segment = t > 0.5 ? 'low' : 'avg'
      position = 50 - t * 35
    }
  }
  
  return { position, segment }
}

interface BenchmarkBarProps {
  metric: BenchmarkMetric
}

function BenchmarkBar({ metric }: BenchmarkBarProps) {
  const { range } = metric
  const formatValue = range.format || ((v: number) => v.toString())
  const rangePos = getRangePosition(metric.value, range)
  
  return (
    <div className="mb-5 last:mb-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#334155]">{metric.label}</span>
        <span className="text-base font-bold text-[#0A1628] tabular-nums">{metric.displayValue}</span>
      </div>
      
      {/* Gradient bar container */}
      <div className="bg-[#F8FAFC] rounded-xl p-3 px-4 border border-[#E2E8F0]">
        {/* Gradient bar with bullet marker */}
        <div 
          className="relative h-3.5 rounded-full"
          style={{ 
            background: 'linear-gradient(to right, #1E293B 0%, #334155 20%, #475569 40%, #0E7490 60%, #0891B2 75%, #06B6D4 90%, #00D4FF 100%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Bullet marker */}
          <div 
            className="absolute top-1/2 w-5 h-5 rounded-full bg-[#0A1628] border-[3px] border-white"
            style={{ 
              left: `${rangePos.position}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          />
        </div>
        
        {/* Labels below bar */}
        <div className="flex justify-between mt-2">
          <div className="text-left">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Low</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.low)}{range.unit}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Avg</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.avg)}{range.unit}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">High</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.high)}{range.unit}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PerformanceBenchmarksSection({ 
  metrics,
  defaultExpanded = true 
}: PerformanceBenchmarksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="bg-white border-b border-[#E2E8F0] overflow-hidden">
      {/* Header */}
      <button 
        className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00D4FF" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-[#0A1628]">Performance Benchmarks</span>
            <span className="text-xs text-[#94A3B8]">vs National Averages</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-1 bg-transparent border-none cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setShowHelp(!showHelp)
            }}
          >
            <HelpCircle className="w-4 h-4 text-[#94A3B8] hover:text-[#0891B2]" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#94A3B8]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
          )}
        </div>
      </button>

      {/* Help Dropdown */}
      {showHelp && (
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-b border-[#E2E8F0]">
          <p className="text-xs text-[#64748B] leading-relaxed">
            These benchmarks compare your deal to national averages for real estate investments. 
            The marker shows where your metrics fall on the spectrum from Low to High.
            For most metrics, higher is better. For expense-related metrics, lower is better.
          </p>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2">
          {metrics.map((metric) => (
            <BenchmarkBar key={metric.key} metric={metric} />
          ))}
        </div>
      )}
    </div>
  )
}

// Export default benchmark ranges
export const NATIONAL_RANGES: Record<string, BenchmarkRange> = {
  capRate: { low: 4.0, avg: 5.5, high: 7.0, unit: '%', higherIsBetter: true },
  cashOnCash: { low: 5.0, avg: 8.5, high: 12.0, unit: '%', higherIsBetter: true },
  equityCapture: { low: 2.0, avg: 5.0, high: 8.0, unit: '%', higherIsBetter: true },
  dscr: { low: 1.00, avg: 1.25, high: 1.50, unit: '', higherIsBetter: true, format: (v) => v.toFixed(2) },
  cashFlowYield: { low: 2.0, avg: 5.0, high: 8.0, unit: '%', higherIsBetter: true },
  expenseRatio: { low: 20, avg: 35, high: 50, unit: '%', higherIsBetter: false },
  breakevenOcc: { low: 60, avg: 80, high: 100, unit: '%', higherIsBetter: false },
}

export default PerformanceBenchmarksSection
