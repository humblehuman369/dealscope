'use client'

import React from 'react'
import { SpectrumBar, MiniSpectrum } from './SpectrumBar'
import { BenchmarkConfig, BenchmarkStatus } from './types'

/**
 * PerformanceBenchmarks Component
 * 
 * Container component that displays multiple benchmark metrics with spectrum bars.
 * Shows how the deal compares to national/market averages for key metrics.
 * 
 * Each benchmark includes:
 * - Metric name and current value
 * - Status badge (High/Average/Low)
 * - Visual spectrum bar with zone labels
 */

interface PerformanceBenchmarksProps {
  /** Title for the section */
  title?: string
  /** Subtitle/description */
  subtitle?: string
  /** Array of benchmark configurations */
  benchmarks: BenchmarkConfig[]
  /** Display mode */
  variant?: 'full' | 'compact'
}

export function PerformanceBenchmarks({
  title = 'Performance Benchmarks',
  subtitle = 'How this deal compares to national averages',
  benchmarks,
  variant = 'full'
}: PerformanceBenchmarksProps) {
  if (variant === 'compact') {
    return (
      <BenchmarksCompact benchmarks={benchmarks} />
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl px-2 py-3 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h4 className="text-[0.75rem] font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {title}
          </h4>
          <p className="text-[0.6rem] text-gray-500 dark:text-white/40">{subtitle}</p>
        </div>
      </div>

      {/* Benchmark Rows */}
      <div className="space-y-4">
        {benchmarks.map((benchmark) => (
          <BenchmarkRow key={benchmark.id} benchmark={benchmark} />
        ))}
      </div>
    </div>
  )
}

interface BenchmarkRowProps {
  benchmark: BenchmarkConfig
}

function BenchmarkRow({ benchmark }: BenchmarkRowProps) {
  return (
    <div className="mb-4 last:mb-0">
      {/* Header with label, value, and status */}
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-[0.72rem] font-medium text-gray-700 dark:text-white/80">
          {benchmark.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[0.85rem] font-bold text-gray-800 dark:text-white">
            {benchmark.formattedValue}
          </span>
          <StatusBadge status={benchmark.status} />
        </div>
      </div>

      {/* Spectrum Bar */}
      <SpectrumBar
        markerPosition={benchmark.markerPosition}
        status={benchmark.status}
        isInverted={benchmark.isInverted}
        zones={benchmark.zones}
      />
    </div>
  )
}

interface StatusBadgeProps {
  status: BenchmarkStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const getClasses = () => {
    switch (status) {
      case 'high':
        return 'bg-green-500/20 text-green-500'
      case 'average':
        return 'bg-yellow-500/20 text-yellow-500'
      case 'low':
        return 'bg-red-500/20 text-red-500'
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'high': return 'High'
      case 'average': return 'Avg'
      case 'low': return 'Low'
    }
  }

  return (
    <span className={`text-[0.55rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${getClasses()}`}>
      {getLabel()}
    </span>
  )
}

/**
 * BenchmarksCompact Component
 * 
 * A 2-column grid version for smaller spaces.
 */

interface BenchmarksCompactProps {
  benchmarks: BenchmarkConfig[]
}

function BenchmarksCompact({ benchmarks }: BenchmarksCompactProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {benchmarks.slice(0, 4).map((benchmark) => (
        <div 
          key={benchmark.id}
          className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-xl p-3"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[0.6rem] text-gray-500 dark:text-white/50 uppercase tracking-wide">
              {benchmark.label}
            </span>
            <StatusBadge status={benchmark.status} />
          </div>
          <div className="text-base font-bold text-gray-800 dark:text-white mb-1.5">
            {benchmark.formattedValue}
          </div>
          <MiniSpectrum
            markerPosition={benchmark.markerPosition}
            status={benchmark.status}
            isInverted={benchmark.isInverted}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Helper functions for creating benchmark configurations
 */

export function calculateBenchmarkStatus(
  value: number,
  thresholds: { low: number; high: number },
  isInverted: boolean = false
): BenchmarkStatus {
  if (isInverted) {
    // Lower is better (e.g., GRM, Vacancy)
    if (value <= thresholds.low) return 'high'
    if (value >= thresholds.high) return 'low'
    return 'average'
  } else {
    // Higher is better (e.g., CoC, Cap Rate)
    if (value >= thresholds.high) return 'high'
    if (value <= thresholds.low) return 'low'
    return 'average'
  }
}

export function calculateMarkerPosition(
  value: number,
  min: number,
  max: number,
  isInverted: boolean = false
): number {
  // Clamp value within range
  const clampedValue = Math.min(max, Math.max(min, value))
  // Calculate position as percentage
  let position = ((clampedValue - min) / (max - min)) * 100
  // Invert if needed
  if (isInverted) {
    position = 100 - position
  }
  return position
}

/**
 * Strategy-specific benchmark presets
 */

export const LTR_BENCHMARKS = {
  cashOnCash: {
    thresholds: { low: 0.05, high: 0.12 },
    range: { min: 0, max: 0.20 },
    zones: {
      low: { label: 'Low', range: '<5%' },
      average: { label: 'Average', range: '8-10%' },
      high: { label: 'High', range: '12%+' }
    }
  },
  capRate: {
    thresholds: { low: 0.04, high: 0.055 },
    range: { min: 0, max: 0.10 },
    zones: {
      low: { label: 'Low', range: '<4%' },
      average: { label: 'Average', range: '4.5-5.5%' },
      high: { label: 'High', range: '5.5%+' }
    }
  },
  dscr: {
    thresholds: { low: 1.0, high: 1.5 },
    range: { min: 0.5, max: 2.0 },
    zones: {
      low: { label: 'Low', range: '<1.0' },
      average: { label: 'Average', range: '1.2-1.5' },
      high: { label: 'High', range: '1.5+' }
    }
  },
  grm: {
    thresholds: { low: 8, high: 15 },
    range: { min: 4, max: 25 },
    isInverted: true,
    zones: {
      low: { label: 'High', range: '<8' },
      average: { label: 'Average', range: '8-12' },
      high: { label: 'Low', range: '20+' }
    }
  },
  vacancy: {
    thresholds: { low: 5, high: 10 },
    range: { min: 0, max: 20 },
    isInverted: true,
    zones: {
      low: { label: 'Good', range: '1-5%' },
      average: { label: 'Average', range: '5-8%' },
      high: { label: 'High', range: '15%+' }
    }
  },
  expenseRatio: {
    thresholds: { low: 35, high: 55 },
    range: { min: 20, max: 70 },
    isInverted: true,
    zones: {
      low: { label: 'Good', range: '<30%' },
      average: { label: 'Average', range: '45-55%' },
      high: { label: 'High', range: '60%+' }
    }
  }
}

export const STR_BENCHMARKS = {
  cashOnCash: {
    thresholds: { low: 0.08, high: 0.15 },
    range: { min: 0, max: 0.30 },
    zones: {
      low: { label: 'Low', range: '<8%' },
      average: { label: 'Average', range: '10-15%' },
      high: { label: 'High', range: '15%+' }
    }
  },
  occupancy: {
    thresholds: { low: 50, high: 80 },
    range: { min: 30, max: 95 },
    zones: {
      low: { label: 'Low', range: '<50%' },
      average: { label: 'Average', range: '65-80%' },
      high: { label: 'High', range: '85%+' }
    }
  },
  adr: {
    thresholds: { low: 100, high: 250 },
    range: { min: 50, max: 400 },
    zones: {
      low: { label: 'Low', range: '<$100' },
      average: { label: 'Average', range: '$150-250' },
      high: { label: 'High', range: '$300+' }
    }
  }
}

export const BRRRR_BENCHMARKS = {
  cashRecovery: {
    thresholds: { low: 70, high: 100 },
    range: { min: 0, max: 120 },
    zones: {
      low: { label: 'Low', range: '<70%' },
      average: { label: 'Average', range: '70-90%' },
      high: { label: 'High', range: '100%+' }
    }
  },
  purchaseToArv: {
    thresholds: { low: 65, high: 75 },
    range: { min: 40, max: 90 },
    isInverted: true,
    zones: {
      low: { label: 'Good', range: '<65%' },
      average: { label: 'Average', range: '65-75%' },
      high: { label: 'Risky', range: '80%+' }
    }
  }
}

export default PerformanceBenchmarks
