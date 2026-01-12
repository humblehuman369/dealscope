'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'
import { DollarSign, TrendingUp, Percent, PiggyBank } from 'lucide-react'

export function PropertyOverview() {
  const { assumptions, viewMode, setViewMode } = useWorksheetStore()
  const derived = useWorksheetDerived()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const cards = [
    {
      label: 'Cash Needed',
      value: formatCurrency(derived.totalCashNeeded),
      icon: DollarSign,
      isPositive: false,
      isNegative: false,
    },
    {
      label: 'Cash Flow',
      value: viewMode === 'monthly' 
        ? formatCurrency(derived.monthlyCashFlow) + '/mo'
        : formatCurrency(derived.annualCashFlow) + '/yr',
      subtitle: viewMode === 'monthly' 
        ? formatCurrency(derived.annualCashFlow) + '/yr'
        : formatCurrency(derived.monthlyCashFlow) + '/mo',
      icon: PiggyBank,
      isPositive: derived.annualCashFlow > 0,
      isNegative: derived.annualCashFlow < 0,
    },
    {
      label: 'Cap Rate',
      value: formatPercent(derived.capRate),
      icon: Percent,
      isPositive: derived.capRate >= 6,
      isNegative: derived.capRate < 4,
    },
    {
      label: 'CoC Return',
      value: formatPercent(derived.cashOnCash),
      icon: TrendingUp,
      isPositive: derived.cashOnCash >= 8,
      isNegative: derived.cashOnCash < 0,
    },
  ]

  return (
    <div className="mb-6">
      {/* Toggle Monthly/Yearly */}
      <div className="flex justify-end mb-4">
        <div className="toggle-group">
          <button
            onClick={() => setViewMode('monthly')}
            className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`toggle-btn ${viewMode === 'yearly' ? 'active' : ''}`}
          >
            Yearly
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="summary-card">
              <div className="flex items-center justify-between">
                <span className="summary-card-label">{card.label}</span>
                <Icon className="w-5 h-5 text-[var(--ws-text-muted)]" />
              </div>
              <div className={`summary-card-value ${card.isPositive ? 'positive' : ''} ${card.isNegative ? 'negative' : ''}`}>
                {card.value}
              </div>
              {card.subtitle && (
                <div className="summary-card-subtitle">{card.subtitle}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

