'use client'

/**
 * PerformanceBenchmarksSection Component
 * 
 * Displays national benchmark comparisons with visual spectrum bars.
 * Matches the VerdictIQ-Combined-pages.html design.
 */

import React, { useState } from 'react'
import { ChevronDown, ArrowRight, Plus, ArrowLeft, ArrowRightIcon, RefreshCw } from 'lucide-react'

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
  category: 'returns' | 'cashflow'
}

interface PerformanceBenchmarksSectionProps {
  metrics: BenchmarkMetric[]
  onNavigateToDealMaker?: () => void
  defaultExpanded?: boolean
}

// Calculate position on the gradient benchmark bar (0-100%)
// 50% = national average (center line)
function getPosition(value: number, range: BenchmarkRange): number {
  const { low, avg, high, higherIsBetter } = range
  
  let position: number
  
  if (higherIsBetter) {
    // Higher is better: low values on left, high on right
    if (value <= low) {
      position = 10
    } else if (value >= high) {
      position = 90
    } else if (value < avg) {
      // Between low and avg: maps to 10-50%
      const t = (value - low) / (avg - low)
      position = 10 + t * 40
    } else {
      // Between avg and high: maps to 50-90%
      const t = (value - avg) / (high - avg)
      position = 50 + t * 40
    }
  } else {
    // Lower is better (Expense Ratio, Breakeven Occ): inverted
    // Low values = good = right side
    if (value <= low) {
      position = 90
    } else if (value >= high) {
      position = 10
    } else if (value < avg) {
      // Below average = good = right side
      const t = (avg - value) / (avg - low)
      position = 50 + t * 40
    } else {
      // Above average = bad = left side
      const t = (value - avg) / (high - avg)
      position = 50 - t * 40
    }
  }
  
  return Math.max(5, Math.min(95, position))
}

// Benchmark Row Component - Inline layout with value above marker
function BenchmarkRow({ metric }: { metric: BenchmarkMetric }) {
  const position = getPosition(metric.value, metric.range)
  
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-b-0 last:pb-0">
      <div className="w-[95px] flex-shrink-0">
        <div className="text-xs font-medium text-[#334155] leading-tight">{metric.label}</div>
      </div>
      <div className="flex-1 relative pt-5">
        {/* Value label above marker */}
        <span 
          className="absolute top-0 text-[11px] font-bold text-[#0891B2] whitespace-nowrap"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          {metric.displayValue}
        </span>
        {/* Gradient bar */}
        <div 
          className="relative h-2 rounded"
          style={{ 
            background: 'linear-gradient(to right, #1E293B 0%, #334155 20%, #475569 40%, #0E7490 60%, #0891B2 75%, #06B6D4 90%, #00D4FF 100%)'
          }}
        >
          {/* Center line (national average) */}
          <div 
            className="absolute top-[-2px] bottom-[-2px] left-1/2 -translate-x-1/2 w-0.5 bg-white"
            style={{ boxShadow: '0 0 2px rgba(0,0,0,0.3)' }}
          />
          {/* Marker */}
          <div 
            className="absolute top-1/2 w-3 h-3 rounded-full bg-[#0A1628] border-2 border-white"
            style={{ 
              left: `${position}%`, 
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Help Point Component
function HelpPoint({ icon, title, desc }: { icon: 'plus' | 'left' | 'right' | 'swap'; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5 mb-3 last:mb-0">
      <div className="w-7 h-7 bg-[#F0FDFA] rounded-md flex items-center justify-center flex-shrink-0">
        {icon === 'plus' && <Plus className="w-3.5 h-3.5 text-[#0891B2]" />}
        {icon === 'left' && <ArrowLeft className="w-3.5 h-3.5 text-[#0891B2]" />}
        {icon === 'right' && <ArrowRightIcon className="w-3.5 h-3.5 text-[#0891B2]" />}
        {icon === 'swap' && <RefreshCw className="w-3.5 h-3.5 text-[#0891B2]" />}
      </div>
      <div className="flex-1">
        <div className="text-xs font-semibold text-[#0A1628] mb-0.5">{title}</div>
        <div className="text-[11px] text-[#64748B] leading-relaxed">{desc}</div>
      </div>
    </div>
  )
}

// Help Metric Row Component
function HelpMetricRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0] last:border-b-0 text-xs">
      <span className="text-[#475569]">{name}</span>
      <span className="text-[#0891B2] font-semibold">{value}</span>
    </div>
  )
}

// How to Read Dropdown Component
function HowToReadDropdown() {
  return (
    <div className="bg-white py-5 px-6 border-b border-[#E2E8F0]">
      {/* How It Works */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-[#0891B2] uppercase tracking-wide mb-2.5">How It Works</div>
        <p className="text-[13px] text-[#475569] leading-relaxed">
          Each benchmark compares this property to the <strong className="text-[#0A1628]">national average</strong>. 
          The <strong className="text-[#0A1628]">center of the bar</strong> represents average performance. 
          Markers to the <strong className="text-[#0A1628]">left</strong> mean below average, 
          markers to the <strong className="text-[#0A1628]">right</strong> mean above average.
        </p>
      </div>

      {/* The Performance Scale */}
      <div className="mb-5">
        <div className="bg-[#F8FAFC] rounded-lg p-3.5 mt-3">
          <div className="text-[13px] font-semibold text-[#0A1628] mb-3">The Performance Scale</div>
          <div className="relative pt-5 mb-2">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#0891B2] uppercase tracking-wide">
              National Avg
            </span>
            <div 
              className="h-2.5 rounded-md relative"
              style={{ 
                background: 'linear-gradient(to right, #1E293B 0%, #334155 20%, #475569 40%, #0E7490 60%, #0891B2 75%, #06B6D4 90%, #00D4FF 100%)'
              }}
            >
              <div 
                className="absolute top-[-2px] bottom-[-2px] left-1/2 -translate-x-1/2 w-0.5 bg-white"
                style={{ boxShadow: '0 0 2px rgba(0,0,0,0.3)' }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-semibold">
            <span className="text-[#64748B]">Below</span>
            <span className="text-[#64748B]">Average</span>
            <span className="text-[#0891B2]">Above</span>
          </div>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="mb-5">
        <div className="text-[11px] font-bold text-[#0891B2] uppercase tracking-wide mb-2.5">Quick Guide</div>
        <HelpPoint 
          icon="plus" 
          title="Center = National Average" 
          desc="The white line marks the national average for each metric." 
        />
        <HelpPoint 
          icon="left" 
          title="Left = Below Average" 
          desc="Markers to the left of center mean this deal under-performs." 
        />
        <HelpPoint 
          icon="right" 
          title="Right = Above Average" 
          desc="Markers to the right of center mean this deal out-performs." 
        />
        <HelpPoint 
          icon="swap" 
          title="Some Metrics Are Inverted" 
          desc="For Expense Ratio and Breakeven Occupancy, lower is better." 
        />
      </div>

      {/* National Averages */}
      <div>
        <div className="text-[11px] font-bold text-[#0891B2] uppercase tracking-wide mb-2.5">National Averages</div>
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <HelpMetricRow name="Cash on Cash Return" value="5%" />
          <HelpMetricRow name="Cap Rate" value="6%" />
          <HelpMetricRow name="Debt Service Coverage" value="1.25" />
          <HelpMetricRow name="Expense Ratio" value="35%" />
          <HelpMetricRow name="Breakeven Occupancy" value="80%" />
        </div>
      </div>
    </div>
  )
}

// Legend Bar Intro Section
function BenchmarkIntro() {
  return (
    <div className="py-4 px-6 bg-[#F8FAFC] border-b border-[#E2E8F0]">
      <div className="text-[13px] font-semibold text-[#0A1628] mb-1">
        How This Deal Compares to National Average
      </div>
      <div className="text-xs text-[#64748B] leading-relaxed mb-3.5">
        The center represents the national average. Markers to the left are below average, 
        markers to the right are above average.
      </div>
      
      {/* Full-width legend bar */}
      <div className="relative pt-5">
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#0891B2] uppercase tracking-wide whitespace-nowrap">
          National Avg
        </span>
        <div 
          className="h-2.5 rounded-md relative"
          style={{ 
            background: 'linear-gradient(to right, #1E293B 0%, #334155 20%, #475569 40%, #0E7490 60%, #0891B2 75%, #06B6D4 90%, #00D4FF 100%)'
          }}
        >
          <div 
            className="absolute top-[-3px] bottom-[-3px] left-1/2 -translate-x-1/2 w-[3px] bg-white rounded-sm"
            style={{ boxShadow: '0 0 3px rgba(0,0,0,0.3)' }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-[#64748B]">Below</span>
          <span className="text-[#64748B]">Average</span>
          <span className="text-[#0891B2]">Above</span>
        </div>
      </div>
    </div>
  )
}

// CTA Section
function CTASection({ onNavigateToDealMaker }: { onNavigateToDealMaker?: () => void }) {
  return (
    <div 
      className="relative rounded-xl p-5 mx-6 mt-5 border border-[#0891B2]"
      style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #E0F7FA 100%)' }}
    >
      <span className="absolute -top-2.5 left-4 bg-[#0891B2] text-white text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded">
        Take Action
      </span>
      <div className="text-sm text-[#0A1628] mb-3.5 leading-relaxed">
        Want to <strong className="text-[#0891B2]">improve this deal</strong>? 
        Adjust pricing, financing, and strategy to push these metrics above average.
      </div>
      <button 
        onClick={onNavigateToDealMaker}
        className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white py-3.5 rounded-[10px] text-sm font-semibold cursor-pointer border-none hover:bg-[#0E7490] transition-colors"
      >
        Go to Deal Maker IQ
        <ArrowRight className="w-[18px] h-[18px]" />
      </button>
    </div>
  )
}

export function PerformanceBenchmarksSection({ 
  metrics,
  onNavigateToDealMaker,
  defaultExpanded = true 
}: PerformanceBenchmarksSectionProps) {
  const [showHelp, setShowHelp] = useState(false)

  // Group metrics by category
  const returnsMetrics = metrics.filter(m => m.category === 'returns')
  const cashflowMetrics = metrics.filter(m => m.category === 'cashflow')

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-[#F1F5F9]">
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
            <span className="text-xs text-[#94A3B8]">How this deal compares</span>
          </div>
        </div>
        <button 
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border-none transition-colors ${
            showHelp 
              ? 'bg-[#F0FDFA] text-[#0891B2]' 
              : 'bg-transparent text-[#0891B2] hover:bg-[#F8FAFC]'
          }`}
          onClick={() => setShowHelp(!showHelp)}
        >
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} 
          />
          How to read
        </button>
      </div>

      {/* How to Read Dropdown */}
      {showHelp && <HowToReadDropdown />}

      {/* Benchmark Intro with Legend */}
      <BenchmarkIntro />

      {/* Benchmarks Container */}
      <div className="py-4 px-6 pb-5">
        {/* Returns Category */}
        {returnsMetrics.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide text-center py-2 bg-[#F8FAFC] rounded-md mb-2">
              Returns
            </div>
            {returnsMetrics.map((metric) => (
              <BenchmarkRow key={metric.key} metric={metric} />
            ))}
          </>
        )}

        {/* Cash Flow & Risk Category */}
        {cashflowMetrics.length > 0 && (
          <>
            <div className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wide text-center py-2 bg-[#F8FAFC] rounded-md mt-4 mb-2">
              Cash Flow & Risk
            </div>
            {cashflowMetrics.map((metric) => (
              <BenchmarkRow key={metric.key} metric={metric} />
            ))}
          </>
        )}

        {/* CTA Section */}
        <CTASection onNavigateToDealMaker={onNavigateToDealMaker} />
      </div>
    </div>
  )
}

// Export default benchmark ranges
export const NATIONAL_RANGES: Record<string, BenchmarkRange> = {
  capRate: { low: 4.0, avg: 5.5, high: 7.0, unit: '%', higherIsBetter: true },
  cashOnCash: { low: 5.0, avg: 8.5, high: 12.0, unit: '%', higherIsBetter: true },
  totalRoi: { low: 30, avg: 50, high: 70, unit: '%', higherIsBetter: true },
  cashFlowYield: { low: 2.0, avg: 5.0, high: 8.0, unit: '%', higherIsBetter: true },
  dscr: { low: 1.00, avg: 1.25, high: 1.50, unit: '', higherIsBetter: true, format: (v) => v.toFixed(2) },
  expenseRatio: { low: 20, avg: 35, high: 50, unit: '%', higherIsBetter: false },
  breakevenOcc: { low: 60, avg: 80, high: 100, unit: '%', higherIsBetter: false },
}

export default PerformanceBenchmarksSection
