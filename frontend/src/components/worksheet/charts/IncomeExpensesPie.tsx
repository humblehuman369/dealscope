'use client'

import { useWorksheetStore, useWorksheetDerived } from '@/stores/worksheetStore'

export function IncomeExpensesPie() {
  const { assumptions, viewMode, worksheetMetrics } = useWorksheetStore()
  const derived = useWorksheetDerived()

  const multiplier = viewMode === 'monthly' ? 1/12 : 1

  // Calculate expense breakdown
  const expenseBreakdown = [
    { label: 'Property Taxes', value: (worksheetMetrics?.property_taxes ?? assumptions.propertyTaxes) * multiplier, color: '#ef4444' },
    { label: 'Insurance', value: (worksheetMetrics?.insurance ?? assumptions.insurance) * multiplier, color: '#f97316' },
    { label: 'Management', value: derived.propertyManagement * multiplier, color: '#eab308' },
    { label: 'Maintenance', value: derived.maintenance * multiplier, color: '#22c55e' },
    { label: 'CapEx', value: derived.capex * multiplier, color: '#0EA5E9' },
    { label: 'HOA', value: (worksheetMetrics?.hoa_fees ?? assumptions.hoaFees) * multiplier, color: '#8b5cf6' },
  ].filter(e => e.value > 0)

  const totalExpenses = expenseBreakdown.reduce((sum, e) => sum + e.value, 0)
  const income = derived.effectiveGrossIncome * multiplier
  const cashFlow = derived.annualCashFlow * multiplier
  const debtService = derived.annualDebtService * multiplier

  // Calculate percentages for pie chart
  let cumulativePercent = 0
  const segments = expenseBreakdown.map((expense) => {
    const percent = (expense.value / income) * 100
    const startPercent = cumulativePercent
    cumulativePercent += percent
    return {
      ...expense,
      percent,
      startPercent,
    }
  })

  // Add debt service segment
  const debtPercent = (debtService / income) * 100
  segments.push({
    label: 'Loan Payment',
    value: debtService,
    color: '#64748b',
    percent: debtPercent,
    startPercent: cumulativePercent,
  })
  cumulativePercent += debtPercent

  // Add cash flow segment (remaining)
  const cashFlowPercent = Math.max(0, 100 - cumulativePercent)
  if (cashFlowPercent > 0) {
    segments.push({
      label: 'Cash Flow',
      value: cashFlow,
      color: '#0284c7',
      percent: cashFlowPercent,
      startPercent: cumulativePercent,
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Generate conic gradient for pie chart
  const gradientStops = segments.map((seg) => {
    return `${seg.color} ${seg.startPercent}% ${seg.startPercent + seg.percent}%`
  }).join(', ')

  return (
    <div className="section-card h-full">
      <div className="section-header">
        <span className="section-title">Income vs Expenses</span>
      </div>
      
      <div className="p-4">
        {/* Tabs */}
        <div className="flex gap-4 mb-4 text-sm">
          <button className="font-medium text-[var(--ws-text-primary)] border-b-2 border-[var(--ws-accent)] pb-1">
            Expenses
          </button>
        </div>
        
        {/* Pie Chart */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-40 h-40 rounded-full relative"
            style={{
              background: `conic-gradient(${gradientStops})`,
            }}
          >
            {/* Center hole */}
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-[var(--ws-text-muted)]">
                  {cashFlow >= 0 ? 'Cash Flow' : 'Loss'}
                </div>
                <div className={`text-sm font-bold ${cashFlow >= 0 ? 'text-[var(--ws-positive)]' : 'text-[var(--ws-negative)]'}`}>
                  {formatCurrency(Math.abs(cashFlow))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-2">
          {segments.map((seg, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-[var(--ws-text-secondary)]">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--ws-text-primary)] font-medium">
                  {formatCurrency(seg.value)}
                </span>
                <span className="text-[var(--ws-text-muted)] text-xs w-10 text-right">
                  {seg.percent.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

