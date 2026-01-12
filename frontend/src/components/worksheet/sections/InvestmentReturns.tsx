'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { SectionCard, DataRow } from '../SectionCard'
import { DisplayField } from '../EditableField'
import { TrendingUp, Percent, DollarSign, Calculator } from 'lucide-react'

export function InvestmentReturns() {
  const { assumptions, summary } = useWorksheetStore()
  const derived = useWorksheetDerived()

  // Return on Investment calculation
  const roi = derived.totalCashNeeded > 0 
    ? ((derived.annualCashFlow + (assumptions.arv - assumptions.purchasePrice)) / derived.totalCashNeeded) * 100 
    : 0

  // Return on Equity (simplified - year 1 equity)
  const equity = derived.downPayment + (assumptions.arv - assumptions.purchasePrice - assumptions.rehabCosts)
  const roe = equity > 0 ? (derived.annualCashFlow / equity) * 100 : 0

  // IRR from summary (if available)
  const irr = summary?.irr || 0

  const metrics = [
    {
      label: 'Cap Rate (Purchase Price)',
      value: derived.capRate,
      threshold: { low: 4, good: 6 },
      icon: Percent,
    },
    {
      label: 'Cap Rate (Market Value)',
      value: assumptions.arv > 0 ? (derived.noi / assumptions.arv) * 100 : 0,
      threshold: { low: 4, good: 6 },
      icon: Percent,
    },
    {
      label: 'Cash on Cash Return',
      value: derived.cashOnCash,
      threshold: { low: 0, good: 8 },
      icon: DollarSign,
    },
    {
      label: 'Return on Equity',
      value: roe,
      threshold: { low: 0, good: 10 },
      icon: TrendingUp,
    },
    {
      label: 'Return on Investment',
      value: roi,
      threshold: { low: 0, good: 15 },
      icon: Calculator,
    },
    {
      label: 'Internal Rate of Return',
      value: irr * 100,
      threshold: { low: 0, good: 12 },
      icon: TrendingUp,
    },
  ]

  const getStatus = (value: number, threshold: { low: number; good: number }) => {
    if (value >= threshold.good) return 'positive'
    if (value < threshold.low) return 'negative'
    return 'neutral'
  }

  return (
    <SectionCard title="Investment Returns (Year 1)">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        const status = getStatus(metric.value, metric.threshold)
        
        return (
          <DataRow 
            key={index} 
            label={metric.label} 
            icon={<Icon className="w-4 h-4" />}
          >
            <div className="flex items-center gap-2">
              <DisplayField 
                value={metric.value} 
                format="number"
                suffix="%"
                isPositive={status === 'positive'}
                isNegative={status === 'negative'}
              />
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

