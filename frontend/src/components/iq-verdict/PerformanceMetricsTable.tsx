'use client'

/**
 * PerformanceMetricsTable Component
 * 
 * Clean table format for performance metrics:
 * Metric | Value | Benchmark | Assessment (colored pill)
 */

import React from 'react'

type Assessment = 'GOOD' | 'STANDARD' | 'FAIR' | 'POOR'

interface PerformanceMetric {
  name: string
  value: string
  benchmark: string
  assessment: Assessment
}

interface PerformanceMetricsTableProps {
  metrics: PerformanceMetric[]
}

// Get assessment colors
function getAssessmentStyle(assessment: Assessment): { bg: string; text: string; border: string } {
  switch (assessment) {
    case 'GOOD':
      return { bg: 'bg-[#10B981]', text: 'text-white', border: 'border-[#10B981]' }
    case 'STANDARD':
      return { bg: 'bg-[#0891B2]', text: 'text-white', border: 'border-[#0891B2]' }
    case 'FAIR':
      return { bg: 'bg-transparent', text: 'text-[#D97706]', border: 'border-[#D97706]' }
    case 'POOR':
      return { bg: 'bg-transparent', text: 'text-[#E11D48]', border: 'border-[#E11D48]' }
    default:
      return { bg: 'bg-[#64748B]', text: 'text-white', border: 'border-[#64748B]' }
  }
}

export function PerformanceMetricsTable({ metrics }: PerformanceMetricsTableProps) {
  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F1F5F9]">
        <h3 className="text-base font-semibold text-[#0A1628]">Performance Metrics</h3>
      </div>

      {/* Table Header Row */}
      <div className="grid grid-cols-4 px-5 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">
          Metric
        </span>
        <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide text-center">
          Value
        </span>
        <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide text-center">
          Benchmark
        </span>
        <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide text-right">
          Assessment
        </span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[#F1F5F9]">
        {metrics.map((metric, index) => {
          const style = getAssessmentStyle(metric.assessment)
          return (
            <div 
              key={index}
              className="grid grid-cols-4 px-5 py-3 items-center hover:bg-[#F8FAFC] transition-colors"
            >
              {/* Metric Name */}
              <span className="text-sm text-[#475569]">
                {metric.name}
              </span>
              
              {/* Value */}
              <span className="text-sm font-bold text-[#0A1628] text-center tabular-nums">
                {metric.value}
              </span>
              
              {/* Benchmark */}
              <span className="text-xs text-[#94A3B8] text-center">
                {metric.benchmark}
              </span>
              
              {/* Assessment Pill */}
              <div className="flex justify-end">
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${style.bg} ${style.text} ${style.border}`}>
                  {metric.assessment}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Default metrics generator helper
export function generateDefaultMetrics(data: {
  monthlyCashFlow: number
  cashRequired: number
  capRate: number
  cashOnCash: number
  dscr: number
  grm: number
}): PerformanceMetric[] {
  function getAssessment(value: number, thresholds: { good: number; fair: number }, higherIsBetter: boolean = true): Assessment {
    if (higherIsBetter) {
      if (value >= thresholds.good) return 'GOOD'
      if (value >= thresholds.fair) return 'FAIR'
      return 'POOR'
    } else {
      if (value <= thresholds.good) return 'GOOD'
      if (value <= thresholds.fair) return 'FAIR'
      return 'POOR'
    }
  }

  return [
    {
      name: 'Monthly Cash Flow',
      value: `$${Math.round(data.monthlyCashFlow).toLocaleString()}`,
      benchmark: '> $200/month',
      assessment: getAssessment(data.monthlyCashFlow, { good: 200, fair: 0 }),
    },
    {
      name: 'Cash Required',
      value: `$${Math.round(data.cashRequired).toLocaleString()}`,
      benchmark: '25% down + closing',
      assessment: 'STANDARD',
    },
    {
      name: 'Cap Rate',
      value: `${data.capRate.toFixed(2)}%`,
      benchmark: '> 5.0%',
      assessment: getAssessment(data.capRate, { good: 5, fair: 4 }),
    },
    {
      name: 'Cash-on-Cash Return',
      value: `${data.cashOnCash.toFixed(2)}%`,
      benchmark: '> 8.0%',
      assessment: getAssessment(data.cashOnCash, { good: 8, fair: 5 }),
    },
    {
      name: 'DSCR',
      value: data.dscr.toFixed(2),
      benchmark: '> 1.20',
      assessment: getAssessment(data.dscr, { good: 1.25, fair: 1.0 }),
    },
    {
      name: 'Gross Rent Multiplier',
      value: data.grm.toFixed(1),
      benchmark: '< 12',
      assessment: getAssessment(data.grm, { good: 10, fair: 12 }, false),
    },
  ]
}

export default PerformanceMetricsTable
