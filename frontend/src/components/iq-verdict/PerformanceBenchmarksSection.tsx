'use client'

/**
 * PerformanceBenchmarksSection Component - Decision-Grade UI
 * 
 * Displays national benchmark comparisons with slider-style bars.
 * Per DealMakerIQ Design System - high contrast, legibility-first.
 * 
 * Features:
 * - Center line = National Average
 * - Markers to left = Below average
 * - Markers to right = Above average
 */

import React, { useState } from 'react'
import { ChevronDown, ArrowRight, BarChart3 } from 'lucide-react'

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

// Calculate position on the benchmark bar (0-100%)
// 50% = national average (center line)
function getPosition(value: number, range: BenchmarkRange): number {
  const { low, avg, high, higherIsBetter } = range
  
  let position: number
  
  if (higherIsBetter) {
    if (value <= low) {
      position = 10
    } else if (value >= high) {
      position = 90
    } else if (value < avg) {
      const t = (value - low) / (avg - low)
      position = 10 + t * 40
    } else {
      const t = (value - avg) / (high - avg)
      position = 50 + t * 40
    }
  } else {
    // Lower is better (Expense Ratio, Breakeven Occ): inverted
    if (value <= low) {
      position = 90
    } else if (value >= high) {
      position = 10
    } else if (value < avg) {
      const t = (avg - value) / (avg - low)
      position = 50 + t * 40
    } else {
      const t = (value - avg) / (high - avg)
      position = 50 - t * 40
    }
  }
  
  return Math.max(5, Math.min(95, position))
}

// Get marker color class based on position
function getMarkerColorClass(position: number): 'teal' | 'amber' | 'negative' {
  if (position >= 55) return 'teal'
  if (position >= 40) return 'amber'
  return 'negative'
}

// Benchmark Row Component
function BenchmarkRow({ metric }: { metric: BenchmarkMetric }) {
  const position = getPosition(metric.value, metric.range)
  const colorClass = getMarkerColorClass(position)
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid var(--dg-border-light)',
      gap: '12px',
    }}>
      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--dg-text-primary)',
        width: '90px',
        flexShrink: 0,
        lineHeight: 1.2,
      }}>{metric.label}</span>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <div className="dg-benchmark-bar">
          <div 
            className={`dg-benchmark-marker ${colorClass}`}
            style={{ left: `${position}%` }}
          />
        </div>
      </div>
      
      <span style={{
        fontSize: '13px',
        fontWeight: 700,
        width: '50px',
        textAlign: 'right',
        flexShrink: 0,
        color: 'var(--dg-text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>{metric.displayValue}</span>
    </div>
  )
}

export function PerformanceBenchmarksSection({ 
  metrics,
  onNavigateToDealMaker,
  defaultExpanded = false 
}: PerformanceBenchmarksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showHelp, setShowHelp] = useState(false)

  // Group metrics by category
  const returnsMetrics = metrics.filter(m => m.category === 'returns')
  const cashflowMetrics = metrics.filter(m => m.category === 'cashflow')

  return (
    <div style={{ background: 'var(--dg-bg-primary)' }}>
      {/* Section Divider */}
      <div className="dg-section-divider" />
      
      {/* Header Section */}
      <section style={{ padding: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            {/* Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--dg-deep-navy)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BarChart3 style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            
            {/* Title Group */}
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--dg-text-primary)',
              }}>Performance Benchmarks</div>
              <div style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--dg-text-secondary)',
              }}>How this deal compares</div>
            </div>
          </div>
          
          {/* Toggle */}
          <button 
            onClick={() => setShowHelp(!showHelp)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--dg-pacific-teal)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <ChevronDown style={{ 
              width: '14px', 
              height: '14px',
              transform: showHelp ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }} />
            How to read
          </button>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div style={{
            background: 'var(--dg-bg-secondary)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--dg-text-primary)',
              marginBottom: '4px',
            }}>How This Deal Compares to National Average</div>
            <div style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--dg-text-secondary)',
              lineHeight: 1.4,
            }}>
              The center represents the national average. Markers to the left are below average, markers to the right are above average.
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          padding: '0 4px',
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--dg-text-primary)',
          }}>BELOW</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--dg-deep-navy)',
          }}>NATIONAL AVG</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--dg-text-primary)',
          }}>ABOVE</span>
        </div>
        
        {/* Scale Bar */}
        <div style={{
          position: 'relative',
          height: '8px',
          background: 'linear-gradient(to right, var(--dg-negative), var(--dg-bg-secondary) 50%, var(--dg-pacific-teal))',
          borderRadius: '4px',
          marginBottom: '16px',
        }}>
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '2px',
            height: '16px',
            background: 'var(--dg-deep-navy)',
          }} />
        </div>

        {/* Returns Group */}
        {returnsMetrics.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--dg-pacific-teal)',
              padding: '8px 0',
              borderBottom: '2px solid var(--dg-pacific-teal)',
              marginBottom: '12px',
            }}>Returns</div>
            
            {returnsMetrics.map((metric) => (
              <BenchmarkRow key={metric.key} metric={metric} />
            ))}
          </div>
        )}

        {/* Cash Flow & Risk Group */}
        {cashflowMetrics.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--dg-pacific-teal)',
              padding: '8px 0',
              borderBottom: '2px solid var(--dg-pacific-teal)',
              marginBottom: '12px',
            }}>Cash Flow & Risk</div>
            
            {cashflowMetrics.map((metric) => (
              <BenchmarkRow key={metric.key} metric={metric} />
            ))}
          </div>
        )}
      </section>
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
