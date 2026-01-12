'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'

export function CashFlowChart() {
  const { projections } = useWorksheetStore()

  if (projections.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Cash Flow Over Time</h3>
        <div className="h-64 flex items-center justify-center text-[var(--ws-text-muted)]">
          No projection data available
        </div>
      </div>
    )
  }

  const years = projections.slice(0, 10)
  const maxValue = Math.max(...years.map(y => Math.max(y.effectiveRent, Math.abs(y.cashFlow))))
  const minValue = Math.min(...years.map(y => Math.min(0, y.cashFlow)))
  const range = maxValue - minValue

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const getBarHeight = (value: number) => {
    if (range === 0) return 0
    return ((value - minValue) / range) * 100
  }

  const getYPosition = (value: number) => {
    if (range === 0) return 50
    return 100 - ((value - minValue) / range) * 100
  }

  const zeroLine = getYPosition(0)

  return (
    <div className="chart-container">
      <h3 className="chart-title">Cash Flow Over Time</h3>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#0284c7]" />
          <span className="text-[var(--ws-text-secondary)]">Operating Income</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
          <span className="text-[var(--ws-text-secondary)]">Operating Expenses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <span className="text-[var(--ws-text-secondary)]">Cash Flow</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-[var(--ws-text-muted)]">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency((maxValue + minValue) / 2)}</span>
          <span>{formatCurrency(minValue)}</span>
        </div>

        {/* Chart area */}
        <div className="ml-16 h-full relative">
          {/* Zero line */}
          {minValue < 0 && (
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-[var(--ws-border)]"
              style={{ top: `${zeroLine}%` }}
            />
          )}

          {/* Bars */}
          <div className="flex items-end h-full gap-1">
            {years.map((year, index) => (
              <div key={index} className="flex-1 flex flex-col items-center relative h-full">
                {/* Income bar */}
                <div 
                  className="absolute w-[30%] left-[10%] bg-[#0284c7] rounded-t-sm transition-all duration-300"
                  style={{
                    bottom: `${zeroLine}%`,
                    height: `${getBarHeight(year.effectiveRent) - zeroLine}%`,
                  }}
                />
                
                {/* Expenses bar */}
                <div 
                  className="absolute w-[30%] left-[35%] bg-[#ef4444] rounded-t-sm transition-all duration-300"
                  style={{
                    bottom: `${zeroLine}%`,
                    height: `${getBarHeight(year.operatingExpenses + year.debtService) - zeroLine}%`,
                  }}
                />
                
                {/* Cash flow bar */}
                <div 
                  className={`absolute w-[30%] right-[10%] rounded-sm transition-all duration-300 ${
                    year.cashFlow >= 0 ? 'bg-[#22c55e]' : 'bg-[#f97316]'
                  }`}
                  style={{
                    bottom: year.cashFlow >= 0 ? `${zeroLine}%` : undefined,
                    top: year.cashFlow < 0 ? `${zeroLine}%` : undefined,
                    height: `${Math.abs(getBarHeight(year.cashFlow) - zeroLine)}%`,
                  }}
                />
                
                {/* Year label */}
                <span className="absolute -bottom-6 text-xs text-[var(--ws-text-muted)]">
                  Y{index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X-axis label */}
      <div className="text-center text-xs text-[var(--ws-text-muted)] mt-8">
        Holding Period (Years)
      </div>
    </div>
  )
}

