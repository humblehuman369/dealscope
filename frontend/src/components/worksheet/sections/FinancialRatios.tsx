'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { DisplayField } from '../EditableField'
import { Calculator, Scale, TrendingUp, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react'

export function FinancialRatios() {
  const { assumptions, summary } = useWorksheetStore()
  const derived = useWorksheetDerived()

  // Debt Yield
  const debtYield = derived.loanAmount > 0 ? (derived.noi / derived.loanAmount) * 100 : 0

  // Equity Multiple (from summary if available)
  const equityMultiple = summary?.equityMultiple || 
    (derived.totalCashNeeded > 0 
      ? (derived.totalCashNeeded + derived.annualCashFlow * 10) / derived.totalCashNeeded 
      : 0)

  const ratios = [
    {
      label: 'Rent to Value',
      value: derived.rentToValue,
      format: 'percent' as const,
      icon: DollarSign,
      help: '1% rule: Monthly rent should be ~1% of purchase price',
      threshold: { good: 1, warning: 0.7 },
    },
    {
      label: 'Gross Rent Multiplier',
      value: derived.grm,
      format: 'number' as const,
      suffix: 'x',
      icon: Calculator,
      help: 'Lower is better. Good deals are typically under 15x',
      threshold: { good: 12, warning: 20 },
      invertThreshold: true,
    },
    {
      label: 'Equity Multiple',
      value: equityMultiple,
      format: 'number' as const,
      suffix: 'x',
      icon: TrendingUp,
      help: 'Total return / initial investment over hold period',
      threshold: { good: 2, warning: 1 },
    },
    {
      label: 'Break-Even Ratio',
      value: derived.breakEvenRatio,
      format: 'percent' as const,
      icon: Scale,
      help: 'Operating expenses + debt / gross income. Lower is better',
      threshold: { good: 85, warning: 100 },
      invertThreshold: true,
    },
    {
      label: 'Debt Coverage Ratio',
      value: derived.dscr,
      format: 'number' as const,
      suffix: 'x',
      icon: ShieldCheck,
      help: 'NOI / Debt Service. Lenders typically require 1.2x+',
      threshold: { good: 1.25, warning: 1 },
    },
    {
      label: 'Debt Yield',
      value: debtYield,
      format: 'percent' as const,
      icon: AlertTriangle,
      help: 'NOI / Loan Amount. Higher is better for lenders',
      threshold: { good: 10, warning: 8 },
    },
  ]

  const getStatus = (value: number, threshold: { good: number; warning: number }, invert?: boolean) => {
    if (invert) {
      if (value <= threshold.good) return 'positive'
      if (value >= threshold.warning) return 'negative'
      return 'neutral'
    }
    if (value >= threshold.good) return 'positive'
    if (value < threshold.warning) return 'negative'
    return 'neutral'
  }

  const formatRatioValue = (value: number, format: 'percent' | 'number', suffix?: string) => {
    // Guard against invalid/extreme numbers
    if (!Number.isFinite(value) || Math.abs(value) > 1e9) {
      return format === 'percent' ? '0.00%' : `0.00${suffix || ''}`
    }
    if (format === 'percent') {
      return `${value.toFixed(2)}%`
    }
    return `${value.toFixed(2)}${suffix || ''}`
  }

  return (
    <SectionCard title="Financial Ratios (At Purchase)">
      {ratios.map((ratio, index) => {
        const Icon = ratio.icon
        const status = getStatus(ratio.value, ratio.threshold, ratio.invertThreshold)
        
        return (
          <DataRow 
            key={index} 
            label={ratio.label} 
            icon={<Icon className="w-4 h-4" />}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium ${
                status === 'positive' 
                  ? 'text-[var(--ws-positive)]' 
                  : status === 'negative' 
                    ? 'text-[var(--ws-negative)]' 
                    : 'text-[var(--ws-text-primary)]'
              }`}>
                {formatRatioValue(ratio.value, ratio.format, ratio.suffix)}
              </span>
              {status === 'positive' && (
                <span className="w-2 h-2 rounded-full bg-[var(--ws-positive)]" />
              )}
              {status === 'negative' && (
                <span className="w-2 h-2 rounded-full bg-[var(--ws-negative)]" />
              )}
            </div>
          </DataRow>
        )
      })}
    </SectionCard>
  )
}

